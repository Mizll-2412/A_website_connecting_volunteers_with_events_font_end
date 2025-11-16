import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { EvaluationService, EvaluationResponseDto } from '../../services/evaluation.service';
import { environment } from '../../../environments/environment';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

interface EventStats {
  totalEvents: number;
  completedEvents: number;
  ongoingEvents: number;
  cancelledEvents: number;
  pendingEvents: number;
  eventsByField: Record<string, number>;
  eventsByMonth: Record<string, number>;
  averageVolunteersPerEvent: number;
  averageRating: number;
  eventsByMonthDetailed: Record<string, EventMonthlyBreakdown>;
}

interface EventMonthlyBreakdown {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
}

interface OrganizationStats {
  totalOrganizations: number;
  verifiedOrganizations: number;
  pendingVerificationOrganizations: number;
  organizationsByField: Record<string, number>;
  averageRating?: number;
  averageEventsPerOrganization?: number;
}

interface VolunteerStats {
  totalVolunteers: number;
  activeVolunteers?: number;
  volunteersByRank: Record<string, number>;
  volunteersByGender: Record<string, number>;
  volunteersByField: Record<string, number>;
  volunteersByAge: Record<string, number>;
  averageRating?: number;
  averageEventsPerVolunteer?: number;
}

interface OverallStats {
  totalUsers: number;
  totalEvents: number;
  totalVolunteers: number;
  totalOrganizations: number;
  totalRegistrations: number;
  registrationsByStatus: Record<string, number>;
}

interface RatingStats {
  averageVolunteerRating: number;
  averageOrganizationRating: number;
  volunteerRatingsDistribution: Record<number, number>;
  organizationRatingsDistribution: Record<number, number>;
}

interface RankInfo {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface AdminEvaluationPreview {
  id: number;
  scorerName: string;
  scorerRole: string;
  targetName: string;
  targetRole: string;
  eventName: string;
  score: number;
  content: string;
  createdAt: Date;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDatePickerModule],
  templateUrl: './statistics.html',
  styleUrls: ['./statistics.css']
})
export class Statistics implements OnInit {
  isLoading = true;
  role: string = '';
  eventStats: EventStats | null = null;
  organizationStats: OrganizationStats | null = null;
  volunteerStats: VolunteerStats | null = null;
  overallStats: OverallStats | null = null;
  ratingStats: RatingStats | null = null;
  latestEvaluations: AdminEvaluationPreview[] = [];
  totalEvaluations = 0;
  evaluationsError: string | null = null;
  isLoadingEvaluations = false;
  
  // Time filter properties
  timeFilterType: 'year' | 'quarter' | 'month' | 'custom' = 'year';
  selectedYear: number = new Date().getFullYear();
  selectedQuarter: number = 1;
  selectedMonth: number = new Date().getMonth() + 1;
  dateRange: [Date | null, Date | null] | null = null;
  availableYears: number[] = [];
  
