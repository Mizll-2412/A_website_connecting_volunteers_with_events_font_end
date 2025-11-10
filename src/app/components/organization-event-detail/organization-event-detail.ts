import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { RegistrationService } from '../../services/registration';
import { CertificateService } from '../../services/certificate.service';
import { EvaluationService } from '../../services/evaluation.service';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';
import { environment } from '../../../environments/environment';
import { VolunteerProfileViewerComponent } from '../volunteer-profile-viewer/volunteer-profile-viewer';
import { StarRatingComponent } from '../shared/star-rating/star-rating';

interface Registration {
  maTNV: number;
  maTaiKhoan: number;
  maSuKien: number;
  ngayTao: Date;
  trangThai: number;
  trangThaiText?: string;
  ghiChu?: string;
  tenTNV?: string;
  tenSuKien?: string;
  email?: string;
  soDienThoai?: string;
}

interface Evaluation {
  maDanhGia: number;
  maNguoiDanhGia: number;
  tenNguoiDanhGia: string;
  maNguoiDuocDanhGia: number;
  tenNguoiDuocDanhGia: string;
  maSuKien: number;
  tenSuKien: string;
  diemSo: number;
  noiDung?: string;
  ngayTao: Date;
}

interface CertificateSample {
  maMau: number;
  tenMau: string;
  moTa?: string;
  file?: string;
  maSuKien: number;
  previewUrl?: string;
}

@Component({
  selector: 'app-organization-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, VolunteerProfileViewerComponent, StarRatingComponent],
  templateUrl: './organization-event-detail.html',
  styleUrls: ['./organization-event-detail.css']
})
export class OrganizationEventDetailComponent implements OnInit {
  @ViewChild('volunteerViewer') volunteerViewer?: VolunteerProfileViewerComponent;
  @ViewChild('certificatePreviewCanvas') certificatePreviewCanvas?: ElementRef<HTMLCanvasElement>;
  
  eventId: number = 0;
  event: any = null;
  isLoading = true;
  errorMessage = '';
  
  activeTab = 'info'; // info, registrations, evaluations, certificates
  
  // Registrations
  registrations: Registration[] = [];
  filteredRegistrations: Registration[] = [];
  registrationFilter = 'all'; // all, pending, approved, rejected
  
  // Skills and Fields
  skills: any[] = [];
  fields: any[] = [];
  
  // Evaluations
  evaluations: Evaluation[] = [];
  isLoadingEvaluations = false;
  evaluatedVolunteerIds: Set<number> = new Set(); // Track đã đánh giá
  
  // Phân loại đánh giá
  get evaluationsFromOrganization(): Evaluation[] {
    const orgAccountId = this.auth.getUser()?.maTaiKhoan;
    return this.evaluations.filter(e => e.maNguoiDanhGia === orgAccountId);
  }
  
  get evaluationsToOrganization(): Evaluation[] {
    const orgAccountId = this.auth.getUser()?.maTaiKhoan;
    return this.evaluations.filter(e => e.maNguoiDuocDanhGia === orgAccountId);
  }
  
  // Helper để kiểm tra đánh giá cho một registration
  getEvaluationForVolunteer(reg: Registration): { fromOrg: Evaluation | null, toOrg: Evaluation | null } {
    const orgAccountId = this.auth.getUser()?.maTaiKhoan;
    const fromOrg = this.evaluations.find(e => 
      e.maNguoiDanhGia === orgAccountId && e.maNguoiDuocDanhGia === reg.maTaiKhoan
    ) || null;
    const toOrg = this.evaluations.find(e => 
      e.maNguoiDuocDanhGia === orgAccountId && e.maNguoiDanhGia === reg.maTaiKhoan
    ) || null;
    return { fromOrg, toOrg };
  }
  
  // Evaluate volunteer
  selectedVolunteerForEval: any = null;
  showEvaluateModal = false;
  evaluationRating = 5;
  evaluationComment = '';
  
  // Certificates
  certificateSamples: CertificateSample[] = [];
  selectedCertificate: CertificateSample | null = null;
  isLoadingCertificates = false;
  issuedCertificates: any[] = []; // Danh sách chứng nhận đã cấp
  
  // View selected volunteer
  selectedVolunteer: any = null;
  showVolunteerModal = false;
  
  // Select volunteers for certificates
  showSelectVolunteersModal = false;
  selectedVolunteersForCert: Set<number> = new Set();
  selectedTemplateForBulk: number = 0;
  isIssuingCertificates = false;
  
  private apiUrl = environment.apiUrl;
  
  // Getter for approved registrations
  get approvedRegistrations(): Registration[] {
    return this.registrations.filter(r => r.trangThai === 1);
  }
  
