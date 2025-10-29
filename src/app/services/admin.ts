import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SuKienResponseDto } from '../models/event';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  // API quản lý tài khoản
  getAllUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`);
  }

  getUserById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`);
  }

  updateUserRole(id: number, vaiTro: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/role`, { vaiTro });
  }

  updateUserStatus(id: number, trangThai: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}/status`, { trangThai });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  // API quản lý tổ chức
  getPendingOrganizations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/organizations/pending`);
  }
  
  getAllOrganizations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/organizations`);
  }
  
  getOrganizationById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizations/${id}`);
  }

  verifyOrganization(id: number, daXacMinh: boolean, lyDoTuChoi?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/organizations/${id}/verify`, { 
      daXacMinh,
      lyDoTuChoi: lyDoTuChoi || ''
    });
  }
  
  updateOrganization(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/organizations/${id}`, data);
  }
  
  deleteOrganization(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizations/${id}`);
  }

  // API quản lý sự kiện
  getLatestEvents(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/sukien?limit=5&sort=newest`);
  }
}