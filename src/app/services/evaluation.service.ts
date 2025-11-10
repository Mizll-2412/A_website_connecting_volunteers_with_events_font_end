import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateEvaluationDto {
  maNguoiDanhGia: number;
  maNguoiDuocDanhGia: number;
  maSuKien: number;
  diemSo: number;
  noiDung?: string;
}

export interface EvaluationResponseDto {
  maDanhGia: number;
  maNguoiDanhGia: number;
  tenNguoiDanhGia: string;
  vaiTroNguoiDanhGia?: string;
  maNguoiDuocDanhGia: number;
  tenNguoiDuocDanhGia: string;
  vaiTroNguoiDuocDanhGia?: string;
  maSuKien: number;
  tenSuKien: string;
  diemSo: number;
  noiDung: string;
  ngayTao: Date;
}

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private apiUrl = `${environment.apiUrl}/danhgia`;

  constructor(private http: HttpClient) {}

  // Tạo đánh giá mới
  createEvaluation(evaluation: CreateEvaluationDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, evaluation);
  }

  // Lấy đánh giá của người dùng
  getEvaluationsByUser(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`);
  }

  // Lấy đánh giá cho người dùng (đánh giá nhận được)
  getEvaluationsForUser(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/for-user/${userId}`);
  }

  // Lấy đánh giá theo sự kiện
  getEvaluationsByEvent(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/event/${eventId}`);
  }

  // Kiểm tra đã đánh giá chưa - sử dụng getGivenEvaluations thay vì endpoint /check
  checkEvaluationExists(evaluatorId: number, evaluatedId: number, eventId: number): Observable<any> {
    // Lấy tất cả đánh giá đã tạo, rồi filter
    return new Observable(observer => {
      this.getGivenEvaluations(evaluatorId).subscribe({
        next: (response: any) => {
          const evaluations = response?.data || response || [];
          const evaluation = evaluations.find((e: any) => 
            e.maNguoiDuocDanhGia === evaluatedId && e.maSuKien === eventId
          );
          
          if (evaluation) {
            observer.next({ exists: true, data: evaluation });
          } else {
            observer.next({ exists: false, data: null });
          }
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  // Cập nhật đánh giá
  updateEvaluation(evaluationId: number, data: { diemSo: number, noiDung?: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${evaluationId}`, data);
  }

  // Xóa đánh giá
  deleteEvaluation(evaluationId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${evaluationId}`);
  }

  // Lấy thống kê đánh giá
  getEvaluationStatistics(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics/${userId}`);
  }

  // Lấy đánh giá mà user nhận được (người khác đánh giá mình)
  getReceivedEvaluations(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/received/${userId}`);
  }

  // Lấy đánh giá mà user đã đưa ra (đánh giá người khác)
  getGivenEvaluations(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/given/${userId}`);
  }

  // Lấy toàn bộ đánh giá (Admin)
  getAllEvaluations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/all`);
  }
}

