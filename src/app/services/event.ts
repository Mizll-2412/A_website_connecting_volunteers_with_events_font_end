import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuKienResponseDto } from '../models/event';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/sukien`; 

  constructor(private http: HttpClient) {}

  // Backend đã trả về các trường formatted (ngayBatDauFormatted, etc.)
  // nên không cần transform nữa, chỉ cần trả về data từ backend
  private transformEventDates(event: any): any {
    if (!event || typeof event !== 'object') return event;
    // Trả về event nguyên vẹn, backend đã xử lý formatting
    return event;
  }

  // Format datetime theo local timezone (không convert sang UTC)
  // Backend sẽ nhận và lưu đúng giờ người dùng đã chọn
  private formatDateTimeForBackend(dateInput: any): string {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  getAllSuKien(): Observable<SuKienResponseDto[]> {
    return this.http.get<any>(`${this.apiUrl}`).pipe(
      map((resp: any) => {
        if (resp && Array.isArray(resp.data)) {
          return resp.data.map((e: any) => this.transformEventDates(e));
        }
        if (Array.isArray(resp)) {
          return resp.map((e: any) => this.transformEventDates(e));
        }
        return [];
      })
    );
  }

  getAllEvents(): Observable<SuKienResponseDto[]> {
    return this.getAllSuKien();
  }
  
  getSuKienById(id: number): Observable<SuKienResponseDto> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((resp: any) => {
        const data = resp && resp.data ? resp.data : resp;
        return this.transformEventDates(data);
      })
    );
  }

  createSuKien(data: any, anhFile?: File): Observable<any> {
    const formData = new FormData();
    
    // Thêm các trường dữ liệu cơ bản (required)
    formData.append('maToChuc', (data.maToChuc || 0).toString());
    formData.append('tenSuKien', data.tenSuKien || '');
    formData.append('noiDung', data.noiDung || '');
    
    // Thêm các trường optional
    if (data.diaChi) formData.append('diaChi', data.diaChi);
    if (data.soLuong !== null && data.soLuong !== undefined) {
      formData.append('soLuong', data.soLuong.toString());
    }
    
    // Format datetime theo local timezone (không convert sang UTC)
    if (data.ngayBatDau) formData.append('ngayBatDau', this.formatDateTimeForBackend(data.ngayBatDau));
    if (data.ngayKetThuc) formData.append('ngayKetThuc', this.formatDateTimeForBackend(data.ngayKetThuc));
    
    if (data.tuyenBatDau) formData.append('tuyenBatDau', this.formatDateTimeForBackend(data.tuyenBatDau));
    if (data.tuyenKetThuc) formData.append('tuyenKetThuc', this.formatDateTimeForBackend(data.tuyenKetThuc));
    
    // Thêm 3 field mới: ngayDienRaBatDau, ngayDienRaKetThuc, thoiGianKhoaHuy
    if (data.ngayDienRaBatDau) formData.append('ngayDienRaBatDau', this.formatDateTimeForBackend(data.ngayDienRaBatDau));
    if (data.ngayDienRaKetThuc) formData.append('ngayDienRaKetThuc', this.formatDateTimeForBackend(data.ngayDienRaKetThuc));
    if (data.thoiGianKhoaHuy !== null && data.thoiGianKhoaHuy !== undefined) {
      formData.append('thoiGianKhoaHuy', data.thoiGianKhoaHuy.toString());
    }
    
    if (data.trangThai) formData.append('trangThai', data.trangThai);
    
    // Thêm lĩnh vực nếu có - Thử nhiều format để ASP.NET Core nhận được
    console.log('Create - Checking linhVucIds:', data.linhVucIds, 'Type:', typeof data.linhVucIds, 'IsArray:', Array.isArray(data.linhVucIds));
    if (data.linhVucIds && Array.isArray(data.linhVucIds) && data.linhVucIds.length > 0) {
      console.log('Create - Adding linhVucIds to FormData:', data.linhVucIds);
      // Thử format 1: linhVucIds[0], linhVucIds[1], ...
      data.linhVucIds.forEach((id: number, index: number) => {
        formData.append(`linhVucIds[${index}]`, id.toString());
        // Thử format 2: linhVucIds (nhiều lần với cùng key)
        formData.append('linhVucIds', id.toString());
        console.log(`Create - Added linhVucIds[${index}]:`, id);
      });
    } else {
      console.log('Create - No linhVucIds to send:', data.linhVucIds);
    }
    
    // Thêm kỹ năng nếu có - Thử nhiều format để ASP.NET Core nhận được
    console.log('Create - Checking kyNangIds:', data.kyNangIds, 'Type:', typeof data.kyNangIds, 'IsArray:', Array.isArray(data.kyNangIds));
    if (data.kyNangIds && Array.isArray(data.kyNangIds) && data.kyNangIds.length > 0) {
      console.log('Create - Adding kyNangIds to FormData:', data.kyNangIds);
      // Thử format 1: kyNangIds[0], kyNangIds[1], ...
      data.kyNangIds.forEach((id: number, index: number) => {
        formData.append(`kyNangIds[${index}]`, id.toString());
        // Thử format 2: kyNangIds (nhiều lần với cùng key)
        formData.append('kyNangIds', id.toString());
        console.log(`Create - Added kyNangIds[${index}]:`, id);
      });
    } else {
      console.log('Create - No kyNangIds to send:', data.kyNangIds);
    }
    
    // Thêm file ảnh nếu có
    if (anhFile) {
      formData.append('anhFile', anhFile);
    }
    
    // Debug: Log tất cả keys trong FormData
    console.log('Create - FormData keys:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }
    
    return this.http.post(`${this.apiUrl}`, formData);
  }

  updateSuKien(id: number, data: any, anhFile?: File): Observable<any> {
    const formData = new FormData();
    
    // Thêm các trường dữ liệu cơ bản (required)
    formData.append('tenSuKien', data.tenSuKien || '');
    formData.append('noiDung', data.noiDung || '');
    
    // Thêm các trường optional
    if (data.diaChi) formData.append('diaChi', data.diaChi);
    if (data.soLuong !== null && data.soLuong !== undefined) {
      formData.append('soLuong', data.soLuong.toString());
    }
    
    // Format datetime theo local timezone (không convert sang UTC)
    if (data.ngayBatDau) formData.append('ngayBatDau', this.formatDateTimeForBackend(data.ngayBatDau));
    if (data.ngayKetThuc) formData.append('ngayKetThuc', this.formatDateTimeForBackend(data.ngayKetThuc));
    
    if (data.tuyenBatDau) formData.append('tuyenBatDau', this.formatDateTimeForBackend(data.tuyenBatDau));
    if (data.tuyenKetThuc) formData.append('tuyenKetThuc', this.formatDateTimeForBackend(data.tuyenKetThuc));
    
    // Thêm 3 field mới: ngayDienRaBatDau, ngayDienRaKetThuc, thoiGianKhoaHuy
    if (data.ngayDienRaBatDau) formData.append('ngayDienRaBatDau', this.formatDateTimeForBackend(data.ngayDienRaBatDau));
    if (data.ngayDienRaKetThuc) formData.append('ngayDienRaKetThuc', this.formatDateTimeForBackend(data.ngayDienRaKetThuc));
    if (data.thoiGianKhoaHuy !== null && data.thoiGianKhoaHuy !== undefined) {
      formData.append('thoiGianKhoaHuy', data.thoiGianKhoaHuy.toString());
    }
    
    if (data.trangThai) formData.append('trangThai', data.trangThai);
    
    // Thêm lĩnh vực - Luôn gửi để backend có thể xử lý (kể cả mảng rỗng hoặc null)
    console.log('Update - Checking linhVucIds:', data.linhVucIds, 'Type:', typeof data.linhVucIds, 'IsArray:', Array.isArray(data.linhVucIds));
    const linhVucIdsToSend = (data.linhVucIds && Array.isArray(data.linhVucIds)) ? data.linhVucIds : [];
    if (linhVucIdsToSend.length > 0) {
      console.log('Update - Adding linhVucIds to FormData:', linhVucIdsToSend);
      // Format cho ASP.NET Core: gửi nhiều lần với cùng key (format này ASP.NET Core tự động bind thành mảng)
      linhVucIdsToSend.forEach((id: number) => {
        formData.append('linhVucIds', id.toString());
      });
    } else {
      console.log('Update - linhVucIds is empty, sending empty value to ensure field is present');
      formData.append('linhVucIds', '');
    }
    
    // Thêm kỹ năng - Luôn gửi để backend có thể xử lý (kể cả mảng rỗng hoặc null)
    console.log('Update - Checking kyNangIds:', data.kyNangIds, 'Type:', typeof data.kyNangIds, 'IsArray:', Array.isArray(data.kyNangIds));
    const kyNangIdsToSend = (data.kyNangIds && Array.isArray(data.kyNangIds)) ? data.kyNangIds : [];
    if (kyNangIdsToSend.length > 0) {
      console.log('Update - Adding kyNangIds to FormData:', kyNangIdsToSend);
      // Format cho ASP.NET Core: gửi nhiều lần với cùng key (format này ASP.NET Core tự động bind thành mảng)
      kyNangIdsToSend.forEach((id: number) => {
        formData.append('kyNangIds', id.toString());
      });
    } else {
      // Với mảng rỗng, vẫn gửi một giá trị rỗng để backend nhận diện
      // ASP.NET Core sẽ nhận được mảng rỗng hoặc null tùy vào cách xử lý
      console.log('Update - kyNangIds is empty, sending empty value to ensure field is present');
      // Gửi một giá trị đặc biệt để backend biết là mảng rỗng (không phải null)
      // Hoặc không gửi gì cả và để backend xử lý null
      // Thử gửi với key nhưng không có value, hoặc gửi một giá trị đặc biệt
      formData.append('kyNangIds', '');
    }
    
    // Thêm file ảnh nếu có (file mới)
    if (anhFile) {
      formData.append('anhFile', anhFile);
    } else if (data.hinhAnh) {
      // Nếu không có file mới nhưng có hinhAnh cũ, gửi đường dẫn để backend giữ lại
      formData.append('hinhAnh', data.hinhAnh);
    }
    
    // Debug: Log tất cả keys trong FormData
    console.log('Update - FormData keys:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }
    
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  deleteSuKien(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  finishEvent(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/finish`, {});
  }

  // Đóng phiên tuyển dụng
  closeRecruitment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/close-recruitment`, {});
  }
  
  // Mở lại phiên tuyển dụng
  openRecruitment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/open-recruitment`, {});
  }
  
  // Thêm phương thức lấy sự kiện theo tổ chức
  getEventsByOrganization(organizationId: number): Observable<SuKienResponseDto[]> {
    return this.http.get<any>(`${this.apiUrl}/organization/${organizationId}`).pipe(
      map((resp: any) => {
        if (resp && Array.isArray(resp.data)) {
          return resp.data.map((e: any) => this.transformEventDates(e));
        }
        if (Array.isArray(resp)) {
          return resp.map((e: any) => this.transformEventDates(e));
        }
        return [];
      })
    );
  }
  
  // Đổi tên phương thức để khớp với event-management.ts
  getEventsByOrganizationId(organizationId: number): Observable<SuKienResponseDto[]> {
    return this.getEventsByOrganization(organizationId);
  }
}