  private apiUrl = `${environment.apiUrl}/statistics`;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private evaluationService: EvaluationService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.role = (this.authService.getRole() || '').toLowerCase();
    this.initializeTimeFilter();
    this.loadStatistics();
  }

  private initializeTimeFilter(): void {
    const currentYear = new Date().getFullYear();
    // Tạo danh sách năm từ năm hiện tại trở về 5 năm trước
    for (let i = 0; i < 6; i++) {
      this.availableYears.push(currentYear - i);
    }
    this.selectedYear = currentYear;
    this.selectedMonth = new Date().getMonth() + 1;
    // Tính quý hiện tại
    this.selectedQuarter = Math.floor((this.selectedMonth - 1) / 3) + 1;
  }
  
  loadStatistics(): void {
    const params = this.buildTimeFilterParams();
    
    // Lấy thống kê sự kiện (hiển thị cho mọi vai trò)
    this.http.get<any>(`${this.apiUrl}/events`, { params }).subscribe({
      next: (response) => {
        this.eventStats = this.mapEventStats(response);
        if (this.role !== 'admin') {
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Lỗi tải thống kê sự kiện:', err);
        if (this.role !== 'admin') {
          this.isLoading = false;
        }
      }
    });
    
    // Chỉ Admin mới lấy các thống kê tổng quan/toàn hệ thống
    if (this.role === 'admin') {
      this.http.get<any>(`${this.apiUrl}/organizations`, { params }).subscribe({
        next: (response) => { this.organizationStats = this.mapOrganizationStats(response); },
        error: (err) => { console.error('Lỗi tải thống kê tổ chức:', err); }
      });
      this.http.get<any>(`${this.apiUrl}/volunteers`, { params }).subscribe({
        next: (response) => { this.volunteerStats = this.mapVolunteerStats(response); },
        error: (err) => { console.error('Lỗi tải thống kê tình nguyện viên:', err); }
      });
      this.http.get<any>(`${this.apiUrl}/overall`, { params }).subscribe({
        next: (response) => { 
          this.overallStats = this.mapOverallStats(response); 
        },
        error: (err) => { console.error('Lỗi tải thống kê tổng quan:', err); }
      });
      this.http.get<any>(`${this.apiUrl}/ratings`, { params }).subscribe({
        next: (response) => { 
          this.ratingStats = this.mapRatingStats(response); 
          this.isLoading = false; 
        },
        error: (err) => { console.error('Lỗi tải thống kê đánh giá:', err); this.isLoading = false; }
      });

      this.loadLatestEvaluations();
    }
  }

  private buildTimeFilterParams(): HttpParams {
    let params = new HttpParams();
    const filterParams: any = {};

    switch (this.timeFilterType) {
      case 'year':
        filterParams.Year = this.selectedYear;
        break;
      case 'quarter':
        // Tính FromDate và ToDate từ quý
        const quarterStartMonth = (this.selectedQuarter - 1) * 3 + 1;
        const quarterEndMonth = this.selectedQuarter * 3;
        filterParams.FromDate = this.formatDateForApi(new Date(this.selectedYear, quarterStartMonth - 1, 1));
        // Lấy ngày cuối cùng của tháng cuối quý
        const lastDayOfQuarter = new Date(this.selectedYear, quarterEndMonth, 0).getDate();
        filterParams.ToDate = this.formatDateForApi(new Date(this.selectedYear, quarterEndMonth - 1, lastDayOfQuarter));
        break;
      case 'month':
        filterParams.Year = this.selectedYear;
        filterParams.Month = this.selectedMonth;
        break;
      case 'custom':
        if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
          filterParams.FromDate = this.formatDateForApi(this.dateRange[0]);
          filterParams.ToDate = this.formatDateForApi(this.dateRange[1]);
        }
        break;
    }

    Object.keys(filterParams).forEach(key => {
      if (filterParams[key] !== null && filterParams[key] !== undefined) {
        params = params.set(key, filterParams[key].toString());
      }
    });

    console.log('Filter params:', filterParams);
    return params;
  }

  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onTimeFilterTypeChange(): void {
    // Reset các giá trị khi đổi loại filter
    if (this.timeFilterType === 'custom') {
      this.dateRange = null;
      // Không gọi API ngay khi chuyển sang custom nếu chưa chọn ngày
      return;
    }
    // Chỉ gọi API nếu có đủ thông tin
    if (this.timeFilterType === 'year' && this.selectedYear) {
      this.applyTimeFilter();
    } else if (this.timeFilterType === 'quarter' && this.selectedYear && this.selectedQuarter) {
      this.applyTimeFilter();
    } else if (this.timeFilterType === 'month' && this.selectedYear && this.selectedMonth) {
      this.applyTimeFilter();
    }
  }

  onDateRangeChange(dates: [Date | null, Date | null] | null): void {
    // Chỉ gọi API khi đã chọn đủ cả 2 ngày
    if (dates && dates[0] && dates[1]) {
      this.applyTimeFilter();
    }
  }

  applyTimeFilter(): void {
    // Kiểm tra validation trước khi gọi API
    if (this.timeFilterType === 'custom' && (!this.dateRange || !this.dateRange[0] || !this.dateRange[1])) {
      console.warn('Chưa chọn đủ khoảng ngày');
      return;
    }
    if (this.timeFilterType === 'year' && !this.selectedYear) {
      console.warn('Chưa chọn năm');
      return;
    }
    if (this.timeFilterType === 'quarter' && (!this.selectedYear || !this.selectedQuarter)) {
      console.warn('Chưa chọn đủ năm và quý');
      return;
    }
    if (this.timeFilterType === 'month' && (!this.selectedYear || !this.selectedMonth)) {
      console.warn('Chưa chọn đủ năm và tháng');
      return;
    }

    this.isLoading = true;
    this.loadStatistics();
  }

  clearTimeFilter(): void {
    this.timeFilterType = 'year';
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedQuarter = Math.floor((this.selectedMonth - 1) / 3) + 1;
    this.dateRange = null;
    this.applyTimeFilter();
  }

  navigateToEvaluations(): void {
    this.router.navigate(['/admin/evaluations']);
  }
  
  getMonthsArray(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  
  getEventMonthPercentage(month: number): number {
    if (!this.eventStats || !this.eventStats.eventsByMonth) return 0;
    
    const currentYear = new Date().getFullYear();
    const key = month.toString();
    
    const count = this.eventStats.eventsByMonth[key] || 0;
    const maxCount = Math.max(...Object.values(this.eventStats.eventsByMonth), 1);
    
    return (count / maxCount) * 100;
  }
  
  getOrganizationVerifiedPercentage(): number {
    if (!this.organizationStats || this.organizationStats.totalOrganizations === 0) return 0;
    return (this.organizationStats.verifiedOrganizations / this.organizationStats.totalOrganizations) * 100;
  }
  
  getOrganizationPendingPercentage(): number {
    if (!this.organizationStats || this.organizationStats.totalOrganizations === 0) return 0;
    return (this.organizationStats.pendingVerificationOrganizations / this.organizationStats.totalOrganizations) * 100;
  }
  
  getOrganizationUnverifiedPercentage(): number {
    if (!this.organizationStats || this.organizationStats.totalOrganizations === 0) return 0;
    const unverified = this.organizationStats.totalOrganizations - 
                       this.organizationStats.verifiedOrganizations - 
                       this.organizationStats.pendingVerificationOrganizations;
    return (unverified / this.organizationStats.totalOrganizations) * 100;
  }
  
  getUnverifiedOrganizations(): number {
    if (!this.organizationStats) return 0;
    return this.organizationStats.totalOrganizations - 
           this.organizationStats.verifiedOrganizations - 
           this.organizationStats.pendingVerificationOrganizations;
  }
  
  getVolunteerRanks(): RankInfo[] {
    if (!this.volunteerStats || !this.volunteerStats.volunteersByRank) return [];
    
    const ranks: RankInfo[] = [];
    const total = this.volunteerStats.totalVolunteers || 1;
    
    // Màu sắc cho các cấp bậc
    const colors: Record<string, string> = {
      'Tình nguyện viên Đồng': '#cd7f32',
      'Tình nguyện viên Bạc': '#c0c0c0',
      'Tình nguyện viên Vàng': '#ffd700',
      'Tình nguyện viên Bạch Kim': '#e5e4e2',
      'Tình nguyện viên Kim Cương': '#b9f2ff'
    };
    
    for (const [name, count] of Object.entries(this.volunteerStats.volunteersByRank)) {
      ranks.push({
        name,
        count,
        percentage: (count / total) * 100,
        color: colors[name] || '#6c757d'
      });
    }
    
    return ranks;
  }
  
  getGenderPercentage(gender: string): number {
    if (!this.volunteerStats || !this.volunteerStats.volunteersByGender) return 0;
    
    const count = this.volunteerStats.volunteersByGender[gender] || 0;
    const total = this.volunteerStats.totalVolunteers || 1;
    
    return (count / total) * 100;
  }
  
  getGenderCount(gender: string): number {
    if (!this.volunteerStats || !this.volunteerStats.volunteersByGender) return 0;
    return this.volunteerStats.volunteersByGender[gender] || 0;
  }
  
  getVolunteerRatingCount(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.volunteerRatingsDistribution) return 0;
    return this.ratingStats.volunteerRatingsDistribution[rating] || 0;
  }
  
  getVolunteerRatingPercentage(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.volunteerRatingsDistribution) return 0;
    
    const count = this.ratingStats.volunteerRatingsDistribution[rating] || 0;
    const total = Object.values(this.ratingStats.volunteerRatingsDistribution).reduce((a, b) => a + b, 0) || 1;
    
    return (count / total) * 100;
  }
  
  getOrganizationRatingCount(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.organizationRatingsDistribution) return 0;
    return this.ratingStats.organizationRatingsDistribution[rating] || 0;
  }
  
  getOrganizationRatingPercentage(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.organizationRatingsDistribution) return 0;
    
    const count = this.ratingStats.organizationRatingsDistribution[rating] || 0;
    const total = Object.values(this.ratingStats.organizationRatingsDistribution).reduce((a, b) => a + b, 0) || 1;
    
    return (count / total) * 100;
  }
  
  getRegistrationStatusCount(status: string): number {
    if (!this.overallStats || !this.overallStats.registrationsByStatus) return 0;
    return this.overallStats.registrationsByStatus[status] || 0;
  }
  
  getRegistrationStatusPercentage(status: string): number {
    if (!this.overallStats || !this.overallStats.registrationsByStatus) return 0;
    
    const count = this.overallStats.registrationsByStatus[status] || 0;
    const total = this.overallStats.totalRegistrations || 1;
    
    return (count / total) * 100;
  }

  private loadLatestEvaluations(): void {
    this.isLoadingEvaluations = true;
    this.evaluationsError = null;

    // Xây dựng filter từ time filter hiện tại
    const filter: any = {};
    if (this.timeFilterType === 'year' && this.selectedYear) {
      filter.Year = this.selectedYear;
    } else if (this.timeFilterType === 'month' && this.selectedYear && this.selectedMonth) {
      filter.Year = this.selectedYear;
      filter.Month = this.selectedMonth;
    } else if (this.timeFilterType === 'quarter' && this.selectedYear && this.selectedQuarter) {
      // Tính FromDate và ToDate từ quý
      const quarterStartMonth = (this.selectedQuarter - 1) * 3 + 1;
      const quarterEndMonth = this.selectedQuarter * 3;
      const lastDayOfQuarter = new Date(this.selectedYear, quarterEndMonth, 0).getDate();
      filter.FromDate = this.formatDateForApi(new Date(this.selectedYear, quarterStartMonth - 1, 1));
      filter.ToDate = this.formatDateForApi(new Date(this.selectedYear, quarterEndMonth - 1, lastDayOfQuarter));
    } else if (this.timeFilterType === 'custom' && this.dateRange && this.dateRange[0] && this.dateRange[1]) {
      filter.FromDate = this.formatDateForApi(this.dateRange[0]);
      filter.ToDate = this.formatDateForApi(this.dateRange[1]);
    }

    this.evaluationService.getAllEvaluations(filter).subscribe({
      next: (response) => {
        const evaluations = this.normalizeEvaluations(response);
        this.totalEvaluations = evaluations.length;
        this.latestEvaluations = evaluations.slice(0, 5);
        this.isLoadingEvaluations = false;
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá gần đây:', err);
        this.evaluationsError = err?.error?.message || 'Không thể tải danh sách đánh giá gần đây.';
        this.isLoadingEvaluations = false;
      }
    });
  }

  private normalizeEvaluations(response: any): AdminEvaluationPreview[] {
    const data = (response?.data ?? response ?? []) as (EvaluationResponseDto & {
      vaiTroNguoiDanhGia?: string;
      vaiTroNguoiDuocDanhGia?: string;
    })[];

    return data
      .map((item) => ({
        id: item.maDanhGia,
        scorerName: item.tenNguoiDanhGia || 'Không rõ',
        scorerRole: item.vaiTroNguoiDanhGia || '',
        targetName: item.tenNguoiDuocDanhGia || 'Không rõ',
        targetRole: item.vaiTroNguoiDuocDanhGia || '',
        eventName: item.tenSuKien || 'Không rõ sự kiện',
        score: item.diemSo,
        content: (item.noiDung || '').trim(),
        createdAt: new Date(item.ngayTao)
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  trackByEvaluationId(_: number, evaluation: AdminEvaluationPreview): number {
    return evaluation.id;
  }

  getEventCountForMonth(month: number): number {
    if (!this.eventStats || !this.eventStats.eventsByMonth) return 0;
    return this.eventStats.eventsByMonth[month.toString()] || 0;
  }

  getEventMonthStats(): { month: number; data: EventMonthlyBreakdown }[] {
    if (!this.eventStats || !this.eventStats.eventsByMonthDetailed) return [];

    const result: { month: number; data: EventMonthlyBreakdown }[] = [];

    for (let month = 1; month <= 12; month++) {
      const key = month.toString();
      const data = this.eventStats.eventsByMonthDetailed[key];
      if (data && data.total > 0) {
        result.push({ month, data });
      }
    }

    return result;
  }

  getMonthLabel(month: number): string {
    return `T${month}`;
  }

  getRecordEntries(record: Record<string, number> | null | undefined): { key: string; value: number }[] {
    if (!record) {
      return [];
    }

    return Object.entries(record).map(([key, value]) => ({ key, value }));
  }

  getEntriesWithPercentage(record: Record<string, number> | null | undefined, total: number): { key: string; value: number; percentage: number }[] {
    if (!record || !total) {
      return [];
    }

    return Object.entries(record).map(([key, value]) => ({
      key,
      value,
      percentage: this.calculatePercentage(value, total)
    }));
  }

  calculatePercentage(value: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 1000) / 10; // 1 chữ số thập phân
  }

  formatAverage(value: number | undefined | null, digits = 2): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0';
    }

    return Number(value).toFixed(digits);
  }

  getGenderPieStyle(): Record<string, string> {
    if (!this.volunteerStats) {
      return { background: '#f1f3f5' };
    }

    return this.buildPieStyle(
      this.volunteerStats.volunteersByGender,
      ['Nam', 'Nữ', 'Khác'],
      ['#0d6efd', '#d63384', '#6c757d'],
      this.volunteerStats.totalVolunteers
    );
  }

  getOrganizationPieStyle(): Record<string, string> {
    if (!this.organizationStats) {
      return { background: '#f1f3f5' };
    }

    return this.buildPieStyle(
      {
        'Đã xác minh': this.organizationStats.verifiedOrganizations,
        'Đang chờ': this.organizationStats.pendingVerificationOrganizations,
        'Chưa xác minh': this.getUnverifiedOrganizations()
      },
      ['Đã xác minh', 'Đang chờ', 'Chưa xác minh'],
      ['#28a745', '#ffc107', '#6c757d'],
      this.organizationStats.totalOrganizations
    );
  }

  getRegistrationPieStyle(): Record<string, string> {
    if (!this.overallStats) {
      return { background: '#f1f3f5' };
    }

    return this.buildPieStyle(
      this.overallStats.registrationsByStatus,
      ['approved', 'pending', 'rejected'],
      ['#28a745', '#ffc107', '#dc3545'],
      this.overallStats.totalRegistrations
    );
  }

  private mapEventStats(response: any): EventStats {
    const data = this.extractData(response);
    const eventsByMonth = this.normalizeMonthMap(data.eventsByMonth || data.EventsByMonth);
    const eventsByField = this.normalizeRecord(data.eventsByField || data.EventsByField);
    const eventsByMonthDetailed = this.normalizeMonthlyBreakdown(data.eventsByMonthDetailed || data.EventsByMonthDetailed);

    return {
      totalEvents: this.normalizeNumber(data.totalEvents ?? data.TotalEvents),
      completedEvents: this.normalizeNumber(data.completedEvents ?? data.CompletedEvents),
      ongoingEvents: this.normalizeNumber(data.ongoingEvents ?? data.activeEvents ?? data.ActiveEvents),
      cancelledEvents: this.normalizeNumber(data.cancelledEvents ?? data.CancelledEvents),
      pendingEvents: this.normalizeNumber(data.pendingEvents ?? data.PendingEvents),
      eventsByField,
      eventsByMonth,
      averageVolunteersPerEvent: this.normalizeNumber(data.averageVolunteersPerEvent ?? data.AverageVolunteersPerEvent),
      averageRating: this.normalizeNumber(data.averageRating ?? data.AverageRating),
      eventsByMonthDetailed
    };
  }

  private mapOrganizationStats(response: any): OrganizationStats {
    const data = this.extractData(response);

    return {
      totalOrganizations: this.normalizeNumber(data.totalOrganizations ?? data.TotalOrganizations),
      verifiedOrganizations: this.normalizeNumber(data.verifiedOrganizations ?? data.VerifiedOrganizations),
      pendingVerificationOrganizations: this.normalizeNumber(data.pendingVerificationOrganizations ?? data.PendingVerificationOrganizations),
      organizationsByField: this.normalizeRecord(data.organizationsByField ?? data.OrganizationsByField),
      averageRating: this.normalizeNumber(data.averageRating ?? data.AverageRating),
      averageEventsPerOrganization: this.normalizeNumber(data.averageEventsPerOrganization ?? data.AverageEventsPerOrganization)
    };
  }

  private mapVolunteerStats(response: any): VolunteerStats {
    const data = this.extractData(response);

    return {
      totalVolunteers: this.normalizeNumber(data.totalVolunteers ?? data.TotalVolunteers),
      activeVolunteers: this.normalizeNumber(data.activeVolunteers ?? data.ActiveVolunteers),
      volunteersByRank: this.normalizeRecord(data.volunteersByRank ?? data.VolunteersByRank),
      volunteersByGender: this.normalizeRecord(data.volunteersByGender ?? data.VolunteersByGender),
      volunteersByField: this.normalizeRecord(data.volunteersByField ?? data.VolunteersByField),
      volunteersByAge: this.normalizeRecord(data.volunteersByAge ?? data.VolunteersByAge),
      averageRating: this.normalizeNumber(data.averageRating ?? data.AverageRating),
      averageEventsPerVolunteer: this.normalizeNumber(data.averageEventsPerVolunteer ?? data.AverageEventsPerVolunteer)
    };
  }

  private mapOverallStats(response: any): OverallStats {
    const data = this.extractData(response);
    const registrations = this.normalizeRecord(data.registrationsByStatus ?? data.RegistrationsByStatus);

    return {
      totalUsers: this.normalizeNumber(data.totalUsers ?? data.TotalUsers),
      totalEvents: this.normalizeNumber(data.totalEvents ?? data.TotalEvents),
      totalVolunteers: this.normalizeNumber(data.totalVolunteers ?? data.TotalVolunteers),
      totalOrganizations: this.normalizeNumber(data.totalOrganizations ?? data.TotalOrganizations),
      totalRegistrations: this.normalizeNumber(data.totalRegistrations ?? data.TotalRegistrations),
      registrationsByStatus: registrations
    };
  }

  private mapRatingStats(response: any): RatingStats {
    const data = this.extractData(response);

    return {
      averageVolunteerRating: this.normalizeNumber(data.averageVolunteerRating ?? data.AverageVolunteerRating),
      averageOrganizationRating: this.normalizeNumber(data.averageOrganizationRating ?? data.AverageOrganizationRating),
      volunteerRatingsDistribution: this.normalizeNumberRecordWithNumericKeys(data.volunteerRatingsDistribution ?? data.VolunteerRatingsDistribution),
      organizationRatingsDistribution: this.normalizeNumberRecordWithNumericKeys(data.organizationRatingsDistribution ?? data.OrganizationRatingsDistribution)
    };
  }

  private extractData(response: any): any {
    return response?.data ?? response ?? {};
  }

  private normalizeNumber(value: any, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  private normalizeRecord(record: any): Record<string, number> {
    const result: Record<string, number> = {};
    if (!record || typeof record !== 'object') {
      return result;
    }

    Object.entries(record).forEach(([key, value]) => {
      result[key] = this.normalizeNumber(value);
    });

    return result;
  }

  private normalizeNumberRecordWithNumericKeys(record: any): Record<number, number> {
    const result: Record<number, number> = {};
    if (!record || typeof record !== 'object') {
      return result;
    }

    Object.entries(record).forEach(([key, value]) => {
      const numericKey = Number(key);
      if (Number.isFinite(numericKey)) {
        result[numericKey] = this.normalizeNumber(value);
      }
    });

    return result;
  }

  private normalizeMonthMap(record: any): Record<string, number> {
    const result: Record<string, number> = {};

    for (let month = 1; month <= 12; month++) {
      result[month.toString()] = 0;
    }

    if (!record || typeof record !== 'object') {
      return result;
    }

    Object.entries(record).forEach(([key, value]) => {
      const month = this.extractMonthFromKey(key);
      if (month) {
        const monthKey = month.toString();
        result[monthKey] = (result[monthKey] || 0) + this.normalizeNumber(value);
      }
    });

    return result;
  }

  private normalizeMonthlyBreakdown(record: any): Record<string, EventMonthlyBreakdown> {
    const result: Record<string, EventMonthlyBreakdown> = {};

    for (let month = 1; month <= 12; month++) {
      result[month.toString()] = this.createEmptyMonthlyBreakdown();
    }

    if (!record || typeof record !== 'object') {
      return result;
    }

    Object.entries(record).forEach(([key, value]) => {
      const month = this.extractMonthFromKey(key);
      if (!month) {
        return;
      }

      const monthKey = month.toString();
      const data: any = value ?? {};
      result[monthKey] = {
        total: this.normalizeNumber(data.total ?? data.Total),
        pending: this.normalizeNumber(data.pending ?? data.Pending),
        active: this.normalizeNumber(data.active ?? data.Active),
        completed: this.normalizeNumber(data.completed ?? data.Completed),
        cancelled: this.normalizeNumber(data.cancelled ?? data.Cancelled)
      };
    });

    return result;
  }

  private createEmptyMonthlyBreakdown(): EventMonthlyBreakdown {
    return {
      total: 0,
      pending: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    };
  }

  private buildPieStyle(
    record: Record<string, number> | null | undefined,
    keyOrder: string[],
    colors: string[],
    total?: number
  ): Record<string, string> {
    if (!record || keyOrder.length === 0) {
      return { background: '#f1f3f5' };
    }

    const segments = keyOrder.map((key, index) => ({
      key,
      value: record[key] || 0,
      color: colors[index] || '#6c757d'
    }));

    const sum = total && total > 0
      ? total
      : segments.reduce((acc, segment) => acc + segment.value, 0);

    if (sum <= 0) {
      return { background: '#f1f3f5' };
    }

    let cumulative = 0;
    const gradientSegments: string[] = [];

    segments.forEach(segment => {
      const start = (cumulative / sum) * 100;
      cumulative += segment.value;
      const end = (cumulative / sum) * 100;

      if (end > start) {
        gradientSegments.push(`${segment.color} ${start}% ${end}%`);
      }
    });

    if (gradientSegments.length === 0) {
      return { background: '#f1f3f5' };
    }

    return {
      background: `conic-gradient(${gradientSegments.join(', ')})`
    };
  }

  private extractMonthFromKey(key: string): number | null {
    if (!key) {
      return null;
    }

    // Nếu key chỉ là số tháng
    const direct = Number(key);
    if (Number.isFinite(direct) && direct >= 1 && direct <= 12) {
      return direct;
    }

    // Thử tách dạng yyyy-mm hoặc các định dạng tương tự
    const parts = key.split(/[-/]/);
    const monthPart = parts.pop();
    if (monthPart) {
      const parsed = Number(monthPart);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
        return parsed;
      }
    }

    return null;
  }
}
