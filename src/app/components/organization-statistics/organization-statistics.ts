import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToChucService } from '../../services/organization';
import { EvaluationService, EvaluationResponseDto } from '../../services/evaluation.service';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

interface OrganizationSpecificStats {
  organizationId: number;
  organizationName: string;
  // Sự kiện
  totalEvents: number;
  pendingEvents: number;
  activeEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  eventsByMonth: Record<string, number>;
  eventsByField: Record<string, number>;
  averageVolunteersPerEvent: number;
  averageEventRating: number;
  // Đăng ký
  totalRegistrations: number;
  pendingRegistrations: number;
  approvedRegistrations: number;
  rejectedRegistrations: number;
  registrationsByMonth: Record<string, number>;
  approvalRate: number;
  // Tình nguyện viên
  totalVolunteers: number;
  newVolunteersThisMonth: number;
  volunteersByRank: Record<string, number>;
  volunteersByGender: Record<string, number>;
  averageVolunteerRating: number;
  // Đánh giá
  averageRating: number;
  ratingsDistribution: Record<number, number>;
  totalRatings: number;
}

interface RankInfo {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface EvaluationSummary {
  id: number;
  scorerName: string;
  eventName: string;
  score: number;
  content: string;
  createdAt: Date;
}

@Component({
  selector: 'app-organization-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDatePickerModule],
  templateUrl: './organization-statistics.html',
  styleUrls: ['./organization-statistics.css']
})
export class OrganizationStatistics implements OnInit {
  isLoading = true;
  stats: OrganizationSpecificStats | null = null;
  organizationId: number | null = null;
  organizationAccountId: number | null = null;
  isLoadingEvaluations = false;
  evaluationError: string | null = null;
  latestEvaluations: EvaluationSummary[] = [];
  totalEvaluations = 0;
  
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
    private toChucService: ToChucService,
    private evaluationService: EvaluationService,
    private router: Router,
    private auth: AuthService
  ) {}
  
