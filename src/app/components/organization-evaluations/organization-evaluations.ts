import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EvaluationService, EvaluationResponseDto } from '../../services/evaluation.service';
import { StarRatingComponent } from '../shared/star-rating/star-rating';

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
  imports: [CommonModule, StarRatingComponent],
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

  private accountId: number | null = null;

  constructor(
    private evaluationService: EvaluationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resolveAccountId();
  }

  switchTab(tab: EvaluationTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/org-statistics']);
  }

  trackByEvaluationId(_: number, evaluation: EvaluationViewModel): number {
    return evaluation.id;
  }

  private resolveAccountId(): void {
    const user = localStorage.getItem('user');
    if (!user) {
      this.receivedError = 'Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.';
      this.givenError = this.receivedError;
      return;
    }

    try {
      const userData = JSON.parse(user);
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

    this.evaluationService.getReceivedEvaluations(this.accountId).subscribe({
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

    this.evaluationService.getGivenEvaluations(this.accountId).subscribe({
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
}


