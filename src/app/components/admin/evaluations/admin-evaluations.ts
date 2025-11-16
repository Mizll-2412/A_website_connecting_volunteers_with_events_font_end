import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { EvaluationService, EvaluationResponseDto } from '../../../services/evaluation.service';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';
import { PaginationComponent } from '../../shared/pagination/pagination';

interface EvaluationViewModel {
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
  selector: 'app-admin-evaluations',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDatePickerModule, StarRatingComponent, PaginationComponent],
  templateUrl: './admin-evaluations.html',
  styleUrls: ['./admin-evaluations.css']
})
export class AdminEvaluationsComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;

  // Dữ liệu sau khi áp dụng filter tên tổ chức/sự kiện
  volunteerToOrganization: EvaluationViewModel[] = [];
  organizationToVolunteer: EvaluationViewModel[] = [];
  // Dữ liệu gốc (không đổi) để áp dụng các filter nhiều lần
  private allVolunteerToOrganization: EvaluationViewModel[] = [];
  private allOrganizationToVolunteer: EvaluationViewModel[] = [];
  
  // Pagination
  itemsPerPage: number = 5;
  volunteerCurrentPage: number = 1;
  organizationCurrentPage: number = 1;
  currentTab: 'volunteer' | 'organization' = 'volunteer';

  // Time filter properties
  timeFilterType: 'year' | 'quarter' | 'month' | 'custom' = 'year';
  selectedYear: number = new Date().getFullYear();
  selectedQuarter: number = 1;
  selectedMonth: number = new Date().getMonth() + 1;
  dateRange: [Date | null, Date | null] | null = null;
  availableYears: number[] = [];
  
  // Score filter properties
  selectedMinScore: number | null = null;
  selectedMaxScore: number | null = null;

  // Name filters (sidebar)
  organizationOptions: string[] = [];
  eventOptions: string[] = [];
  selectedOrganizations = new Set<string>();
  selectedEvents = new Set<string>();

  constructor(private evaluationService: EvaluationService) {}

  ngOnInit(): void {
    this.initializeTimeFilter();
    this.loadAllEvaluations();
  }

  private initializeTimeFilter(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      this.availableYears.push(i);
    }
    this.selectedYear = currentYear;
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedQuarter = Math.floor((this.selectedMonth - 1) / 3) + 1;
  }

  reload(): void {
    this.loadAllEvaluations();
  }

  trackByEvaluationId(_: number, evaluation: EvaluationViewModel): number {
    return evaluation.id;
  }

  private loadAllEvaluations(): void {
    this.isLoading = true;
    this.errorMessage = null;

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

    // Thêm filter số sao - chỉ thêm khi có giá trị
    if (this.selectedMinScore != null) {
      filter.MinScore = this.selectedMinScore;
    }
    if (this.selectedMaxScore != null) {
      filter.MaxScore = this.selectedMaxScore;
    }

    this.evaluationService.getAllEvaluations(filter).subscribe({
      next: (response) => {
        const evaluations = this.normalizeEvaluations(response);
        this.allVolunteerToOrganization = evaluations.filter(
          (e) => e.scorerRole === 'User' && e.targetRole === 'Organization'
        );
        this.allOrganizationToVolunteer = evaluations.filter(
          (e) => e.scorerRole === 'Organization' && e.targetRole === 'User'
        );

        // Tạo danh sách filter options
        const orgSet = new Set<string>();
        const evtSet = new Set<string>();
        this.allVolunteerToOrganization.forEach((e) => {
          if (e.targetName) orgSet.add(e.targetName);
          if (e.eventName) evtSet.add(e.eventName);
        });
        this.allOrganizationToVolunteer.forEach((e) => {
          if (e.scorerName) orgSet.add(e.scorerName);
          if (e.eventName) evtSet.add(e.eventName);
        });
        this.organizationOptions = Array.from(orgSet).sort((a, b) => a.localeCompare(b));
        this.eventOptions = Array.from(evtSet).sort((a, b) => a.localeCompare(b));

        // Áp dụng filter tên/tổ chức nếu có (mặc định chưa chọn gì)
        this.applyNameFilters();

        this.volunteerCurrentPage = 1; // Reset về trang đầu khi load mới
        this.organizationCurrentPage = 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá:', err);
        this.errorMessage = err?.error?.message || 'Không thể tải danh sách đánh giá.';
        this.isLoading = false;
      }
    });
  }

  private normalizeEvaluations(response: any): EvaluationViewModel[] {
    const raw = (response?.data ?? response ?? []) as (EvaluationResponseDto & {
      vaiTroNguoiDanhGia?: string;
      vaiTroNguoiDuocDanhGia?: string;
    })[];

    return raw
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

  onTimeFilterTypeChange(): void {
    if (this.timeFilterType === 'custom') {
      this.dateRange = null;
      return;
    }
    if (this.timeFilterType === 'year' && this.selectedYear) {
      this.applyTimeFilter();
    } else if (this.timeFilterType === 'quarter' && this.selectedYear && this.selectedQuarter) {
      this.applyTimeFilter();
    } else if (this.timeFilterType === 'month' && this.selectedYear && this.selectedMonth) {
      this.applyTimeFilter();
    }
  }

  onDateRangeChange(dates: [Date | null, Date | null] | null): void {
    if (dates && dates[0] && dates[1]) {
      this.applyTimeFilter();
    }
  }

  applyTimeFilter(): void {
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

    this.loadAllEvaluations();
  }

  clearTimeFilter(): void {
    this.timeFilterType = 'year';
    this.selectedYear = new Date().getFullYear();
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedQuarter = Math.floor((this.selectedMonth - 1) / 3) + 1;
    this.dateRange = null;
    this.selectedMinScore = null;
    this.selectedMaxScore = null;
    this.applyTimeFilter();
  }

  onScoreFilterChange(): void {
    this.applyTimeFilter();
  }

  onMinScoreChange(value: any): void {
    this.selectedMinScore = value === 'null' || value === null || value === undefined ? null : Number(value);
    this.applyTimeFilter();
  }

  onMaxScoreChange(value: any): void {
    this.selectedMaxScore = value === 'null' || value === null || value === undefined ? null : Number(value);
    this.applyTimeFilter();
  }

  formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get paginatedVolunteerToOrg(): EvaluationViewModel[] {
    const startIndex = (this.volunteerCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.volunteerToOrganization.slice(startIndex, endIndex);
  }

  get paginatedOrgToVolunteer(): EvaluationViewModel[] {
    const startIndex = (this.organizationCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.organizationToVolunteer.slice(startIndex, endIndex);
  }

  get currentEvaluations(): EvaluationViewModel[] {
    return this.currentTab === 'volunteer' ? this.volunteerToOrganization : this.organizationToVolunteer;
  }

  get paginatedCurrentEvaluations(): EvaluationViewModel[] {
    return this.currentTab === 'volunteer' ? this.paginatedVolunteerToOrg : this.paginatedOrgToVolunteer;
  }

  onVolunteerPageChange(page: number): void {
    this.volunteerCurrentPage = page;
  }

  onOrganizationPageChange(page: number): void {
    this.organizationCurrentPage = page;
  }

  onVolunteerItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.volunteerCurrentPage = 1;
  }

  onOrganizationItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.organizationCurrentPage = 1;
  }

  onPageChange(page: number): void {
    if (this.currentTab === 'volunteer') {
      this.volunteerCurrentPage = page;
    } else {
      this.organizationCurrentPage = page;
    }
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    if (this.currentTab === 'volunteer') {
      this.volunteerCurrentPage = 1;
    } else {
      this.organizationCurrentPage = 1;
    }
  }

  switchTab(tab: 'volunteer' | 'organization'): void {
    this.currentTab = tab;
  }

  // Stats helpers for nicer UI
  get totalEvaluationsCount(): number {
    return (this.volunteerToOrganization?.length || 0) + (this.organizationToVolunteer?.length || 0);
  }

  get v2oCount(): number {
    return this.volunteerToOrganization?.length || 0;
  }

  get o2vCount(): number {
    return this.organizationToVolunteer?.length || 0;
  }

  get averageScore(): number {
    const all = [...(this.volunteerToOrganization || []), ...(this.organizationToVolunteer || [])];
    if (all.length === 0) return 0;
    const sum = all.reduce((acc, e) => acc + (e.score || 0), 0);
    return Math.round((sum / all.length) * 10) / 10;
  }

  // Sidebar filter handlers
  toggleOrganization(name: string): void {
    if (this.selectedOrganizations.has(name)) this.selectedOrganizations.delete(name);
    else this.selectedOrganizations.add(name);
    this.applyNameFilters();
  }

  toggleEvent(name: string): void {
    if (this.selectedEvents.has(name)) this.selectedEvents.delete(name);
    else this.selectedEvents.add(name);
    this.applyNameFilters();
  }

  isOrgSelected(name: string): boolean {
    return this.selectedOrganizations.has(name);
  }

  isEventSelected(name: string): boolean {
    return this.selectedEvents.has(name);
  }

  clearNameFilters(): void {
    this.selectedOrganizations.clear();
    this.selectedEvents.clear();
    this.applyNameFilters();
  }

  private applyNameFilters(): void {
    const hasOrg = this.selectedOrganizations.size > 0;
    const hasEvt = this.selectedEvents.size > 0;

    const orgMatch = (e: EvaluationViewModel) => {
      if (!hasOrg) return true;
      // V2O: organization là targetName; O2V: organization là scorerName
      return this.selectedOrganizations.has(e.targetRole === 'Organization' ? e.targetName : e.scorerName);
    };

    const evtMatch = (e: EvaluationViewModel) => {
      if (!hasEvt) return true;
      return this.selectedEvents.has(e.eventName);
    };

    this.volunteerToOrganization = this.allVolunteerToOrganization.filter((e) => orgMatch(e) && evtMatch(e));
    this.organizationToVolunteer = this.allOrganizationToVolunteer.filter((e) => orgMatch(e) && evtMatch(e));

    // Khi chọn tổ chức: chỉ hiển thị danh sách sự kiện tương ứng với tổ chức đang chọn
    if (hasOrg) {
      const allowedEvents = new Set<string>();
      // TNV ➜ TC: tổ chức là targetName
      this.allVolunteerToOrganization.forEach((e) => {
        if (this.selectedOrganizations.has(e.targetName)) {
          if (e.eventName) allowedEvents.add(e.eventName);
        }
      });
      // TC ➜ TNV: tổ chức là scorerName
      this.allOrganizationToVolunteer.forEach((e) => {
        if (this.selectedOrganizations.has(e.scorerName)) {
          if (e.eventName) allowedEvents.add(e.eventName);
        }
      });
      this.eventOptions = Array.from(allowedEvents).sort((a, b) => a.localeCompare(b));
      // Loại bỏ các event đang chọn nhưng không còn phù hợp
      Array.from(this.selectedEvents).forEach((ev) => {
        if (!this.eventOptions.includes(ev)) this.selectedEvents.delete(ev);
      });
    } else {
      // Không chọn tổ chức nào -> hiển thị toàn bộ sự kiện
      const evtSet = new Set<string>();
      this.allVolunteerToOrganization.forEach((e) => e.eventName && evtSet.add(e.eventName));
      this.allOrganizationToVolunteer.forEach((e) => e.eventName && evtSet.add(e.eventName));
      this.eventOptions = Array.from(evtSet).sort((a, b) => a.localeCompare(b));
    }

    // Reset về trang đầu mỗi lần filter
    this.volunteerCurrentPage = 1;
    this.organizationCurrentPage = 1;
  }
}


