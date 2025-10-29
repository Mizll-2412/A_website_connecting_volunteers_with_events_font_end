import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private apiUrl = `${environment.apiUrl}/dondangky`;

  constructor(private http: HttpClient) { }

  // Đăng ký tham gia sự kiện
  register(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  // Hủy đăng ký sự kiện
  cancelRegistration(maTNV: number, maSuKien: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${maTNV}/${maSuKien}`);
  }

  // Lấy trạng thái đăng ký
  getRegistrationStatus(maTNV: number, maSuKien: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${maTNV}/${maSuKien}`);
  }

  // Lấy danh sách đăng ký của 1 tình nguyện viên
  getRegistrationsByVolunteer(maTNV: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/volunteer/${maTNV}`);
  }

  // Lấy danh sách đăng ký của 1 sự kiện
  getRegistrationsByEvent(maSuKien: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/event/${maSuKien}`);
  }

  // Cập nhật trạng thái đăng ký (duyệt/từ chối)
  updateRegistrationStatus(maTNV: number, maSuKien: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${maTNV}/${maSuKien}`, data);
  }
}
