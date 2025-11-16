import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToChuc, TrangThaiXacMinh, UpdateToChucDto } from '../../models/organiztion';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

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
  legalDocName: string = ''; // Tên giấy tờ pháp lý
  selectedDocument: LegalDocument | null = null;
  isSaving: boolean = false;
  
  // Form data
  tenToChuc: string = '';
  email: string = '';
  soDienThoai: string = '';
  diaChi: string = '';
  gioiThieu: string = '';
  
  // Avatar
  selectedAvatar: File | null = null;
  previewUrl: string | null = null;
  
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private sanitizer: DomSanitizer,
    private toastService: ToastService,
    private confirm: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadOrganizationInfo();
  }

  loadOrganizationInfo(): void {
    // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
    const user = this.auth.getUser();
    if (!user || !user.maTaiKhoan) return;

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
      this.previewUrl = getImageUrl(this.organization.anhDaiDien);
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

  // Validation methods
  validateTenToChuc(): string {
    if (!this.tenToChuc || this.tenToChuc.trim() === '') {
      return 'Tên tổ chức là bắt buộc';
    }
    if (this.tenToChuc.trim().length < 2) {
      return 'Tên tổ chức phải có ít nhất 2 ký tự';
    }
    if (this.tenToChuc.length > 200) {
      return 'Tên tổ chức không được vượt quá 200 ký tự';
    }
    return '';
  }

  validateEmail(): string {
    if (!this.email || this.email.trim() === '') {
      return 'Email là bắt buộc';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      return 'Email không hợp lệ. Ví dụ: example@domain.com';
    }
    return '';
  }

  validateSoDienThoai(): string {
    // Bắt buộc nhập
    if (!this.soDienThoai || this.soDienThoai.trim() === '') {
      return 'Số điện thoại là bắt buộc';
    }
    // Kiểm tra format
    const phonePattern = /^(0|\+84)[3-9]\d{8}$/;
    if (!phonePattern.test(this.soDienThoai)) {
      return 'Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678';
    }
    return '';
  }

  validateDiaChi(): string {
    if (this.diaChi && this.diaChi.length > 200) {
      return 'Địa chỉ không được vượt quá 200 ký tự';
    }
    return '';
  }

  validateGioiThieu(): string {
    if (this.gioiThieu && this.gioiThieu.length > 1000) {
      return 'Giới thiệu không được vượt quá 1000 ký tự';
    }
    return '';
  }

  isFormValid(): boolean {
    return !this.validateTenToChuc() && 
           !this.validateEmail() && 
           !this.validateSoDienThoai() && 
           !this.validateDiaChi() && 
           !this.validateGioiThieu();
  }

  updateOrganization(): void {
    if (!this.organization?.maToChuc) return;

    // Validate form
    const tenToChucError = this.validateTenToChuc();
    const emailError = this.validateEmail();
    const soDienThoaiError = this.validateSoDienThoai();
    const diaChiError = this.validateDiaChi();
    const gioiThieuError = this.validateGioiThieu();

    if (tenToChucError || emailError || soDienThoaiError || diaChiError || gioiThieuError) {
      const errors = [tenToChucError, emailError, soDienThoaiError, diaChiError, gioiThieuError]
        .filter(e => e !== '');
      this.toastService.warning(errors[0] || 'Vui lòng kiểm tra lại thông tin');
      
      // Scroll đến field đầu tiên có lỗi
      if (tenToChucError) {
        const element = document.querySelector('[name="tenToChuc"]');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      } else if (emailError) {
        const element = document.querySelector('[name="email"]');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }
      return;
    }

    const formData = new FormData();
    formData.append('tenToChuc', this.tenToChuc.trim());
    formData.append('email', this.email.trim());
    formData.append('soDienThoai', this.soDienThoai.trim());
    formData.append('diaChi', this.diaChi.trim());
    formData.append('gioiThieu', this.gioiThieu.trim());
    
    if (this.selectedAvatar) {
      formData.append('anhFile', this.selectedAvatar);
    }

    this.isSaving = true;
    // Lưu lại trạng thái xác minh hiện tại (phòng trường hợp API update không trả về)
    const prevStatus = this.organization?.trangThaiXacMinh;
    this.http.put<any>(`${this.apiUrl}/organization/${this.organization.maToChuc}`, formData).subscribe({
      next: (response) => {
        this.toastService.success('Cập nhật thông tin thành công!');
        this.organization = response.data || response;
        // Nếu response không trả về trạng thái xác minh, giữ nguyên trạng thái cũ
        if ((this.organization as any)?.trangThaiXacMinh === undefined || (this.organization as any)?.trangThaiXacMinh === null) {
          if (prevStatus !== undefined && prevStatus !== null) {
            (this.organization as any).trangThaiXacMinh = prevStatus;
          }
        }
        this.selectedAvatar = null;
        this.isSaving = false;
        
        // Cập nhật user info (sử dụng authService để tự động lưu vào đúng nơi)
        const u = this.auth.getUser();
        if (u) {
          if (this.organization?.anhDaiDien) {
            u.anhDaiDien = this.organization.anhDaiDien;
            u.profileImage = getImageUrl(this.organization.anhDaiDien);
          }
          // Đồng bộ hiển thị tên: header đọc user.hoTen nên set = tên tổ chức
          if (this.organization?.tenToChuc) {
            u.hoTen = this.organization.tenToChuc;
          }
          this.auth.updateUserInfo(u);
        }
      },
      error: (err) => {
        const errorMsg = err.normalizedMessage || err.error?.message || 'Có lỗi xảy ra khi cập nhật';
        console.error('Lỗi cập nhật hồ sơ tổ chức:', {
          message: errorMsg,
          status: err.status,
          statusText: err.statusText,
          error: err.error,
          fullError: err
        });
        this.toastService.error(errorMsg);
        this.isSaving = false;
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
    if (!this.organization?.maToChuc || this.selectedLegalDocs.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một tệp');
      return;
    }

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
        this.toastService.success('Tải lên giấy tờ pháp lý thành công');
        this.selectedLegalDocs = [];
        this.legalDocDescription = '';
        this.legalDocName = '';
        // Reset input
        const input = document.getElementById('documentFiles') as HTMLInputElement;
        if (input) input.value = '';
        this.loadLegalDocuments();
      },
      error: (err) => {
        console.error('Lỗi tải lên giấy tờ pháp lý:', err);
        const errorMsg = err.normalizedMessage || err.error?.message || 'Đã xảy ra lỗi';
        this.toastService.error('Lỗi tải lên giấy tờ pháp lý: ' + errorMsg);
      }
    });
  }

  deleteLegalDocument(doc: LegalDocument): void {
    const docName = doc.tenGiayTo || this.getDocumentFileName(doc);
    this.confirm.confirm(`Bạn có chắc chắn muốn xóa giấy tờ "${docName}"?`, { variant: 'danger', okText: 'Xóa' }).then(confirmed => {
      if (!confirmed) return;

      this.http.delete<any>(`${this.apiUrl}/GiayToPhapLy/${doc.maGiayTo}`).subscribe({
        next: () => {
          this.toastService.success('Xóa giấy tờ thành công');
          this.loadLegalDocuments();
        },
        error: (err) => {
          console.error('Lỗi xóa giấy tờ:', err);
          const errorMsg = err.normalizedMessage || err.error?.message || 'Đã xảy ra lỗi';
          this.toastService.error('Lỗi xóa giấy tờ: ' + errorMsg);
        }
      });
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
    return getImageUrl(path);
  }

  getSafeDocumentUrl(path: string): SafeResourceUrl {
    if (!path) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    return this.sanitizer.bypassSecurityTrustResourceUrl(getImageUrl(path));
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

  getDocumentUrlForDoc(doc: LegalDocument | null | undefined): string {
    if (!doc) return '';
    if (doc.file) {
      return getImageUrl(doc.file);
    }
    if (doc.duongDan) {
      return getImageUrl(doc.duongDan);
    }
    return '';
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
    if (this.organization.trangThaiXacMinh === null) {
      return 'Chưa xác minh';
    }
    switch (this.organization.trangThaiXacMinh) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'Chờ duyệt';
      case TrangThaiXacMinh.DaDuyet:
        return 'Đã xác minh';
      case TrangThaiXacMinh.TuChoi:
        return 'Bị từ chối';
      case TrangThaiXacMinh.ThuHoi:
        return 'Đã thu hồi';
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
      case TrangThaiXacMinh.ThuHoi:
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  requestVerification(): void {
    if (!this.organization?.maToChuc) return;

    if (this.legalDocuments.length === 0) {
      this.toastService.warning('Bạn cần tải lên ít nhất một giấy tờ pháp lý trước khi gửi yêu cầu xác minh');
      return;
    }

    this.confirm.confirm('Bạn có chắc chắn muốn gửi yêu cầu xác minh?', { okText: 'Gửi', cancelText: 'Hủy' }).then(confirmed => {
      if (!confirmed) return;

      this.http.post<any>(`${this.apiUrl}/organization/request-verification`, {
        maToChuc: this.organization?.maToChuc as number
      }).subscribe({
        next: (response) => {
          this.toastService.success('Gửi yêu cầu xác minh thành công! Vui lòng đợi admin xét duyệt.');
          this.loadOrganizationInfo();
        },
        error: (err) => {
          console.error('Lỗi gửi yêu cầu xác minh:', err);
          const errorMsg = err.normalizedMessage || err.error?.message || 'Đã xảy ra lỗi';
          this.toastService.error('Lỗi: ' + errorMsg);
        }
      });
    });
  }
}

