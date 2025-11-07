import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToChuc, TrangThaiXacMinh } from '../../models/organiztion';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';

interface LegalDocument {
  maGiayTo: number;
  maToChuc: number;
  tenGiayTo?: string; // Tên giấy tờ từ API
  tenFile?: string; // Tên file (backward compatibility)
  file?: string; // Đường dẫn file từ API
  duongDan?: string; // Đường dẫn (backward compatibility)
  moTa?: string;
  ngayTao: Date | string;
}

@Component({
  selector: 'app-organization-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-verification.html',
  styleUrls: ['./organization-verification.css']
})
export class OrganizationVerification implements OnInit {
  organization: ToChuc | null = null;
  legalDocuments: LegalDocument[] = [];
  selectedLegalDocs: File[] = [];
  legalDocDescription: string = '';
  legalDocName: string = ''; // Tên giấy tờ pháp lý
  selectedDocument: LegalDocument | null = null;
  isRequestingVerification = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadOrganizationInfo();
    this.loadLegalDocuments();
  }

  loadOrganizationInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (!userInfo) return;

    const user = JSON.parse(userInfo);
    if (user.maTaiKhoan) {
      this.http.get<any>(`${this.apiUrl}/organization/by-account/${user.maTaiKhoan}`).subscribe({
        next: (response) => {
          this.organization = response.data || response;
        },
        error: (err) => {
          console.error('Lỗi tải thông tin tổ chức:', err);
        }
      });
    }
  }

  loadLegalDocuments(): void {
    if (!this.organization?.maToChuc) {
      const userInfo = localStorage.getItem('user');
      if (!userInfo) return;

      const user = JSON.parse(userInfo);
      if (user.maTaiKhoan) {
        this.http.get<any>(`${this.apiUrl}/organization/by-account/${user.maTaiKhoan}`).subscribe({
          next: (response) => {
            const org = response.data || response;
            if (org?.maToChuc) {
              this.fetchLegalDocuments(org.maToChuc);
            }
          }
        });
      }
    } else {
      this.fetchLegalDocuments(this.organization.maToChuc);
    }
  }

  fetchLegalDocuments(maToChuc: number): void {
    this.http.get<any>(`${this.apiUrl}/GiayToPhapLy/tochuc/${maToChuc}`).subscribe({
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
      
      // Tự động điền tên giấy tờ từ tên file đầu tiên (chỉ khi chưa có giá trị)
      if (this.selectedLegalDocs.length > 0 && (!this.legalDocName || this.legalDocName.trim() === '')) {
        const fileName = this.selectedLegalDocs[0].name;
        // Bỏ phần mở rộng file
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        this.legalDocName = nameWithoutExt;
      }
    }
  }

  uploadLegalDocuments(): void {
    if (!this.organization?.maToChuc || this.selectedLegalDocs.length === 0) return;

    const formData = new FormData();
    formData.append('maToChuc', this.organization.maToChuc.toString());
    
    // Tên giấy tờ: lấy từ input hoặc dùng tên file đầu tiên
    const tenGiayTo = this.legalDocName?.trim() || 
                      (this.selectedLegalDocs.length > 0 ? this.selectedLegalDocs[0].name.replace(/\.[^/.]+$/, '') : 'Giấy tờ pháp lý');
    formData.append('TenGiayTo', tenGiayTo);
    
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
        this.legalDocName = '';
        this.loadLegalDocuments();
      },
      error: (err) => {
        console.error('Lỗi tải lên giấy tờ pháp lý:', err);
        alert('Lỗi tải lên giấy tờ pháp lý: ' + (err.error?.message || 'Đã xảy ra lỗi'));
      }
    });
  }

  requestVerification(): void {
    if (!this.organization?.maToChuc) return;
    
    this.isRequestingVerification = true;
    
    const requestData = {
      maToChuc: this.organization.maToChuc
    };
    
    this.http.post<any>(`${this.apiUrl}/organization/request-verification`, requestData).subscribe({
      next: (response) => {
        alert('Yêu cầu xác minh đã được gửi thành công');
        this.loadOrganizationInfo(); // Tải lại thông tin tổ chức để cập nhật trạng thái
        this.isRequestingVerification = false;
      },
      error: (err) => {
        console.error('Lỗi gửi yêu cầu xác minh:', err);
        alert('Lỗi gửi yêu cầu xác minh: ' + (err.error?.message || 'Đã xảy ra lỗi'));
        this.isRequestingVerification = false;
      }
    });
  }

  viewDocument(document: LegalDocument): void {
    this.selectedDocument = document;
    // Mở modal (cần thêm code để mở modal Bootstrap)
    // Ví dụ: $('#documentModal').modal('show');
  }

  deleteDocument(document: LegalDocument): void {
    if (confirm('Bạn có chắc chắn muốn xóa giấy tờ này không?')) {
      this.http.delete<any>(`${this.apiUrl}/GiayToPhapLy/${document.maGiayTo}`).subscribe({
        next: () => {
          alert('Xóa giấy tờ pháp lý thành công');
          this.loadLegalDocuments();
        },
        error: (err) => {
          console.error('Lỗi xóa giấy tờ pháp lý:', err);
          alert('Lỗi xóa giấy tờ pháp lý: ' + (err.error?.message || 'Đã xảy ra lỗi'));
        }
      });
    }
  }

  getDocumentFileName(doc: LegalDocument | null | undefined): string {
    // Lấy tên file từ đường dẫn
    if (!doc) return 'Không có tên';
    if (doc.file) {
      const parts = doc.file.split('/');
      return parts[parts.length - 1] || 'Không có tên';
    }
    if (doc.duongDan) {
      const parts = doc.duongDan.split('/');
      return parts[parts.length - 1] || 'Không có tên';
    }
    return doc.tenFile || 'Không có tên';
  }

  getDocumentUrl(doc: LegalDocument | null | undefined): string {
    if (!doc) return '';
    if (doc.file) {
      return getImageUrl(doc.file);
    }
    if (doc.duongDan) {
      return getImageUrl(doc.duongDan);
    }
    return '';
  }

  isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }

  isImageFile(fileName: string): boolean {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getVerificationStatusText(): string {
    if (!this.organization) return 'Chưa xác minh';
    
    switch (this.organization.trangThaiXacMinh) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'Chưa xác minh';
      case TrangThaiXacMinh.DaDuyet:
        return 'Đã xác minh';
      case TrangThaiXacMinh.TuChoi:
        return 'Đã từ chối';
      default:
        return 'Đang chờ xác minh';
    }
  }

  getVerificationBadgeClass(): string {
    if (!this.organization) return 'badge-unverified';
    
    switch (this.organization.trangThaiXacMinh) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'badge-unverified';
      case TrangThaiXacMinh.DaDuyet:
        return 'badge-verified';
      case TrangThaiXacMinh.TuChoi:
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  }

  getRequestButtonText(): string {
    if (!this.organization) return 'Yêu cầu xác minh';
    
    switch (this.organization.trangThaiXacMinh) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'Yêu cầu xác minh';
      case TrangThaiXacMinh.DaDuyet:
        return 'Đã xác minh';
      case TrangThaiXacMinh.TuChoi:
        return 'Yêu cầu xác minh lại';
      default:
        return 'Đang chờ xác minh';
    }
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }
}
