import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Field {
  maLinhVuc?: number;
  tenLinhVuc: string;
  moTa?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FieldService {
  private apiUrl = `${environment.apiUrl}/linhvuc`;

  constructor(private http: HttpClient) {}

  // Lấy tất cả lĩnh vực
  getAllFields(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Lấy lĩnh vực theo ID
  getFieldById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  // Tạo lĩnh vực mới
  createField(field: Field): Observable<any> {
    return this.http.post(this.apiUrl, field);
  }
  
  // Cập nhật lĩnh vực
  updateField(id: number, field: Field): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, field);
  }
  
  // Xóa lĩnh vực
  deleteField(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
