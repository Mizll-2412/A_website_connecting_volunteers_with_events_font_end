import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ToChucService {
  private apiUrl = `${environment.apiUrl}/organization`;

  constructor(private http: HttpClient) { }

  // Phương thức cũ đã được sử dụng trong component events.ts
  layTatCaToChuc(): Observable<any> {
    return this.getAllOrganizations();
  }

  getAllOrganizations(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getOrganizationById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  // Thêm phương thức lấy tổ chức theo mã tài khoản
  getOrganizationByAccountId(accountId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-account/${accountId}`);
  }

  createOrganization(orgData: any): Observable<any> {
    return this.http.post(this.apiUrl, orgData);
  }

  updateOrganization(id: number, orgData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, orgData);
  }
  
  // Phương thức cập nhật tổ chức sử dụng FormData để hỗ trợ upload file
  updateToChuc(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }
  
  // Phương thức xác minh tổ chức
  verifyOrganization(id: number, daXacMinh: boolean, lyDoTuChoi?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/verify`, { 
      daXacMinh,
      lyDoTuChoi: lyDoTuChoi || ''
    });
  }

  deleteOrganization(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}