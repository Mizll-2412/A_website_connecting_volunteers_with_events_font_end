import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { EvaluationService, EvaluationResponseDto } from '../../services/evaluation.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating';
import { AuthService } from '../../services/auth';

type EvaluationTab = 'received' | 'given';

interface EvaluationViewModel {
  id: number;
  scorerName: string;
  targetName: string;
  eventName: string;
  score: number;
  content: string;
  createdAt: Date;
}

@Component({
  selector: 'app-organization-evaluations',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDatePickerModule, StarRatingComponent],
  templateUrl: './organization-evaluations.html',
  styleUrls: ['./organization-evaluations.css']
})
export class OrganizationEvaluations implements OnInit {
  activeTab: EvaluationTab = 'received';

  isLoadingReceived = false;
  isLoadingGiven = false;
  receivedError: string | null = null;
  givenError: string | null = null;

  receivedEvaluations: EvaluationViewModel[] = [];
  givenEvaluations: EvaluationViewModel[] = [];

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

  private accountId: number | null = null;

  constructor(
    private evaluationService: EvaluationService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeTimeFilter();
    this.resolveAccountId();
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

  switchTab(tab: EvaluationTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    // Reload data khi chuyển tab với filter hiện tại
    if (tab === 'received') {
      this.loadReceivedEvaluations();
    } else {
      this.loadGivenEvaluations();
    }
  }

  goBack(): void {
    this.router.navigate(['/org-statistics']);
  }

  trackByEvaluationId(_: number, evaluation: EvaluationViewModel): number {
    return evaluation.id;
  }

  private resolveAccountId(): void {
    // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
    const userData = this.auth.getUser();
    if (!userData) {
      this.receivedError = 'Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.';
      this.givenError = this.receivedError;
      return;
    }

    try {
      const accountId = Number(userData?.maTaiKhoan);

      if (!Number.isFinite(accountId) || accountId <= 0) {
        this.receivedError = 'Thông tin tài khoản tổ chức không hợp lệ.';
        this.givenError = this.receivedError;
        return;
      }

      this.accountId = accountId;
      this.loadReceivedEvaluations();
      this.loadGivenEvaluations();
    } catch (error) {
      console.error('Lỗi parse thông tin user:', error);
      this.receivedError = 'Không thể đọc thông tin người dùng.';
      this.givenError = this.receivedError;
    }
  }

  private loadReceivedEvaluations(): void {
    if (!this.accountId) {
      return;
    }

    this.isLoadingReceived = true;
    this.receivedError = null;

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

    this.evaluationService.getReceivedEvaluations(this.accountId, filter).subscribe({
      next: (response) => {
        this.receivedEvaluations = this.normalizeEvaluations(response);
        this.isLoadingReceived = false;
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá nhận được:', err);
        this.receivedError = err?.error?.message || 'Không thể tải danh sách đánh giá nhận được.';
        this.isLoadingReceived = false;
      }
    });
  }

  private loadGivenEvaluations(): void {
    if (!this.accountId) {
      return;
    }

    this.isLoadingGiven = true;
    this.givenError = null;

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

    this.evaluationService.getGivenEvaluations(this.accountId, filter).subscribe({
      next: (response) => {
        this.givenEvaluations = this.normalizeEvaluations(response);
        this.isLoadingGiven = false;
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá đã cho:', err);
        this.givenError = err?.error?.message || 'Không thể tải danh sách đánh giá đã cho.';
        this.isLoadingGiven = false;
      }
    });
  }

  private normalizeEvaluations(response: any): EvaluationViewModel[] {
    const rawData = (response?.data ?? response ?? []) as EvaluationResponseDto[];

    return rawData
      .map((evaluation) => ({
        id: this.normalizeNumber((evaluation as any)?.maDanhGia),
        scorerName: (evaluation as any)?.tenNguoiDanhGia ?? '',
        targetName: (evaluation as any)?.tenNguoiDuocDanhGia ?? '',
        eventName: (evaluation as any)?.tenSuKien ?? '',
        score: this.normalizeNumber((evaluation as any)?.diemSo, 0),
        content: ((evaluation as any)?.noiDung ?? '').trim(),
        createdAt: new Date((evaluation as any)?.ngayTao ?? new Date())
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private normalizeNumber(value: any, fallback = 0): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
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

    // Reload cả hai tab với filter mới
    this.loadReceivedEvaluations();
    this.loadGivenEvaluations();
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
}


