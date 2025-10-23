import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { ToChuc, ToChucResponseDto, DuyetToChucRequest, TrangThaiXacMinh } from '../models/organiztion';
@Injectable({
  providedIn: 'root'
})
export class ToChucService {
//   private apiUrl = `${environment.apiUrl}/api/organization`;
  private apiUrl = 'https://a-website-connecting-volunteers-with.onrender.com/api/organization';
  private toChucSubject = new BehaviorSubject<ToChuc[]>([]);
  public toChuc$ = this.toChucSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Lấy tất cả tổ chức
  layTatCaToChuc(): Observable<ToChucResponseDto[]> {
    return this.http.get<ToChucResponseDto[]>(this.apiUrl).pipe(
      tap(data => this.toChucSubject.next(data as any))
    );
  }

  // Lấy tổ chức theo ID
  layToChucTheoId(maToChuc: number): Observable<ToChucResponseDto> {
    return this.http.get<ToChucResponseDto>(`${this.apiUrl}/${maToChuc}`);
  }

  // Duyệt tổ chức
  duyetToChuc(maToChuc: number): Observable<any> {
    const request: DuyetToChucRequest = {
      trangThaiXacMinh: TrangThaiXacMinh.DaDuyet
    };
    return this.http.put(`${this.apiUrl}/${maToChuc}/duyet`, request);
  }

  // Từ chối tổ chức
  tuChoiToChuc(maToChuc: number, lyDo: string): Observable<any> {
    const request: DuyetToChucRequest = {
      trangThaiXacMinh: TrangThaiXacMinh.TuChoi,
      lyDoTuChoi: lyDo
    };
    return this.http.put(`${this.apiUrl}/${maToChuc}/tu-choi`, request);
  }

  // Xóa tổ chức
  xoaToChuc(maToChuc: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${maToChuc}`);
  }

  // Upload ảnh đại diện
  uploadAnhDaiDien(maToChuc: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('anhFile', file);
    return this.http.post<string>(`${this.apiUrl}/${maToChuc}/upload-avatar`, formData);
  }

  demToChucTheoTrangThai(trangThai: TrangThaiXacMinh): number {
    const currentData = this.toChucSubject.value;
    return currentData.filter(tc => tc.trangThaiXacMinh === trangThai).length;
  }
}
;
