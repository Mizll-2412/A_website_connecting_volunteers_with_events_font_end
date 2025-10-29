import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TinhNguyenVienService {
  private apiUrl = `${environment.apiUrl}/tinhnguyenvien`;

  constructor(private http: HttpClient) { }

  getAllVolunteers(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
  
  getFeaturedVolunteers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/featured`);
  }

  getVolunteerById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getVolunteerByAccountId(accountId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-account/${accountId}`);
  }

  updateVolunteer(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Cách gọi khác cho các phương thức đã tồn tại
  layTatCaTinhNguyenVien(): Observable<any> {
    return this.getAllVolunteers();
  }
}