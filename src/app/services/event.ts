import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SuKienResponseDto } from '../models/event';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/sukien`; 

  constructor(private http: HttpClient) {}

  getAllSuKien(): Observable<SuKienResponseDto[]> {
    return this.http.get<SuKienResponseDto[]>(`${this.apiUrl}`);
  }
  
  getSuKienById(id: number): Observable<SuKienResponseDto> {
    return this.http.get<SuKienResponseDto>(`${this.apiUrl}/${id}`);
  }

  createSuKien(data: any, anhFile?: File): Observable<any> {
    const formData = new FormData();
    
    // Thêm các trường dữ liệu cơ bản
    formData.append('maToChuc', data.maToChuc.toString());
    formData.append('tenSuKien', data.tenSuKien);
    formData.append('noiDung', data.noiDung);
    
    if (data.diaChi) formData.append('diaChi', data.diaChi);
    if (data.soLuong) formData.append('soLuong', data.soLuong.toString());
    
    if (data.ngayBatDau) formData.append('ngayBatDau', new Date(data.ngayBatDau).toISOString());
    if (data.ngayKetThuc) formData.append('ngayKetThuc', new Date(data.ngayKetThuc).toISOString());
    
    if (data.tuyenBatDau) formData.append('tuyenBatDau', new Date(data.tuyenBatDau).toISOString());
    if (data.tuyenKetThuc) formData.append('tuyenKetThuc', new Date(data.tuyenKetThuc).toISOString());
    
    if (data.trangThai) formData.append('trangThai', data.trangThai);
    
    // Thêm lĩnh vực nếu có
    if (data.linhVucIds && data.linhVucIds.length > 0) {
      data.linhVucIds.forEach((id: number, index: number) => {
        formData.append(`linhVucIds[${index}]`, id.toString());
      });
    }
    
    // Thêm kỹ năng nếu có
    if (data.kyNangIds && data.kyNangIds.length > 0) {
      data.kyNangIds.forEach((id: number, index: number) => {
        formData.append(`kyNangIds[${index}]`, id.toString());
      });
    }
    
    // Thêm file ảnh nếu có
    if (anhFile) {
      formData.append('anhFile', anhFile);
    }
    
    return this.http.post(`${this.apiUrl}`, formData);
  }

  updateSuKien(id: number, data: any, anhFile?: File): Observable<any> {
    const formData = new FormData();
    
    // Thêm các trường dữ liệu cơ bản
    formData.append('tenSuKien', data.tenSuKien);
    formData.append('noiDung', data.noiDung);
    
    if (data.diaChi) formData.append('diaChi', data.diaChi);
    if (data.soLuong) formData.append('soLuong', data.soLuong.toString());
    
    if (data.ngayBatDau) formData.append('ngayBatDau', new Date(data.ngayBatDau).toISOString());
    if (data.ngayKetThuc) formData.append('ngayKetThuc', new Date(data.ngayKetThuc).toISOString());
    
    if (data.tuyenBatDau) formData.append('tuyenBatDau', new Date(data.tuyenBatDau).toISOString());
    if (data.tuyenKetThuc) formData.append('tuyenKetThuc', new Date(data.tuyenKetThuc).toISOString());
    
    if (data.trangThai) formData.append('trangThai', data.trangThai);
    
    // Thêm lĩnh vực nếu có
    if (data.linhVucIds && data.linhVucIds.length > 0) {
      data.linhVucIds.forEach((id: number, index: number) => {
        formData.append(`linhVucIds[${index}]`, id.toString());
      });
    }
    
    // Thêm kỹ năng nếu có
    if (data.kyNangIds && data.kyNangIds.length > 0) {
      data.kyNangIds.forEach((id: number, index: number) => {
        formData.append(`kyNangIds[${index}]`, id.toString());
      });
    }
    
    // Thêm file ảnh nếu có
    if (anhFile) {
      formData.append('anhFile', anhFile);
    }
    
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  deleteSuKien(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  
  // Thêm phương thức lấy sự kiện theo tổ chức
  getEventsByOrganization(organizationId: number): Observable<SuKienResponseDto[]> {
    return this.http.get<SuKienResponseDto[]>(`${this.apiUrl}/organization/${organizationId}`);
  }
  
  // Đổi tên phương thức để khớp với event-management.ts
  getEventsByOrganizationId(organizationId: number): Observable<SuKienResponseDto[]> {
    return this.getEventsByOrganization(organizationId);
  }
}