  get approvedCount(): number {
    // Đếm số TNV đã duyệt nhưng chưa được cấp chứng nhận
    const approvedTNVs = this.approvedRegistrations.map(r => r.maTNV);
    const issuedTNVs = this.issuedCertificates.map(c => c.maTNV);
    const notIssuedYet = approvedTNVs.filter(maTNV => !issuedTNVs.includes(maTNV));
    return notIssuedYet.length;
  }
  
  get approvedRegistrationsNotIssued(): Registration[] {
    // Lọc ra các TNV đã duyệt nhưng chưa được cấp chứng nhận
    const issuedTNVs = this.issuedCertificates.map(c => c.maTNV);
    return this.approvedRegistrations.filter(r => !issuedTNVs.includes(r.maTNV));
  }
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private certificateService: CertificateService,
    private evaluationService: EvaluationService,
    private skillService: SkillService,
    private fieldService: FieldService
  ) {}
  
  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
    this.route.params.subscribe(params => {
      this.eventId = +params['id'];
      if (this.eventId) {
        this.loadEventDetails();
        this.loadRegistrations();
        this.loadEvaluations(); // Load ngay để hiển thị trạng thái đã đánh giá
      }
    });
  }
  
  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.skills = response.data || response || [];
      },
      error: (err: any) => {
        console.error('Lỗi tải kỹ năng:', err);
      }
    });
  }
  
  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.fields = response.data || response || [];
      },
      error: (err: any) => {
        console.error('Lỗi tải lĩnh vực:', err);
      }
    });
  }
  
  loadEventDetails(): void {
    this.isLoading = true;
    this.eventService.getSuKienById(this.eventId).subscribe({
      next: (response: any) => {
        this.event = response.data || response;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Lỗi tải sự kiện:', err);
        this.errorMessage = 'Không thể tải thông tin sự kiện';
        this.isLoading = false;
      }
    });
  }
  
  loadRegistrations(): void {
    this.http.get<any>(`${this.apiUrl}/dondangky/event/${this.eventId}`).subscribe({
      next: (response) => {
        console.log('Dữ liệu đăng ký:', response);
        this.registrations = response.data || response || [];
        this.applyRegistrationFilter();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách đăng ký:', err);
      }
    });
  }
  
  loadEvaluations(): void {
    this.isLoadingEvaluations = true;
    this.evaluationService.getEvaluationsByEvent(this.eventId).subscribe({
      next: (response: any) => {
        this.evaluations = response.data || response || [];
        
        // Track các TNV đã được đánh giá bởi tổ chức
        const orgAccountId = this.auth.getUser()?.maTaiKhoan;
        if (orgAccountId) {
          this.evaluatedVolunteerIds.clear(); // Clear trước khi thêm mới
          this.evaluations.forEach(evaluation => {
            if (evaluation.maNguoiDanhGia === orgAccountId) {
              // Tổ chức này đã đánh giá TNV nào thì thêm vào set
              this.evaluatedVolunteerIds.add(evaluation.maNguoiDuocDanhGia);
            }
          });
        }
        
        console.log('Đã load đánh giá:', this.evaluations);
        console.log('TNV đã được đánh giá:', Array.from(this.evaluatedVolunteerIds));
        
        this.isLoadingEvaluations = false;
      },
      error: (err: any) => {
        console.error('Lỗi tải đánh giá:', err);
        this.isLoadingEvaluations = false;
      }
    });
  }
  
  loadCertificateSamples(): void {
    if (this.certificateSamples.length > 0) return; // Already loaded
    
    this.isLoadingCertificates = true;
    this.certificateService.getCertificateSamples().subscribe({
      next: (response: any) => {
        const allSamples = response.data || response || [];
        // Filter mẫu theo sự kiện hoặc lấy tất cả mẫu (bao gồm default)
        this.certificateSamples = allSamples.filter((sample: any) => 
          sample.maSuKien === this.eventId || sample.maSuKien === null || sample.isDefault === true
        );
        this.isLoadingCertificates = false;
        
        // Load danh sách chứng nhận đã cấp
        this.loadIssuedCertificates();
      },
      error: (err: any) => {
        console.error('Lỗi tải mẫu chứng nhận:', err);
        this.isLoadingCertificates = false;
      }
    });
  }
  
  loadIssuedCertificates(): void {
    this.certificateService.getCertificatesByEvent(this.eventId).subscribe({
      next: (response: any) => {
        this.issuedCertificates = response.data || response || [];
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách chứng nhận đã cấp:', err);
        this.issuedCertificates = [];
      }
    });
  }
  
  switchTab(tab: string): void {
    this.activeTab = tab;
    
    if (tab === 'certificates' && this.certificateSamples.length === 0) {
      this.loadCertificateSamples();
    }
  }
  
  applyRegistrationFilter(): void {
    if (this.registrationFilter === 'all') {
      this.filteredRegistrations = [...this.registrations];
    } else if (this.registrationFilter === 'pending') {
      this.filteredRegistrations = this.registrations.filter(r => r.trangThai === 0);
    } else if (this.registrationFilter === 'approved') {
      this.filteredRegistrations = this.registrations.filter(r => r.trangThai === 1);
    } else if (this.registrationFilter === 'rejected') {
      this.filteredRegistrations = this.registrations.filter(r => r.trangThai === 2);
    }
  }
  
  getRegistrationStatusText(status: number): string {
    switch (status) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã duyệt';
      case 2: return 'Từ chối';
      default: return 'Không xác định';
    }
  }
  
  getRegistrationStatusClass(status: number): string {
    switch (status) {
      case 0: return 'badge bg-warning';
      case 1: return 'badge bg-success';
      case 2: return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }
  
  approveRegistration(registration: Registration): void {
    if (confirm('Xác nhận duyệt đơn đăng ký này?')) {
      this.registrationService.updateRegistrationStatus(registration.maTNV, registration.maSuKien, { trangThai: 1 }).subscribe({
        next: () => {
          registration.trangThai = 1;
          this.applyRegistrationFilter();
          alert('Đã duyệt đơn đăng ký thành công');
        },
        error: (err: any) => {
          console.error('Lỗi duyệt đơn:', err);
          alert('Không thể duyệt đơn đăng ký');
        }
      });
    }
  }
  
  rejectRegistration(registration: Registration): void {
    const reason = prompt('Lý do từ chối:');
    if (reason !== null) {
      this.registrationService.updateRegistrationStatus(registration.maTNV, registration.maSuKien, { trangThai: 2, ghiChu: reason }).subscribe({
        next: () => {
          registration.trangThai = 2;
          registration.ghiChu = reason;
          this.applyRegistrationFilter();
          alert('Đã từ chối đơn đăng ký');
        },
        error: (err: any) => {
          console.error('Lỗi từ chối đơn:', err);
          alert('Không thể từ chối đơn đăng ký');
        }
      });
    }
  }
  
  viewVolunteerProfile(registration: Registration): void {
    // Gọi method open() của component viewer - component tự quản lý modal của nó
    if (this.volunteerViewer) {
      this.volunteerViewer.open(registration.maTNV);
    }
  }
  
  closeVolunteerModal(): void {
    // Không cần nữa vì component tự quản lý modal
    this.showVolunteerModal = false;
    this.selectedVolunteer = null;
  }
  
  getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) return 'assets/event-default.jpg';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    
    // Đảm bảo path bắt đầu bằng /
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    // Sử dụng baseUrl từ environment (không có /api)
    return `${environment.baseUrl}${normalizedPath}`;
  }
  
  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  }
  
  formatDateTime(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleString('vi-VN');
  }
  
  backToList(): void {
    this.router.navigate(['/manage-org']);
  }
  
  editEvent(): void {
    this.router.navigate(['/su-kien', this.eventId]);
  }
  
  // Certificate methods
  async previewCertificate(sample: CertificateSample): Promise<void> {
    this.selectedCertificate = sample;
    
    // Mở modal
    const modalEl = document.getElementById('certificatePreviewModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
    
    // Lấy template config và render preview
    try {
      const configResponse = await this.certificateService.getTemplateConfig(sample.maMau).toPromise();
      const responseData = configResponse?.data || configResponse;
      
      // Parse templateConfig nếu là string
      let templateConfig: any = null;
      if (responseData?.templateConfig) {
        if (typeof responseData.templateConfig === 'string') {
          try {
            templateConfig = JSON.parse(responseData.templateConfig);
          } catch (e) {
            console.error('Lỗi parse templateConfig:', e);
            templateConfig = null;
          }
        } else {
          templateConfig = responseData.templateConfig;
        }
      }
      
      // Tạo config object với templateConfig đã parse và các thông tin khác
      const config = {
        fields: templateConfig?.fields || [],
        backgroundImage: responseData?.backgroundImage || '',
        width: responseData?.width || 1200,
        height: responseData?.height || 800
      };
      
      if (config.fields && config.fields.length > 0) {
        // Render vào canvas trong modal
        await this.renderCertificatePreviewToCanvas(config, sample);
      } else {
        console.warn('Template config không có fields');
        // Vẫn render background nếu có
        await this.renderCertificatePreviewToCanvas(config, sample);
      }
    } catch (error) {
      console.error('Lỗi tải template config:', error);
      alert('Không thể tải mẫu chứng nhận: ' + (error as any)?.message || 'Đã xảy ra lỗi');
    }
  }
  
  async renderCertificatePreviewToCanvas(config: any, sample: CertificateSample): Promise<void> {
    if (!this.certificatePreviewCanvas) {
      // Đợi một chút để canvas được render
      setTimeout(() => this.renderCertificatePreviewToCanvas(config, sample), 100);
      return;
    }
    
    try {
      const canvas = this.certificatePreviewCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể tạo canvas context');

      const backgroundImageUrl = config.backgroundImage 
        ? `${environment.baseUrl}/uploads/${config.backgroundImage}`
        : '';

      // Load ảnh trước để lấy kích thước gốc
      let imageWidth = config.width || 1200;
      let imageHeight = config.height || 800;
      
      if (backgroundImageUrl) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Lấy kích thước từ ảnh gốc để tránh méo
            imageWidth = img.width;
            imageHeight = img.height;
            
            // Set canvas size đúng với ảnh gốc
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            
            // Vẽ ảnh với kích thước gốc (không ép)
            ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
            
            // Vẽ các fields sau khi vẽ ảnh
            this.drawFieldsToCanvas(ctx, config, imageWidth, imageHeight);
            
            // Set CSS size để hiển thị đúng tỷ lệ (giới hạn max-width)
            const maxDisplayWidth = 800; // Max width để hiển thị trong modal
            if (imageWidth > maxDisplayWidth) {
              const scale = maxDisplayWidth / imageWidth;
              canvas.style.width = `${maxDisplayWidth}px`;
              canvas.style.height = `${imageHeight * scale}px`;
            } else {
              canvas.style.width = `${imageWidth}px`;
              canvas.style.height = `${imageHeight}px`;
            }
            
            resolve();
          };
          img.onerror = () => {
            // Nếu không load được ảnh, dùng kích thước từ config
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, imageWidth, imageHeight);
            
            // Vẽ các fields
            this.drawFieldsToCanvas(ctx, config, imageWidth, imageHeight);
            
            // Set CSS size
            const maxDisplayWidth = 800;
            if (imageWidth > maxDisplayWidth) {
              const scale = maxDisplayWidth / imageWidth;
              canvas.style.width = `${maxDisplayWidth}px`;
              canvas.style.height = `${imageHeight * scale}px`;
            } else {
              canvas.style.width = `${imageWidth}px`;
              canvas.style.height = `${imageHeight}px`;
            }
            
            resolve();
          };
          img.src = backgroundImageUrl;
        });
      } else {
        // Không có ảnh, dùng kích thước từ config
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, imageWidth, imageHeight);
        
        // Vẽ các fields
        this.drawFieldsToCanvas(ctx, config, imageWidth, imageHeight);
        
        // Set CSS size
        const maxDisplayWidth = 800;
        if (imageWidth > maxDisplayWidth) {
          const scale = maxDisplayWidth / imageWidth;
          canvas.style.width = `${maxDisplayWidth}px`;
          canvas.style.height = `${imageHeight * scale}px`;
        } else {
          canvas.style.width = `${imageWidth}px`;
          canvas.style.height = `${imageHeight}px`;
        }
      }

      // Canvas đã được render, không cần tạo previewUrl nữa
    } catch (error) {
      console.error('Lỗi render preview:', error);
      alert('Không thể render mẫu chứng nhận');
    }
  }
  
  closeCertificatePreview(): void {
    this.selectedCertificate = null;
    // Đóng modal Bootstrap nếu có
    const modalEl = document.getElementById('certificatePreviewModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }
    }
  }

  // Vẽ các fields lên canvas
  private drawFieldsToCanvas(ctx: CanvasRenderingContext2D, config: any, canvasWidth: number, canvasHeight: number): void {
    if (!config.fields || !Array.isArray(config.fields) || config.fields.length === 0) {
      return;
    }
    
    ctx.textBaseline = 'top';
    
    // Dữ liệu mẫu tương tự như trong certificate-template-editor
    const sampleData: any = {
      TenTNV: 'Nguyễn Văn A',
      TenSuKien: this.event?.tenSuKien || 'Chiến dịch Mùa Hè Xanh 2024',
      TenToChuc: 'Hội Sinh viên Việt Nam',
      NgayCap: new Date().toLocaleDateString('vi-VN'),
      ThoiGian: this.event?.ngayBatDau && this.event?.ngayKetThuc
        ? `${new Date(this.event.ngayBatDau).toLocaleDateString('vi-VN')} - ${new Date(this.event.ngayKetThuc).toLocaleDateString('vi-VN')}`
        : '15/07/2024 - 30/08/2024',
      DiaChi: this.event?.diaChi || 'Hà Nội',
      SoGioThamGia: '120',
      MaChungNhan: 'CERT-2024-001'
    };
    
    const getFieldValue = (key: string): string => {
      return sampleData[key] || key;
    };
    
    const getFontSize = (field: any): number => {
      if (typeof field.fontSize === 'number') {
        return field.fontSize;
      }
      if (typeof field.fontSize === 'string') {
        const parsed = parseInt(field.fontSize.replace('px', '').trim(), 10);
        return isNaN(parsed) ? 24 : parsed;
      }
      return 24;
    };
    
    config.fields.forEach((field: any) => {
      if (!field || !field.key) return;
      
      const text = getFieldValue(field.key);
      if (!text) return;

      const fontSize = getFontSize(field);
      const fontFamily = field.fontFamily || 'Times New Roman';
      const fontWeight = field.fontWeight === 'bold' ? 'bold' : 'normal';
      const x = typeof field.x === 'number' ? field.x : parseFloat(field.x) || 0;
      const y = typeof field.y === 'number' ? field.y : parseFloat(field.y) || 0;

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = field.color || '#000000';
      ctx.textAlign = (field.align || 'center') as CanvasTextAlign;
      ctx.fillText(text, x, y);
    });
  }
  
  issueCertificateToVolunteer(registration: Registration, sampleId: number): void {
    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Đã kết thúc') {
      alert('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }
    
    if (confirm(`Xác nhận cấp chứng nhận cho ${registration.tenTNV}?`)) {
      const formData = new FormData();
      formData.append('MaMau', sampleId.toString());
      formData.append('MaTNV', registration.maTNV.toString());
      formData.append('MaSuKien', this.eventId.toString());
      
      this.certificateService.issueCertificate(formData).subscribe({
        next: () => {
          alert('Đã cấp chứng nhận thành công');
          // Reload danh sách chứng nhận đã cấp để cập nhật số lượng
          this.loadIssuedCertificates();
        },
        error: (err: any) => {
          console.error('Lỗi cấp chứng nhận:', err);
          alert(err.error?.message || 'Không thể cấp chứng nhận');
        }
      });
    }
  }
  
  issueAllCertificates(sampleId: number): void {
    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Đã kết thúc') {
      alert('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }
    
    const notIssuedCount = this.approvedCount;
    
    if (notIssuedCount === 0) {
      alert('Không có tình nguyện viên nào chưa được cấp chứng nhận');
      return;
    }
    
    if (confirm(`Xác nhận cấp chứng nhận cho ${notIssuedCount} tình nguyện viên chưa được cấp?`)) {
      this.certificateService.issueAllCertificates(this.eventId, sampleId).subscribe({
        next: (response: any) => {
          const count = response.data?.length || 0;
          alert(`Đã cấp chứng nhận thành công cho ${count} tình nguyện viên`);
          // Reload danh sách chứng nhận đã cấp
          this.loadIssuedCertificates();
        },
        error: (err: any) => {
          console.error('Lỗi cấp hàng loạt:', err);
          alert(err.error?.message || 'Không thể cấp chứng nhận hàng loạt');
        }
      });
    }
  }
  
  // Helper methods for displaying event details
  getEventSkills(): any[] {
    if (!this.event) return [];
    if (this.event.kyNangs && Array.isArray(this.event.kyNangs)) {
      return this.event.kyNangs;
    }
    if (this.event.kyNangIds && Array.isArray(this.event.kyNangIds)) {
      return this.event.kyNangIds
        .map((id: number) => this.skills.find(s => s.maKyNang === id))
        .filter((skill: any) => skill != null);
    }
    return [];
  }
  
  getEventFields(): any[] {
    if (!this.event) return [];
    if (this.event.linhVucs && Array.isArray(this.event.linhVucs)) {
      return this.event.linhVucs;
    }
    if (this.event.linhVucIds && Array.isArray(this.event.linhVucIds)) {
      return this.event.linhVucIds
        .map((id: number) => this.fields.find(f => f.maLinhVuc === id))
        .filter((field: any) => field != null);
    }
    return [];
  }
  
  getEventStatusText(): string {
    if (!this.event) return '';
    if (this.event.trangThaiHienThi) return this.event.trangThaiHienThi;
    
    const now = new Date();
    const startDate = new Date(this.event.ngayBatDau);
    const endDate = new Date(this.event.ngayKetThuc);
    const recruitStart = this.event.tuyenBatDau ? new Date(this.event.tuyenBatDau) : null;
    const recruitEnd = this.event.tuyenKetThuc ? new Date(this.event.tuyenKetThuc) : null;
    
    if (endDate < now) {
      return 'Đã kết thúc';
    } else if (startDate <= now && now <= endDate) {
      return 'Đang diễn ra';
    } else if (recruitStart && recruitEnd && recruitStart <= now && now <= recruitEnd) {
      return 'Đang tuyển';
    } else {
      return 'Sắp diễn ra';
    }
  }
  
  getEventStatusClass(): string {
    const status = this.getEventStatusText();
    switch (status) {
      case 'Đang diễn ra': return 'badge bg-success';
      case 'Đang tuyển': return 'badge bg-info';
      case 'Sắp diễn ra': return 'badge bg-warning';
      case 'Đã kết thúc': return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  }
  
  canCompleteEvent(): boolean {
    if (!this.event) return false;
    const status = this.getEventStatusText();
    return status === 'Đã kết thúc' || status === 'Đang diễn ra';
  }
  
  completeEvent(): void {
    if (!this.canCompleteEvent()) {
      alert('Chỉ có thể kết thúc sự kiện khi sự kiện đang diễn ra hoặc đã kết thúc');
      return;
    }
    
    if (confirm('Xác nhận kết thúc sự kiện? Sau khi kết thúc, bạn có thể cấp chứng nhận cho các tình nguyện viên.')) {
      // Gọi endpoint finish đã có sẵn trong backend
      this.http.post(`${this.apiUrl}/sukien/${this.eventId}/finish`, {}).subscribe({
        next: () => {
          alert('Đã kết thúc sự kiện thành công');
          this.loadEventDetails(); // Reload to update status
          this.switchTab('certificates'); // Switch to certificates tab
        },
        error: (err: any) => {
          console.error('Lỗi kết thúc sự kiện:', err);
          alert(err.error?.message || 'Không thể kết thúc sự kiện');
        }
      });
    }
  }
  
  editEventInline(): void {
    // Navigate to edit event page or open edit modal
    this.router.navigate(['/manage-org'], { 
      queryParams: { editEvent: this.eventId } 
    });
  }
  
  openSelectVolunteersModal(sample: CertificateSample): void {
    this.selectedTemplateForBulk = sample.maMau;
    this.selectedVolunteersForCert.clear();
    this.showSelectVolunteersModal = true;
  }
  
  closeSelectVolunteersModal(): void {
    this.showSelectVolunteersModal = false;
    this.selectedVolunteersForCert.clear();
    this.selectedTemplateForBulk = 0;
  }
  
  toggleVolunteerSelection(maTNV: number): void {
    if (this.selectedVolunteersForCert.has(maTNV)) {
      this.selectedVolunteersForCert.delete(maTNV);
    } else {
      this.selectedVolunteersForCert.add(maTNV);
    }
  }
  
  selectAllVolunteers(): void {
    this.approvedRegistrationsNotIssued.forEach(reg => {
      this.selectedVolunteersForCert.add(reg.maTNV);
    });
  }
  
  deselectAllVolunteers(): void {
    this.selectedVolunteersForCert.clear();
  }
  
  async issueSelectedCertificates(): Promise<void> {
    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Đã kết thúc') {
      alert('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }
    
    if (this.selectedVolunteersForCert.size === 0) {
      alert('Vui lòng chọn ít nhất một tình nguyện viên');
      return;
    }
    
    if (!confirm(`Xác nhận cấp chứng nhận cho ${this.selectedVolunteersForCert.size} tình nguyện viên đã chọn?`)) {
      return;
    }
    
    this.isIssuingCertificates = true;
    let successCount = 0;
    let failCount = 0;
    
    // Cấp chứng nhận tuần tự cho từng TNV
    for (const maTNV of Array.from(this.selectedVolunteersForCert)) {
      try {
        const formData = new FormData();
        formData.append('MaMau', this.selectedTemplateForBulk.toString());
        formData.append('MaTNV', maTNV.toString());
        formData.append('MaSuKien', this.eventId.toString());
        
        await this.certificateService.issueCertificate(formData).toPromise();
        successCount++;
      } catch (error) {
        console.error(`Lỗi cấp chứng nhận cho TNV ${maTNV}:`, error);
        failCount++;
      }
    }
    
    this.isIssuingCertificates = false;
    
    // Hiển thị kết quả
    if (failCount === 0) {
      alert(`Đã cấp chứng nhận thành công cho ${successCount} tình nguyện viên`);
    } else {
      alert(`Cấp chứng nhận hoàn tất:\n- Thành công: ${successCount}\n- Thất bại: ${failCount}`);
    }
    
    // Reload và đóng modal
    this.loadIssuedCertificates();
    this.closeSelectVolunteersModal();
  }
  
  async viewIssuedCertificate(cert: any): Promise<void> {
    try {
      // Tạo preview từ certificate data
      const response = await this.certificateService.getCertificateById(cert.maGiayChungNhan).toPromise();
      const certificateData = response?.data || response;
      
      if (certificateData.certificateData) {
        // Parse certificateData (đã có dữ liệu thực tế)
        const filledConfig = JSON.parse(certificateData.certificateData);
        
        // Tạo config object để render
        const config = {
          fields: filledConfig.fields || [],
          backgroundImage: certificateData.backgroundImage || '',
          width: certificateData.width || 1200,
          height: certificateData.height || 800
        };
        
        const previewSample: CertificateSample = {
          maMau: cert.maMau,
          tenMau: cert.tenMau || 'Chứng nhận',
          maSuKien: this.eventId
        };
        
        // Set selectedCertificate và mở modal
        this.selectedCertificate = previewSample;
        
        // Mở modal
        const modalEl = document.getElementById('certificatePreviewModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = new (window as any).bootstrap.Modal(modalEl);
          modal.show();
        }
        
        // Render vào canvas trong modal
        await this.renderIssuedCertificateToCanvas(config, certificateData);
      } else {
        alert('Không thể tải dữ liệu chứng nhận');
      }
    } catch (error) {
      console.error('Lỗi xem chứng nhận:', error);
      alert('Không thể xem chứng nhận: ' + (error as any)?.message || 'Đã xảy ra lỗi');
    }
  }
  
  async renderIssuedCertificateToCanvas(config: any, certData: any): Promise<void> {
    if (!this.certificatePreviewCanvas) {
      // Đợi một chút để canvas được render
      setTimeout(() => this.renderIssuedCertificateToCanvas(config, certData), 100);
      return;
    }
    
    try {
      const canvas = this.certificatePreviewCanvas.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể tạo canvas context');

      const backgroundImageUrl = config.backgroundImage 
        ? `${environment.baseUrl}/uploads/${config.backgroundImage}`
        : '';

      // Load ảnh trước để lấy kích thước gốc
      let imageWidth = config.width || 1200;
      let imageHeight = config.height || 800;
      
      if (backgroundImageUrl) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Lấy kích thước từ ảnh gốc để tránh méo
            imageWidth = img.width;
            imageHeight = img.height;
            
            // Set canvas size đúng với ảnh gốc
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            
            // Vẽ ảnh với kích thước gốc (không ép)
            ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
            
            // Vẽ các fields với dữ liệu thực tế
            this.drawIssuedCertificateFields(ctx, config, imageWidth, imageHeight);
            
            // Set CSS size để hiển thị đúng tỷ lệ (giới hạn max-width)
            const maxDisplayWidth = 800;
            if (imageWidth > maxDisplayWidth) {
              const scale = maxDisplayWidth / imageWidth;
              canvas.style.width = `${maxDisplayWidth}px`;
              canvas.style.height = `${imageHeight * scale}px`;
            } else {
              canvas.style.width = `${imageWidth}px`;
              canvas.style.height = `${imageHeight}px`;
            }
            
            resolve();
          };
          img.onerror = () => {
            // Nếu không load được ảnh, dùng kích thước từ config
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, imageWidth, imageHeight);
            
            // Vẽ các fields
            this.drawIssuedCertificateFields(ctx, config, imageWidth, imageHeight);
            
            // Set CSS size
            const maxDisplayWidth = 800;
            if (imageWidth > maxDisplayWidth) {
              const scale = maxDisplayWidth / imageWidth;
              canvas.style.width = `${maxDisplayWidth}px`;
              canvas.style.height = `${imageHeight * scale}px`;
            } else {
              canvas.style.width = `${imageWidth}px`;
              canvas.style.height = `${imageHeight}px`;
            }
            
            resolve();
          };
          img.src = backgroundImageUrl;
        });
      } else {
        // Không có ảnh, dùng kích thước từ config
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, imageWidth, imageHeight);
        
        // Vẽ các fields
        this.drawIssuedCertificateFields(ctx, config, imageWidth, imageHeight);
        
        // Set CSS size
        const maxDisplayWidth = 800;
        if (imageWidth > maxDisplayWidth) {
          const scale = maxDisplayWidth / imageWidth;
          canvas.style.width = `${maxDisplayWidth}px`;
          canvas.style.height = `${imageHeight * scale}px`;
        } else {
          canvas.style.width = `${imageWidth}px`;
          canvas.style.height = `${imageHeight}px`;
        }
      }
    } catch (error) {
      console.error('Lỗi render chứng nhận đã cấp:', error);
      alert('Không thể render chứng nhận');
    }
  }

  // Vẽ các fields của chứng nhận đã cấp (có dữ liệu thực tế)
  private drawIssuedCertificateFields(ctx: CanvasRenderingContext2D, config: any, canvasWidth: number, canvasHeight: number): void {
    if (!config.fields || !Array.isArray(config.fields) || config.fields.length === 0) {
      return;
    }
    
    ctx.textBaseline = 'top';
    
    const getFontSize = (field: any): number => {
      if (typeof field.fontSize === 'number') {
        return field.fontSize;
      }
      if (typeof field.fontSize === 'string') {
        const parsed = parseInt(field.fontSize.replace('px', '').trim(), 10);
        return isNaN(parsed) ? 24 : parsed;
      }
      return 24;
    };
    
    config.fields.forEach((field: any) => {
      if (!field || !field.value) return;

      const fontSize = getFontSize(field);
      const fontFamily = field.fontFamily || 'Times New Roman';
      const fontWeight = field.fontWeight === 'bold' ? 'bold' : 'normal';
      const x = typeof field.x === 'number' ? field.x : parseFloat(field.x) || 0;
      const y = typeof field.y === 'number' ? field.y : parseFloat(field.y) || 0;

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = field.color || '#000000';
      ctx.textAlign = (field.align || 'center') as CanvasTextAlign;
      ctx.fillText(field.value, x, y);
    });
  }
  
  revokeCertificate(cert: any): void {
    if (!confirm(`Xác nhận thu hồi chứng nhận của ${cert.tenTNV || 'TNV #' + cert.maTNV}?\n\nSau khi thu hồi, bạn có thể cấp lại chứng nhận mới cho tình nguyện viên này.`)) {
      return;
    }
    
    this.certificateService.revokeCertificate(cert.maGiayChungNhan).subscribe({
      next: () => {
        alert('Đã thu hồi chứng nhận thành công');
        // Reload danh sách
        this.loadIssuedCertificates();
      },
      error: (err: any) => {
        console.error('Lỗi thu hồi chứng nhận:', err);
        alert(err.error?.message || 'Không thể thu hồi chứng nhận');
      }
    });
  }
  
  // Evaluate volunteer methods
  canEvaluateVolunteer(registration: Registration): boolean {
    // Chỉ có thể đánh giá nếu:
    // 1. TNV đã được duyệt (trangThai === 1)
    // 2. Sự kiện đã kết thúc
    // 3. Chưa đánh giá TNV này
    if (registration.trangThai !== 1) return false;
    if (this.evaluatedVolunteerIds.has(registration.maTaiKhoan)) return false;
    
    const eventStatus = this.getEventStatusText();
    return eventStatus === 'Đã kết thúc';
  }
  
  openEvaluateVolunteer(registration: Registration): void {
    this.selectedVolunteerForEval = registration;
    this.evaluationRating = 5;
    this.evaluationComment = '';
    this.showEvaluateModal = true;
  }
  
  closeEvaluateModal(): void {
    this.showEvaluateModal = false;
    this.selectedVolunteerForEval = null;
    this.evaluationRating = 5;
    this.evaluationComment = '';
  }
  
  // Xem preview đánh giá
  selectedEvaluationForPreview: Evaluation | null = null;
  evaluationPreviewTitle: string = '';
  showEvaluationPreviewModal = false;
  
  viewEvaluationPreview(evaluation: Evaluation, volunteerName: string, title: string): void {
    this.selectedEvaluationForPreview = evaluation;
    this.evaluationPreviewTitle = title;
    this.showEvaluationPreviewModal = true;
    
    const modalEl = document.getElementById('evaluationPreviewModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }
  
  closeEvaluationPreviewModal(): void {
    this.showEvaluationPreviewModal = false;
    this.selectedEvaluationForPreview = null;
    const modalEl = document.getElementById('evaluationPreviewModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
  }
  
  setEvaluationRating(rating: number): void {
    this.evaluationRating = rating;
  }
  
  submitVolunteerEvaluation(): void {
    if (!this.selectedVolunteerForEval) return;
    
    const orgAccountId = this.auth.getUser()?.maTaiKhoan;
    if (!orgAccountId) {
      alert('Không thể xác định tài khoản tổ chức');
      return;
    }
    
    const evaluation = {
      maNguoiDanhGia: orgAccountId,
      maNguoiDuocDanhGia: this.selectedVolunteerForEval.maTaiKhoan,
      maSuKien: this.eventId,
      diemSo: this.evaluationRating,
      noiDung: this.evaluationComment.trim() || undefined
    };
    
    this.evaluationService.createEvaluation(evaluation).subscribe({
      next: () => {
        alert('Đánh giá tình nguyện viên thành công!');
        
        // Reload evaluations để cập nhật trạng thái
        this.loadEvaluations();
        
        this.closeEvaluateModal();
      },
      error: (err: any) => {
        console.error('Lỗi đánh giá:', err);
        alert(err.error?.message || 'Không thể gửi đánh giá');
      }
    });
  }
}


