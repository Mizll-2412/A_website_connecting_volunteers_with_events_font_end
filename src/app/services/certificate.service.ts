import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  // Cấp chứng nhận cho TNV
  issueCertificate(data: IssueCertificateDto): Observable<any> {
    const formData = new FormData();
    formData.append('maTNV', data.maTNV.toString());
    formData.append('maSuKien', data.maSuKien.toString());
    formData.append('maMau', data.maMau.toString());
    
    return this.http.post<any>(this.apiUrl, formData);
  }

  // Cấp chứng nhận hàng loạt
  issueCertificatesBulk(eventId: number, templateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/events/${eventId}/issue-bulk/${templateId}`, {});
  }

  // Lấy chứng nhận của TNV
  getCertificatesByVolunteer(volunteerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/volunteer/${volunteerId}`);
  }

  // Lấy chứng nhận theo sự kiện
  getCertificatesByEvent(eventId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/event/${eventId}`);
  }

  // Thu hồi chứng nhận
  revokeCertificate(certificateId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${certificateId}`);
  }

  // Lấy thông tin chứng nhận
  getCertificateById(certificateId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${certificateId}`);
  }
}

