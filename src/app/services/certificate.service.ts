import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { jsPDF } from 'jspdf';

export interface IssueCertificateDto {
  maTNV: number;
  maSuKien: number;
  maMau: number;
}

export interface CertificateDto {
  maGiayChungNhan: number;
  maTNV: number;
  tenTNV: string;
  maSuKien: number;
  tenSuKien: string;
  maMau: number;
  tenMau: string;
  ngayCap: Date;
  filePath?: string;
}

export interface CertificateSampleDto {
  maMau: number;
  tenMau: string;
  moTa?: string;
  filePath?: string;
  isDefault: boolean;
  ngayGui?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CertificateService {
  private apiUrl = `${environment.apiUrl}/certificate`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách mẫu chứng nhận
  getCertificateSamples(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/samples`);
  }

  // Lấy mẫu chứng nhận theo ID
  getCertificateSampleById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/samples/${id}`);
  }

  // Lấy mẫu chứng nhận theo sự kiện
  getCertificateSamplesByEvent(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/samples/events/${eventId}`);
  }

  // Cấp chứng nhận cho TNV
  issueCertificate(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  // Cấp chứng nhận hàng loạt
  issueAllCertificates(eventId: number, templateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/events/${eventId}/issue-bulk/${templateId}`, {});
  }

  // Lấy chứng nhận của TNV
  getCertificatesByVolunteer(volunteerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/volunteers/${volunteerId}`);
  }

  // Lấy chứng nhận theo sự kiện
  getCertificatesByEvent(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/events/${eventId}`);
  }

  // Thu hồi chứng nhận
  revokeCertificate(certificateId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${certificateId}`);
  }

  // Lấy thông tin chứng nhận
  getCertificateById(certificateId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${certificateId}`);
  }

  // Tạo mẫu chứng nhận mới
  createCertificateSample(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/samples`, formData);
  }

  // Xóa mẫu chứng nhận
  deleteCertificateSample(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/samples/${id}`);
  }

  // Đặt mẫu mặc định
  setDefaultCertificateSample(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/samples/${id}/set-default`, {});
  }

  // Lấy preview chứng nhận
  getCertificatePreview(certificateId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${certificateId}/preview`);
  }

  // Tải chứng nhận (image hoặc PDF)
  downloadCertificate(certificateId: number, format: 'image' | 'pdf' = 'image'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${certificateId}/download?format=${format}`, {
      responseType: 'blob'
    });
  }

  // Lưu cấu hình template
  saveTemplateConfig(templateId: number, config: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/samples/${templateId}/config`, config);
  }

  // Lấy cấu hình template
  getTemplateConfig(templateId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/samples/${templateId}/config`);
  }

  // Upload ảnh nền cho template
  uploadBackgroundImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/upload`, formData);
  }

  // Generate PDF từ CertificateData (dùng Canvas)
  async generatePdfFromCertificateData(certificateId: number): Promise<void> {
    try {
      // Load certificate data
      const response = await firstValueFrom(this.getCertificateById(certificateId));
      const certificateData = response.data || response;
      
      if (!certificateData.certificateData) {
        throw new Error('Chứng nhận chưa có dữ liệu template');
      }

      // Parse CertificateData
      const config = JSON.parse(certificateData.certificateData);
      if (!config.fields || !Array.isArray(config.fields)) {
        throw new Error('Dữ liệu template không hợp lệ');
      }

      // Get dimensions
      const width = certificateData.width || 1200;
      const height = certificateData.height || 800;
      const backgroundImageUrl = certificateData.backgroundImage 
        ? `${environment.baseUrl}/uploads/${certificateData.backgroundImage}`
        : '';

      // Create hidden canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể tạo canvas context');

      // Draw background
      if (backgroundImageUrl) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            resolve();
          };
          img.onerror = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            resolve();
          };
          img.src = backgroundImageUrl;
        });
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw fields
      ctx.textBaseline = 'top';
      config.fields.forEach((field: any) => {
        if (!field.value) return;

        const fontSize = typeof field.fontSize === 'number' ? field.fontSize : parseInt(field.fontSize) || 24;
        const fontFamily = field.fontFamily || 'Arial';
        const fontWeight = field.fontWeight === 'bold' ? 'bold' : 'normal';
        const x = typeof field.x === 'number' ? field.x : parseFloat(field.x) || 0;
        const y = typeof field.y === 'number' ? field.y : parseFloat(field.y) || 0;

        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = field.color || '#000000';
        ctx.textAlign = (field.align || 'center') as CanvasTextAlign;
        ctx.fillText(field.value, x, y);
      });

      // Convert to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      const widthMM = width * 0.264583;
      const heightMM = height * 0.264583;
      
      const pdf = new jsPDF({
        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMM, heightMM]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM, undefined, 'FAST');
      pdf.save(`ChungNhan_${certificateId}.pdf`);
    } catch (error) {
      console.error('Lỗi tạo PDF:', error);
      throw error;
    }
  }
}

