import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Skill {
  maKyNang?: number;
  tenKyNang: string;
  moTa?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SkillService {
  private apiUrl = `${environment.apiUrl}/kynang`;

  constructor(private http: HttpClient) {}

  // Lấy tất cả kỹ năng
  getAllSkills(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Lấy kỹ năng theo ID
  getSkillById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  // Tạo kỹ năng mới
  createSkill(skill: Skill): Observable<any> {
    return this.http.post(this.apiUrl, skill);
  }
  
  // Cập nhật kỹ năng
  updateSkill(id: number, skill: Skill): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, skill);
  }
  
  // Xóa kỹ năng
  deleteSkill(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
