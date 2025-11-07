import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { Certificate } from '../../models/certificate';
import { environment } from '../../../environments/environment';
// import { saveAs } from 'file-saver';

declare var bootstrap: any;

@Component({
  selector: 'app-certificate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './certificate.html',
  styleUrls: ['./certificate.css']
})
export class CertificateComponent implements OnInit {
  certificates: Certificate[] = [];
  filteredCertificates: Certificate[] = [];
  selectedCertificate: Certificate | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  searchTerm: string = '';
  activeTab: 'all' | 'available' | 'pending' = 'all';
  
  private apiUrl = `${environment.apiUrl}/certificate`;
  private certificateModal: any;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.loadCertificates();
  }
  
  ngAfterViewInit(): void {
    this.certificateModal = new bootstrap.Modal(document.getElementById('certificateModal'));
  }
  
  loadCertificates(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const user = this.authService.getUser();
    
    if (!user || !user.maTaiKhoan) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng.';
      this.isLoading = false;
      return;
    }
    
    // Lấy mã TNV theo mã tài khoản
    this.http.get<any>(`${environment.apiUrl}/tinhnguyenvien/by-account/${user.maTaiKhoan}`).subscribe({
      next: (res) => {
        const volunteer = res?.data || res;
        const maTNV = volunteer?.maTNV;
        if (!maTNV) {
          this.certificates = [];
          this.filterCertificates();
          this.isLoading = false;
          return;
        }

        this.http.get<any>(`${this.apiUrl}/volunteers/${maTNV}`).subscribe({
          next: (response) => {
            this.certificates = response.data || [];
            this.filterCertificates();
            this.isLoading = false;
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Lỗi khi tải danh sách giấy chứng nhận.';
            this.isLoading = false;
            console.error('Error loading certificates:', err);
          }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Không thể xác định hồ sơ tình nguyện viên.';
        this.isLoading = false;
      }
    });
  }
  
  setActiveTab(tab: 'all' | 'available' | 'pending'): void {
    this.activeTab = tab;
    this.filterCertificates();
  }
  
  filterCertificates(): void {
    let filtered = [...this.certificates];
    
    // Lọc theo tab đang chọn
    if (this.activeTab === 'available') {
      filtered = filtered.filter(cert => cert.trangThai === 1);
    } else if (this.activeTab === 'pending') {
      filtered = filtered.filter(cert => cert.trangThai === 0);
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(cert => 
        cert.tenSuKien.toLowerCase().includes(searchTermLower) ||
        cert.tenToChuc.toLowerCase().includes(searchTermLower) ||
        cert.diaDiem.toLowerCase().includes(searchTermLower)
      );
    }
    
    this.filteredCertificates = filtered;
  }
  
  viewCertificate(certificate: Certificate): void {
    this.selectedCertificate = certificate;
    
    // Nếu chưa có URL xem trước, tải từ server
    if (certificate.trangThai === 1 && !certificate.previewUrl) {
      this.http.get(`${this.apiUrl}/${certificate.maChungNhan}/preview`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          certificate.previewUrl = URL.createObjectURL(blob);
          this.certificateModal.show();
        },
        error: (err) => {
          console.error('Error loading certificate preview:', err);
          alert('Không thể tải xem trước giấy chứng nhận.');
        }
      });
    } else {
      this.certificateModal.show();
    }
  }
  
  downloadCertificate(certificate: Certificate): void {
    if (certificate.trangThai !== 1) {
      alert('Chỉ có thể tải xuống giấy chứng nhận đã được phê duyệt.');
      return;
    }
    
    this.http.get(`${this.apiUrl}/${certificate.maChungNhan}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const fileName = `Certificate_${certificate.tenSuKien.replace(/\s+/g, '_')}.pdf`;
        // Thay thế saveAs bằng cách tạo URL và tải xuống thủ công
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Error downloading certificate:', err);
        alert('Không thể tải xuống giấy chứng nhận.');
      }
    });
  }
}