  ngOnInit(): void {
    this.initializeTimeFilter();
    this.getOrganizationId();
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

  private getOrganizationId(): void {
    // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
    const userData = this.auth.getUser();
    if (!userData) {
      this.isLoading = false;
      console.error('Người dùng chưa đăng nhập');
      return;
    }

    try {
      const accountId = userData.maTaiKhoan;
      
      if (!accountId) {
        this.isLoading = false;
        console.error('Không tìm thấy mã tài khoản');
        return;
      }

      this.organizationAccountId = accountId;

      // Thử lấy từ localStorage trước
      if (userData.maToChuc) {
        this.organizationId = userData.maToChuc;
        this.loadStatistics();
        this.loadLatestEvaluations();
        return;
      }

      // Nếu không có trong localStorage, lấy từ API
      this.toChucService.getOrganizationByAccountId(accountId).subscribe({
        next: (response: any) => {
          const org = response.data || response;
          if (org?.maToChuc) {
            this.organizationId = org.maToChuc;
            // Cập nhật user info (sử dụng authService để tự động lưu vào đúng nơi)
            userData.maToChuc = org.maToChuc;
            this.auth.updateUserInfo(userData);
            this.loadStatistics();
            this.loadLatestEvaluations();
          } else {
            this.isLoading = false;
            console.error('Không tìm thấy tổ chức cho tài khoản này');
          }
        },
        error: (err) => {
          console.error('Lỗi lấy thông tin tổ chức:', err);
          this.isLoading = false;
        }
      });
    } catch {
      this.isLoading = false;
      console.error('Lỗi parse user data');
    }
  }
  
  loadStatistics(): void {
    if (!this.organizationId) return;

    let params = new HttpParams();
    const filterParams = this.buildTimeFilterParams();
    if (filterParams) {
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] !== null && filterParams[key] !== undefined) {
          params = params.set(key, filterParams[key].toString());
        }
      });
    }

    this.http.get<any>(`${this.apiUrl}/organization/${this.organizationId}`, { params }).subscribe({
      next: (response) => {
        this.stats = this.mapStats(response);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải thống kê tổ chức:', err);
        this.isLoading = false;
      }
    });
  }

  private buildTimeFilterParams(): any {
    const params: any = {};

    switch (this.timeFilterType) {
      case 'year':
        params.Year = this.selectedYear;
        break;
      case 'quarter':
        // Tính FromDate và ToDate từ quý
        const quarterStartMonth = (this.selectedQuarter - 1) * 3 + 1;
        const quarterEndMonth = this.selectedQuarter * 3;
        params.FromDate = this.formatDateForApi(new Date(this.selectedYear, quarterStartMonth - 1, 1));
        // Lấy ngày cuối cùng của tháng cuối quý
        const lastDayOfQuarter = new Date(this.selectedYear, quarterEndMonth, 0).getDate();
        params.ToDate = this.formatDateForApi(new Date(this.selectedYear, quarterEndMonth - 1, lastDayOfQuarter));
        break;
      case 'month':
        params.Year = this.selectedYear;
        params.Month = this.selectedMonth;
        break;
      case 'custom':
        if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
          params.FromDate = this.formatDateForApi(this.dateRange[0]);
          params.ToDate = this.formatDateForApi(this.dateRange[1]);
        }
        break;
    }

    console.log('Filter params:', params);
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
    this.loadLatestEvaluations();
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
    this.router.navigate(['/org-evaluations']);
  }

  private loadLatestEvaluations(): void {
    if (!this.organizationAccountId) {
      this.isLoadingEvaluations = false;
      return;
    }

    this.isLoadingEvaluations = true;
    this.evaluationError = null;

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

    this.evaluationService.getReceivedEvaluations(this.organizationAccountId, filter).subscribe({
      next: (response) => {
        const evaluations = this.normalizeEvaluations(response);
        this.totalEvaluations = evaluations.length;
        this.latestEvaluations = evaluations.slice(0, 3);
        this.isLoadingEvaluations = false;
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá:', err);
        this.evaluationError = err?.error?.message || 'Không thể tải đánh giá mới nhất';
        this.isLoadingEvaluations = false;
      }
    });
  }

  private normalizeEvaluations(response: any): EvaluationSummary[] {
    const data = (response?.data ?? response ?? []) as EvaluationResponseDto[];

    return data
      .map((evaluation) => ({
        id: this.normalizeNumber((evaluation as any)?.maDanhGia),
        scorerName: (evaluation as any)?.tenNguoiDanhGia ?? '',
        eventName: (evaluation as any)?.tenSuKien ?? '',
        score: this.normalizeNumber((evaluation as any)?.diemSo, 0),
        content: ((evaluation as any)?.noiDung ?? '').trim(),
        createdAt: new Date((evaluation as any)?.ngayTao ?? new Date())
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getMonthsArray(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  
  getEventMonthPercentage(month: number): number {
    if (!this.stats || !this.stats.eventsByMonth) return 0;
    
    const key = month.toString();
    const count = this.stats.eventsByMonth[key] || 0;
    const maxCount = Math.max(...Object.values(this.stats.eventsByMonth), 1);
    
    return (count / maxCount) * 100;
  }

  getEventCountForMonth(month: number): number {
    if (!this.stats || !this.stats.eventsByMonth) return 0;
    return this.stats.eventsByMonth[month.toString()] || 0;
  }

  getRegistrationMonthPercentage(month: number): number {
    if (!this.stats || !this.stats.registrationsByMonth) return 0;
    
    const key = month.toString();
    const count = this.stats.registrationsByMonth[key] || 0;
    const maxCount = Math.max(...Object.values(this.stats.registrationsByMonth), 1);
    
    return (count / maxCount) * 100;
  }

  getRegistrationCountForMonth(month: number): number {
    if (!this.stats || !this.stats.registrationsByMonth) return 0;
    return this.stats.registrationsByMonth[month.toString()] || 0;
  }

  getVolunteerRanks(): RankInfo[] {
    if (!this.stats || !this.stats.volunteersByRank) return [];
    
    const ranks: RankInfo[] = [];
    const total = this.stats.totalVolunteers || 1;
    
    const colors: Record<string, string> = {
      'Tình nguyện viên Đồng': '#cd7f32',
      'Tình nguyện viên Bạc': '#c0c0c0',
      'Tình nguyện viên Vàng': '#ffd700',
      'Tình nguyện viên Bạch Kim': '#e5e4e2',
      'Tình nguyện viên Kim Cương': '#b9f2ff'
    };
    
    for (const [name, count] of Object.entries(this.stats.volunteersByRank)) {
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
    if (!this.stats || !this.stats.volunteersByGender) return 0;
    
    const count = this.stats.volunteersByGender[gender] || 0;
    const total = this.stats.totalVolunteers || 1;
    
    return (count / total) * 100;
  }
  
  getGenderCount(gender: string): number {
    if (!this.stats || !this.stats.volunteersByGender) return 0;
    return this.stats.volunteersByGender[gender] || 0;
  }

  getRatingCount(rating: number): number {
    if (!this.stats || !this.stats.ratingsDistribution) return 0;
    return this.stats.ratingsDistribution[rating] || 0;
  }

  getRatingPercentage(rating: number): number {
    if (!this.stats || !this.stats.ratingsDistribution) return 0;
    
    const count = this.stats.ratingsDistribution[rating] || 0;
    const total = this.stats.totalRatings || 1;
    
    return (count / total) * 100;
  }

  getRecordEntries(record: Record<string, number> | null | undefined): { key: string; value: number }[] {
    if (!record) return [];
    return Object.entries(record).map(([key, value]) => ({ key, value }));
  }

  getEntriesWithPercentage(record: Record<string, number> | null | undefined, total: number): { key: string; value: number; percentage: number }[] {
    if (!record || !total) return [];
    return Object.entries(record).map(([key, value]) => ({
      key,
      value,
      percentage: this.calculatePercentage(value, total)
    }));
  }

  calculatePercentage(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 1000) / 10;
  }

  formatAverage(value: number | undefined | null, digits = 2): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0';
    }
    return Number(value).toFixed(digits);
  }

  getGenderPieStyle(): Record<string, string> {
    if (!this.stats) {
      return { background: '#f1f3f5' };
    }

    return this.buildPieStyle(
      this.stats.volunteersByGender,
      ['Nam', 'Nữ', 'Khác'],
      ['#0d6efd', '#d63384', '#6c757d'],
      this.stats.totalVolunteers
    );
  }

  getRegistrationPieStyle(): Record<string, string> {
    if (!this.stats) {
      return { background: '#f1f3f5' };
    }

    return this.buildPieStyle(
      {
        'Đã duyệt': this.stats.approvedRegistrations,
        'Chờ duyệt': this.stats.pendingRegistrations,
        'Từ chối': this.stats.rejectedRegistrations
      },
      ['Đã duyệt', 'Chờ duyệt', 'Từ chối'],
      ['#28a745', '#ffc107', '#dc3545'],
      this.stats.totalRegistrations
    );
  }

  getRatingPieStyle(): Record<string, string> {
    if (!this.stats || !this.stats.ratingsDistribution) {
      return { background: '#f1f3f5' };
    }

    const distribution = this.stats.ratingsDistribution;
    const keys = [5, 4, 3, 2, 1];
    const colors = ['#28a745', '#4caf50', '#ffc107', '#ff9800', '#f44336'];

    return this.buildPieStyle(
      Object.fromEntries(keys.map(k => [k.toString(), distribution[k] || 0])),
      keys.map(k => k.toString()),
      colors,
      this.stats.totalRatings
    );
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

  private mapStats(response: any): OrganizationSpecificStats {
    const data = this.extractData(response);

    return {
      organizationId: this.normalizeNumber(data.organizationId ?? data.OrganizationId),
      organizationName: data.organizationName ?? data.OrganizationName ?? '',
      totalEvents: this.normalizeNumber(data.totalEvents ?? data.TotalEvents),
      pendingEvents: this.normalizeNumber(data.pendingEvents ?? data.PendingEvents),
      activeEvents: this.normalizeNumber(data.activeEvents ?? data.ActiveEvents),
      completedEvents: this.normalizeNumber(data.completedEvents ?? data.CompletedEvents),
      cancelledEvents: this.normalizeNumber(data.cancelledEvents ?? data.CancelledEvents),
      eventsByMonth: this.normalizeMonthMap(data.eventsByMonth ?? data.EventsByMonth),
      eventsByField: this.normalizeRecord(data.eventsByField ?? data.EventsByField),
      averageVolunteersPerEvent: this.normalizeNumber(data.averageVolunteersPerEvent ?? data.AverageVolunteersPerEvent),
      averageEventRating: this.normalizeNumber(data.averageEventRating ?? data.AverageEventRating),
      totalRegistrations: this.normalizeNumber(data.totalRegistrations ?? data.TotalRegistrations),
      pendingRegistrations: this.normalizeNumber(data.pendingRegistrations ?? data.PendingRegistrations),
      approvedRegistrations: this.normalizeNumber(data.approvedRegistrations ?? data.ApprovedRegistrations),
      rejectedRegistrations: this.normalizeNumber(data.rejectedRegistrations ?? data.RejectedRegistrations),
      registrationsByMonth: this.normalizeMonthMap(data.registrationsByMonth ?? data.RegistrationsByMonth),
      approvalRate: this.normalizeNumber(data.approvalRate ?? data.ApprovalRate),
      totalVolunteers: this.normalizeNumber(data.totalVolunteers ?? data.TotalVolunteers),
      newVolunteersThisMonth: this.normalizeNumber(data.newVolunteersThisMonth ?? data.NewVolunteersThisMonth),
      volunteersByRank: this.normalizeRecord(data.volunteersByRank ?? data.VolunteersByRank),
      volunteersByGender: this.normalizeRecord(data.volunteersByGender ?? data.VolunteersByGender),
      averageVolunteerRating: this.normalizeNumber(data.averageVolunteerRating ?? data.AverageVolunteerRating),
      averageRating: this.normalizeNumber(data.averageRating ?? data.AverageRating),
      ratingsDistribution: this.normalizeNumberRecordWithNumericKeys(data.ratingsDistribution ?? data.RatingsDistribution),
      totalRatings: this.normalizeNumber(data.totalRatings ?? data.TotalRatings)
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

  private extractMonthFromKey(key: string): number | null {
    if (!key) {
      return null;
    }

    const direct = Number(key);
    if (Number.isFinite(direct) && direct >= 1 && direct <= 12) {
      return direct;
    }

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

