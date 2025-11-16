import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationItem {
  maThongBao: number;
  maNguoiTao: number;
  tenNguoiTao: string;
  anhDaiDienNguoiTao?: string | null;
  phanLoai: number;
  phanLoaiText: string;
  noiDung: string;
  ngayGui: string;
  trangThai: 0 | 1;
  trangThaiText: string;
  maNguoiNhanThongBao: number;
}

export interface NotificationCount {
  tongSo: number;
  chuaDoc: number;
  daDoc: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notification`;

  constructor(private http: HttpClient) {}

  getNotifications(read?: boolean): Observable<{ data: NotificationItem[] } | NotificationItem[]> {
    let params = new HttpParams();
    if (read !== undefined) {
      params = params.set('read', read);
    }
    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  getCount(): Observable<{ data: NotificationCount } | NotificationCount> {
    return this.http.get<any>(`${this.apiUrl}/count`);
  }

  markAsRead(maThongBao: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/status`, { maThongBao, trangThai: 1 });
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/mark-all-read`, {});
  }

  delete(maThongBao: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${maThongBao}`);
  }

  deleteAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/all`);
  }
}

