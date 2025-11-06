import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToChuc, TrangThaiXacMinh, UpdateToChucDto } from '../../models/organiztion';
import { AuthService } from '../../services/auth';

interface LegalDocument {
  maGiayTo: number;
  maToChuc: number;
  tenFile: string;
  duongDan: string;
  moTa?: string;
  ngayTao: Date;
}

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-profile.html',
  styleUrls: ['./organization-profile.css']
})
export class OrganizationProfileComponent implements OnInit {
  organization: ToChuc | null = null;
  legalDocuments: LegalDocument[] = [];
  selectedLegalDocs: File[] = [];
  legalDocDescription: string = '';
  selectedDocument: LegalDocument | null = null;
  
  // Form data
  tenToChuc: string = '';
  email: string = '';
  soDienThoai: string = '';
  diaChi: string = '';
  gioiThieu: string = '';
  
  // Avatar
  selectedAvatar: File | null = null;
  previewUrl: string | null = null;
  
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadOrganizationInfo();
  }

  loadOrganizationInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (!userInfo) return;

    const user = JSON.parse(userInfo);
    if (user.maTaiKhoan) {
      this.http.get<any>(`${this.apiUrl}/organization/by-account/${user.maTaiKhoan}`).subscribe({
        next: (response) => {
          this.organization = response.data || response;
          this.populateForm();
          this.loadLegalDocuments();
        },
        error: (err) => {
          console.error('Lỗi tải thông tin tổ chức:', err);
        }
      });
    }
  }

  populateForm(): void {
    if (!this.organization) return;
    
    this.tenToChuc = this.organization.tenToChuc || '';
    this.email = this.organization.email || '';
    this.soDienThoai = this.organization.soDienThoai || '';
    this.diaChi = this.organization.diaChi || '';
    this.gioiThieu = this.organization.gioiThieu || '';
    
    if (this.organization.anhDaiDien) {
      this.previewUrl = `http://localhost:5000${this.organization.anhDaiDien}`;
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedAvatar = input.files[0];
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(this.selectedAvatar);
    }
  }

  updateOrganization(): void {
    if (!this.organization?.maToChuc) return;

    const formData = new FormData();
    formData.append('tenToChuc', this.tenToChuc);
    formData.append('email', this.email);
    formData.append('soDienThoai', this.soDienThoai);
    formData.append('diaChi', this.diaChi);
    formData.append('gioiThieu', this.gioiThieu);
    
    if (this.selectedAvatar) {
      formData.append('anhFile', this.selectedAvatar);
    }

    this.http.put<any>(`${this.apiUrl}/organization/${this.organization.maToChuc}`, formData).subscribe({
      next: (response) => {
        alert('Cập nhật thông tin thành công!');
        this.organization = response.data || response;
        this.selectedAvatar = null;
        
        // Cập nhật localStorage và header
        if (this.organization?.anhDaiDien) {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.anhDaiDien = this.organization.anhDaiDien;
            u.profileImage = `http://localhost:5000${this.organization.anhDaiDien}`;
            this.auth.updateUserInfo(u);
          }
        }
      },
      error: (err) => {
        console.error('Lỗi cập nhật:', err);
        const errorMsg = err.normalizedMessage || err.error?.message || 'Có lỗi xảy ra khi cập nhật';
        alert(errorMsg);
      }
    });
  }

  // Giấy tờ pháp lý - sử dụng API cũ
  loadLegalDocuments(): void {
    if (!this.organization?.maToChuc) return;

    this.http.get<any>(`${this.apiUrl}/GiayToPhapLy/tochuc/${this.organization.maToChuc}`).subscribe({
      next: (response) => {
        this.legalDocuments = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi tải giấy tờ pháp lý:', err);
      }
    });
  }

  onLegalDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedLegalDocs = Array.from(input.files);
    }
  }

  uploadLegalDocuments(): void {
    if (!this.organization?.maToChuc || this.selectedLegalDocs.length === 0) {
      alert('Vui lòng chọn ít nhất một tệp');
      return;
    }

    const formData = new FormData();
    formData.append('maToChuc', this.organization.maToChuc.toString());
    this.selectedLegalDocs.forEach(file => {
      formData.append('Files', file);
    });
    
    if (this.legalDocDescription) {
      formData.append('moTa', this.legalDocDescription);
    }

    this.http.post<any>(`${this.apiUrl}/GiayToPhapLy/upload`, formData).subscribe({
      next: (response) => {
        alert('Tải lên giấy tờ pháp lý thành công');
        this.selectedLegalDocs = [];
        this.legalDocDescription = '';
        // Reset input
        const input = document.getElementById('documentFiles') as HTMLInputElement;
        if (input) input.value = '';
        this.loadLegalDocuments();
      },
      error: (err) => {
        console.error('Lỗi tải lên giấy tờ pháp lý:', err);
        const errorMsg = err.normalizedMessage || err.error?.message || 'Đã xảy ra lỗi';
        alert('Lỗi tải lên giấy tờ pháp lý: ' + errorMsg);
      }
    });
  }

  deleteLegalDocument(doc: LegalDocument): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa giấy tờ "${doc.tenFile}"?`)) return;

    this.http.delete<any>(`${this.apiUrl}/GiayToPhapLy/${doc.maGiayTo}`).subscribe({
      next: () => {
        alert('Xóa giấy tờ thành công');
        this.loadLegalDocuments();
      },
      error: (err) => {
        console.error('Lỗi xóa giấy tờ:', err);
        const errorMsg = err.normalizedMessage || err.error?.message || 'Đã xảy ra lỗi';
        alert('Lỗi xóa giấy tờ: ' + errorMsg);
      }
    });
  }

  viewDocument(doc: LegalDocument): void {
    this.selectedDocument = doc;
    const modalEl = document.getElementById('documentPreviewModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  getDocumentUrl(path: string): string {
    if (!path) return '';
    return `http://localhost:5000${path}`;
  }

  getSafeDocumentUrl(path: string): SafeResourceUrl {
    if (!path) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    return this.sanitizer.bypassSecurityTrustResourceUrl(`http://localhost:5000${path}`);
  }

  isImageFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  }

  isPdfFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pdf');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getVerificationStatusText(): string {
    if (!this.organization) return 'Không xác định';
    switch (this.organization.trangThaiXacMinh) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'Chờ duyệt';
      case TrangThaiXacMinh.DaDuyet:
        return 'Đã xác minh';
      case TrangThaiXacMinh.TuChoi:
        return 'Bị từ chối';
      default:
        return 'Không xác định';
    }
  }

  getVerificationStatusClass(): string {
    if (!this.organization) return 'bg-secondary';
    switch (this.organization.trangThaiXacMinh) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'bg-warning';
      case TrangThaiXacMinh.DaDuyet:
        return 'bg-success';
      case TrangThaiXacMinh.TuChoi:
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  requestVerification(): void {
    if (!this.organization?.maToChuc) return;

    if (this.legalDocuments.length === 0) {
      alert('Bạn cần tải lên ít nhất một giấy tờ pháp lý trước khi gửi yêu cầu xác minh');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn gửi yêu cầu xác minh?')) return;

    this.http.post<any>(`${this.apiUrl}/organization/request-verification`, {
      maToChuc: this.organization.maToChuc
    }).subscribe({
      next: (response) => {
        alert('Gửi yêu cầu xác minh thành công! Vui lòng đợi admin xét duyệt.');
        this.loadOrganizationInfo();
      },
      error: (err) => {
        console.error('Lỗi gửi yêu cầu xác minh:', err);
        const errorMsg = err.normalizedMessage || err.error?.message || 'Đã xảy ra lỗi';
        alert('Lỗi: ' + errorMsg);
      }
    });
  }
}

