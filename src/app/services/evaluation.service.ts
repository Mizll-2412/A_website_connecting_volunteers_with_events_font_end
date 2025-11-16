import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  getReceivedEvaluations(userId: number, filter?: { Year?: number; Month?: number; FromDate?: string; ToDate?: string; MinScore?: number; MaxScore?: number }): Observable<any> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.Year !== undefined && filter.Year !== null) {
        params = params.set('Year', filter.Year.toString());
      }
      if (filter.Month !== undefined && filter.Month !== null) {
        params = params.set('Month', filter.Month.toString());
      }
      if (filter.FromDate) {
        params = params.set('FromDate', filter.FromDate);
      }
      if (filter.ToDate) {
        params = params.set('ToDate', filter.ToDate);
      }
      if (filter.MinScore !== undefined && filter.MinScore !== null) {
        const minScore = typeof filter.MinScore === 'number' ? filter.MinScore : Number(filter.MinScore);
        if (!isNaN(minScore) && minScore > 0 && minScore <= 5) {
          params = params.set('MinScore', minScore.toString());
        }
      }
      if (filter.MaxScore !== undefined && filter.MaxScore !== null) {
        const maxScore = typeof filter.MaxScore === 'number' ? filter.MaxScore : Number(filter.MaxScore);
        if (!isNaN(maxScore) && maxScore > 0 && maxScore <= 5) {
          params = params.set('MaxScore', maxScore.toString());
        }
      }
    }
    
    return this.http.get<any>(`${this.apiUrl}/received/${userId}`, { params });
  }

  // Lấy đánh giá mà user đã đưa ra (đánh giá người khác)
  getGivenEvaluations(userId: number, filter?: { Year?: number; Month?: number; FromDate?: string; ToDate?: string; MinScore?: number; MaxScore?: number }): Observable<any> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.Year !== undefined && filter.Year !== null) {
        params = params.set('Year', filter.Year.toString());
      }
      if (filter.Month !== undefined && filter.Month !== null) {
        params = params.set('Month', filter.Month.toString());
      }
      if (filter.FromDate) {
        params = params.set('FromDate', filter.FromDate);
      }
      if (filter.ToDate) {
        params = params.set('ToDate', filter.ToDate);
      }
      if (filter.MinScore !== undefined && filter.MinScore !== null) {
        const minScore = typeof filter.MinScore === 'number' ? filter.MinScore : Number(filter.MinScore);
        if (!isNaN(minScore) && minScore > 0 && minScore <= 5) {
          params = params.set('MinScore', minScore.toString());
        }
      }
      if (filter.MaxScore !== undefined && filter.MaxScore !== null) {
        const maxScore = typeof filter.MaxScore === 'number' ? filter.MaxScore : Number(filter.MaxScore);
        if (!isNaN(maxScore) && maxScore > 0 && maxScore <= 5) {
          params = params.set('MaxScore', maxScore.toString());
        }
      }
    }
    
    return this.http.get<any>(`${this.apiUrl}/given/${userId}`, { params });
  }

  // Lấy toàn bộ đánh giá (Admin)
  getAllEvaluations(filter?: { Year?: number; Month?: number; FromDate?: string; ToDate?: string; MinScore?: number; MaxScore?: number }): Observable<any> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.Year !== undefined && filter.Year !== null) {
        params = params.set('Year', filter.Year.toString());
      }
      if (filter.Month !== undefined && filter.Month !== null) {
        params = params.set('Month', filter.Month.toString());
      }
      if (filter.FromDate) {
        params = params.set('FromDate', filter.FromDate);
      }
      if (filter.ToDate) {
        params = params.set('ToDate', filter.ToDate);
      }
      if (filter.MinScore !== undefined && filter.MinScore !== null) {
        const minScore = typeof filter.MinScore === 'number' ? filter.MinScore : Number(filter.MinScore);
        if (!isNaN(minScore) && minScore > 0 && minScore <= 5) {
          params = params.set('MinScore', minScore.toString());
        }
      }
      if (filter.MaxScore !== undefined && filter.MaxScore !== null) {
        const maxScore = typeof filter.MaxScore === 'number' ? filter.MaxScore : Number(filter.MaxScore);
        if (!isNaN(maxScore) && maxScore > 0 && maxScore <= 5) {
          params = params.set('MaxScore', maxScore.toString());
        }
      }
    }
    
    return this.http.get<any>(`${this.apiUrl}/all`, { params });
  }

  // Đánh giá hàng loạt nhiều tình nguyện viên
  bulkEvaluate(maSuKien: number, maTNVs: number[], diemSo: number, noiDung?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, {
      maSuKien,
      maTNVs,
      diemSo,
      noiDung: noiDung?.trim() || undefined
    });
  }
}

