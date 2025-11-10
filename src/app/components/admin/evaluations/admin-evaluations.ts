import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService, EvaluationResponseDto } from '../../../services/evaluation.service';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';

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
  imports: [CommonModule, StarRatingComponent],
  templateUrl: './admin-evaluations.html',
  styleUrls: ['./admin-evaluations.css']
})
export class AdminEvaluationsComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;

  volunteerToOrganization: EvaluationViewModel[] = [];
  organizationToVolunteer: EvaluationViewModel[] = [];

  constructor(private evaluationService: EvaluationService) {}

  ngOnInit(): void {
    this.loadAllEvaluations();
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

    this.evaluationService.getAllEvaluations().subscribe({
      next: (response) => {
        const evaluations = this.normalizeEvaluations(response);
        this.volunteerToOrganization = evaluations.filter(
          (e) => e.scorerRole === 'User' && e.targetRole === 'Organization'
        );
        this.organizationToVolunteer = evaluations.filter(
          (e) => e.scorerRole === 'Organization' && e.targetRole === 'User'
        );
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
}


