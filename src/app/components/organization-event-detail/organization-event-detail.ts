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
import { ToastService } from '../../services/toast.service';
import { PaginationComponent } from '../shared/pagination/pagination';
import { formatDateTime, formatDateOnly } from '../../utils/date-format.util';
import { EventFormModalComponent, EventFormData } from '../shared/event-form-modal/event-form-modal';

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
  filePath?: string;
  templateConfig?: string;
  backgroundImage?: string;
  maSuKien?: number | null;
  isDefault?: boolean;
  previewUrl?: string;
  width?: number;
  height?: number;
}

export type TabType = 'info' | 'registrations' | 'evaluations' | 'certificates';

@Component({
  selector: 'app-organization-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, VolunteerProfileViewerComponent, StarRatingComponent, PaginationComponent, EventFormModalComponent],
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
  
  activeTab: TabType = 'info' as TabType;
  
  // Registrations
  registrations: Registration[] = [];
  filteredRegistrations: Registration[] = [];
  registrationFilter = 'all'; // all, pending, approved, rejected
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
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
  selectedVolunteersForCert: Set<number> = new Set(); // Set of maTNV
  selectedCertificateTemplate: number | null = null; // Mẫu chứng nhận đã chọn
  isIssuingCertificates = false;
  
  // Bulk evaluation
  selectedVolunteersForBulkEvaluation: Set<number> = new Set();
  showBulkEvaluateModal = false;
  bulkEvaluationRating = 5;
  bulkEvaluationComment = '';
  isSubmittingBulkEvaluation = false;
  
  // Bulk registration actions
  selectedRegistrationsForBulkAction: Set<number> = new Set(); // Set of maTNV
  isProcessingBulkAction = false;
  
  // Event edit modal
  showEventModal = false;
  isEditingEvent = false;
  eventFormData: EventFormData | null = null;
  
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
    private fieldService: FieldService,
    private toastService: ToastService
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
    if (!this.eventId) {
      console.error('EventId chưa được khởi tạo');
      this.isLoadingCertificates = false;
      return;
    }
    
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
        this.toastService.error('Không thể tải mẫu chứng nhận. Vui lòng thử lại.');
        this.certificateSamples = [];
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
  
  switchTab(tab: TabType): void {
    this.activeTab = tab;
    
    // Load dữ liệu khi switch sang tab certificates
    if (tab === 'certificates') {
      // Clear selection khi switch sang tab certificates để đảm bảo bắt đầu từ đầu
      this.selectedCertificateTemplate = null;
      this.selectedVolunteersForCert.clear();
      this.loadCertificateSamples();
      this.loadRegistrations(); // Load để có danh sách approvedRegistrationsNotIssued
    }
    
    // Load dữ liệu khi switch sang tab evaluations
    if (tab === 'evaluations') {
      this.loadEvaluations();
      this.loadRegistrations();
    }
  }
  
  // Helper methods for template
  isInfoTab(): boolean {
    return this.activeTab === 'info';
  }
  
  isRegistrationsTab(): boolean {
    return this.activeTab === 'registrations';
  }
  
  isEvaluationsTab(): boolean {
    return this.activeTab === 'evaluations';
  }
  
  isCertificatesTab(): boolean {
    return this.activeTab === 'certificates';
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
    this.currentPage = 1; // Reset về trang đầu khi filter
  }

  get paginatedRegistrations(): Registration[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredRegistrations.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
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
      case 0: return 'bg-warning-subtle';
      case 1: return 'bg-success-subtle';
      case 2: return 'bg-danger-subtle';
      default: return 'bg-secondary';
    }
  }
  
  approveRegistration(registration: Registration): void {
    // Kiểm tra số lượng trước khi duyệt
    const soLuongDaDuyet = this.event?.soLuongDaDuyet || 0;
    const soLuong = this.event?.soLuong || 0;
    
    let confirmMessage = 'Xác nhận duyệt đơn đăng ký này?';
    
    // Cảnh báo nếu sắp đủ số lượng
    if (soLuong > 0) {
      const soLuongConLai = soLuong - soLuongDaDuyet;
      if (soLuongConLai === 1) {
        confirmMessage = `⚠️ CẢNH BÁO: Đây là tình nguyện viên cuối cùng!\n\nSố lượng hiện tại: ${soLuongDaDuyet}/${soLuong}\nSau khi duyệt sẽ đủ số lượng tuyển.\n\nXác nhận duyệt?`;
      } else if (soLuongConLai <= 3) {
        confirmMessage = `⚠️ Chú ý: Còn ${soLuongConLai} vị trí trống\n\nSố lượng hiện tại: ${soLuongDaDuyet}/${soLuong}\n\nXác nhận duyệt đơn này?`;
      }
    }
    
    if (confirm(confirmMessage)) {
      this.registrationService.updateRegistrationStatus(registration.maTNV, registration.maSuKien, { trangThai: 1 }).subscribe({
        next: () => {
          // Reload lại danh sách từ API để đảm bảo dữ liệu đồng bộ
          this.loadRegistrations();
          this.toastService.success('Đã duyệt đơn đăng ký thành công');
        },
        error: (err: any) => {
          console.error('Lỗi duyệt đơn:', err);
          // Hiển thị thông báo lỗi chi tiết từ backend
          const errorMessage = err.error?.message || 'Không thể duyệt đơn đăng ký';
          this.toastService.error(errorMessage);
        }
      });
    }
  }
  
  rejectRegistration(registration: Registration): void {
    // Check if this is an approved registration being rejected
    if (registration.trangThai === 1) {
      // Open modal for rejection reason (required for approved registrations)
      this.openRejectModal(registration);
    } else {
      // For pending registrations, use simple prompt
      const reason = prompt('Lý do từ chối (tùy chọn):');
      if (reason !== null) {
        this.registrationService.updateRegistrationStatus(registration.maTNV, registration.maSuKien, { trangThai: 2, ghiChu: reason || undefined }).subscribe({
          next: () => {
            this.loadRegistrations();
            this.toastService.success('Đã từ chối đơn đăng ký');
          },
          error: (err: any) => {
            console.error('Lỗi từ chối đơn:', err);
            const errorMessage = err.error?.message || 'Không thể từ chối đơn đăng ký';
            this.toastService.error(errorMessage);
          }
        });
      }
    }
  }

  undoApproval(registration: Registration): void {
    if (confirm('Xác nhận hoàn tác duyệt đơn này? Đơn sẽ chuyển về trạng thái chờ duyệt.')) {
      this.registrationService.updateRegistrationStatus(registration.maTNV, registration.maSuKien, { trangThai: 0 }).subscribe({
        next: () => {
          this.loadRegistrations();
          this.toastService.success('Đã hoàn tác duyệt thành công');
        },
        error: (err: any) => {
          console.error('Lỗi hoàn tác duyệt:', err);
          const errorMessage = err.error?.message || 'Không thể hoàn tác duyệt';
          this.toastService.error(errorMessage);
        }
      });
    }
  }

  // Bulk registration actions
  toggleRegistrationForBulkAction(maTNV: number): void {
    if (this.selectedRegistrationsForBulkAction.has(maTNV)) {
      this.selectedRegistrationsForBulkAction.delete(maTNV);
    } else {
      this.selectedRegistrationsForBulkAction.add(maTNV);
    }
  }

  selectAllRegistrationsForBulkAction(): void {
    this.paginatedRegistrations.forEach(reg => {
      this.selectedRegistrationsForBulkAction.add(reg.maTNV);
    });
  }

  deselectAllRegistrationsForBulkAction(): void {
    this.selectedRegistrationsForBulkAction.clear();
  }

  areAllRegistrationsSelected(): boolean {
    if (this.paginatedRegistrations.length === 0) return false;
    return this.paginatedRegistrations.every(reg => this.selectedRegistrationsForBulkAction.has(reg.maTNV));
  }

  toggleSelectAllRegistrations(): void {
    if (this.areAllRegistrationsSelected()) {
      this.deselectAllRegistrationsForBulkAction();
    } else {
      this.selectAllRegistrationsForBulkAction();
    }
  }

  getSelectedRegistrations(): Registration[] {
    return this.registrations.filter(reg => this.selectedRegistrationsForBulkAction.has(reg.maTNV));
  }

  bulkApproveRegistrations(): void {
    const selected = this.getSelectedRegistrations();
    if (selected.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một đơn đăng ký');
      return;
    }

    const pendingRegistrations = selected.filter(reg => reg.trangThai === 0);
    if (pendingRegistrations.length === 0) {
      this.toastService.warning('Không có đơn nào ở trạng thái chờ duyệt');
      return;
    }

    if (!confirm(`Xác nhận duyệt ${pendingRegistrations.length} đơn đăng ký?`)) {
      return;
    }

    this.isProcessingBulkAction = true;
    let successCount = 0;
    let failCount = 0;

    pendingRegistrations.forEach(reg => {
      this.registrationService.updateRegistrationStatus(reg.maTNV, reg.maSuKien, { trangThai: 1 }).subscribe({
        next: () => {
          successCount++;
          if (successCount + failCount === pendingRegistrations.length) {
            this.isProcessingBulkAction = false;
            this.loadRegistrations();
            this.selectedRegistrationsForBulkAction.clear();
            if (failCount === 0) {
              this.toastService.success(`Đã duyệt thành công ${successCount} đơn đăng ký`);
            } else {
              this.toastService.warning(`Duyệt hoàn tất: Thành công ${successCount}, Thất bại ${failCount}`);
            }
          }
        },
        error: (err: any) => {
          failCount++;
          console.error(`Lỗi duyệt đơn ${reg.maTNV}:`, err);
          if (successCount + failCount === pendingRegistrations.length) {
            this.isProcessingBulkAction = false;
            this.loadRegistrations();
            this.selectedRegistrationsForBulkAction.clear();
            this.toastService.warning(`Duyệt hoàn tất: Thành công ${successCount}, Thất bại ${failCount}`);
          }
        }
      });
    });
  }

  bulkRejectRegistrations(): void {
    const selected = this.getSelectedRegistrations();
    if (selected.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một đơn đăng ký');
      return;
    }

    const reason = prompt('Lý do từ chối (tùy chọn):');
    if (reason === null) return; // User cancelled

    this.isProcessingBulkAction = true;
    let successCount = 0;
    let failCount = 0;

    selected.forEach(reg => {
      this.registrationService.updateRegistrationStatus(reg.maTNV, reg.maSuKien, { trangThai: 2, ghiChu: reason || undefined }).subscribe({
        next: () => {
          successCount++;
          if (successCount + failCount === selected.length) {
            this.isProcessingBulkAction = false;
            this.loadRegistrations();
            this.selectedRegistrationsForBulkAction.clear();
            if (failCount === 0) {
              this.toastService.success(`Đã từ chối thành công ${successCount} đơn đăng ký`);
            } else {
              this.toastService.warning(`Từ chối hoàn tất: Thành công ${successCount}, Thất bại ${failCount}`);
            }
          }
        },
        error: (err: any) => {
          failCount++;
          console.error(`Lỗi từ chối đơn ${reg.maTNV}:`, err);
          if (successCount + failCount === selected.length) {
            this.isProcessingBulkAction = false;
            this.loadRegistrations();
            this.selectedRegistrationsForBulkAction.clear();
            this.toastService.warning(`Từ chối hoàn tất: Thành công ${successCount}, Thất bại ${failCount}`);
          }
        }
      });
    });
  }

  bulkUndoApprovals(): void {
    const selected = this.getSelectedRegistrations();
    if (selected.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một đơn đăng ký');
      return;
    }

    const approvedRegistrations = selected.filter(reg => reg.trangThai === 1);
    if (approvedRegistrations.length === 0) {
      this.toastService.warning('Không có đơn nào ở trạng thái đã duyệt');
      return;
    }

    if (!confirm(`Xác nhận hoàn tác duyệt ${approvedRegistrations.length} đơn đăng ký?`)) {
      return;
    }

    this.isProcessingBulkAction = true;
    let successCount = 0;
    let failCount = 0;

    approvedRegistrations.forEach(reg => {
      this.registrationService.updateRegistrationStatus(reg.maTNV, reg.maSuKien, { trangThai: 0 }).subscribe({
        next: () => {
          successCount++;
          if (successCount + failCount === approvedRegistrations.length) {
            this.isProcessingBulkAction = false;
            this.loadRegistrations();
            this.selectedRegistrationsForBulkAction.clear();
            if (failCount === 0) {
              this.toastService.success(`Đã hoàn tác duyệt thành công ${successCount} đơn đăng ký`);
            } else {
              this.toastService.warning(`Hoàn tác hoàn tất: Thành công ${successCount}, Thất bại ${failCount}`);
            }
          }
        },
        error: (err: any) => {
          failCount++;
          console.error(`Lỗi hoàn tác duyệt đơn ${reg.maTNV}:`, err);
          if (successCount + failCount === approvedRegistrations.length) {
            this.isProcessingBulkAction = false;
            this.loadRegistrations();
            this.selectedRegistrationsForBulkAction.clear();
            this.toastService.warning(`Hoàn tác hoàn tất: Thành công ${successCount}, Thất bại ${failCount}`);
          }
        }
      });
    });
  }

  // Reject modal for approved registrations
  rejectingRegistration: Registration | null = null;
  rejectReason: string = '';

  openRejectModal(registration: Registration): void {
    this.rejectingRegistration = registration;
    this.rejectReason = '';
    const modalEl = document.getElementById('rejectApprovedModal');
    if ((window as any).bootstrap && modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  closeRejectModal(): void {
    const modalEl = document.getElementById('rejectApprovedModal');
    if ((window as any).bootstrap && modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    this.rejectingRegistration = null;
    this.rejectReason = '';
  }

  confirmRejectApproved(): void {
    if (!this.rejectingRegistration) return;
    if (!this.rejectReason || this.rejectReason.trim() === '') {
      this.toastService.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    this.registrationService.updateRegistrationStatus(
      this.rejectingRegistration.maTNV,
      this.rejectingRegistration.maSuKien,
      { trangThai: 2, ghiChu: this.rejectReason.trim() }
    ).subscribe({
      next: () => {
        this.closeRejectModal();
        this.loadRegistrations();
        this.toastService.success('Đã từ chối đơn đăng ký đã duyệt');
      },
      error: (err: any) => {
        console.error('Lỗi từ chối đơn đã duyệt:', err);
        const errorMessage = err.error?.message || 'Không thể từ chối đơn đăng ký';
        this.toastService.error(errorMessage);
      }
    });
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
    // Sử dụng utility function thống nhất
    return formatDateTime(date);
        }
  
  formatDateTime(date: any): string {
    // Sử dụng utility function thống nhất
    return formatDateTime(date);
  }
  
  formatDateTimeOld(date: any): string {
    if (!date) return '';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('vi-VN');
    } catch {
      return '';
    }
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
      this.toastService.error('Không thể tải mẫu chứng nhận: ' + ((error as any)?.message || 'Đã xảy ra lỗi'));
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
      this.toastService.error('Không thể render mẫu chứng nhận');
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
    // Kiểm tra mẫu có thể cấp được không
    const sample = this.certificateSamples.find(s => s.maMau === sampleId);
    if (!this.canIssueCertificate(sample)) {
      this.toastService.error('Mẫu chứng nhận chưa có template config hoặc file. Vui lòng tạo template config hoặc upload file cho mẫu này trước khi cấp chứng nhận.');
      return;
    }

    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Sự kiện đã kết thúc' && eventStatus !== 'Đã kết thúc') {
      this.toastService.warning('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }
    
    if (confirm(`Xác nhận cấp chứng nhận cho ${registration.tenTNV}?`)) {
      const formData = new FormData();
      formData.append('MaMau', sampleId.toString());
      formData.append('MaTNV', registration.maTNV.toString());
      formData.append('MaSuKien', this.eventId.toString());
      
      this.certificateService.issueCertificate(formData).subscribe({
        next: () => {
          this.toastService.success('Đã cấp chứng nhận thành công');
          // Reload danh sách chứng nhận đã cấp để cập nhật số lượng
          this.loadIssuedCertificates();
          this.loadRegistrations();
        },
        error: (err: any) => {
          console.error('Lỗi cấp chứng nhận:', err);
          this.toastService.error(err.error?.message || 'Không thể cấp chứng nhận');
        }
      });
    }
  }
  
  issueAllCertificates(sampleId: number): void {
    // Kiểm tra mẫu có thể cấp được không
    const sample = this.certificateSamples.find(s => s.maMau === sampleId);
    if (!this.canIssueCertificate(sample)) {
      this.toastService.error('Mẫu chứng nhận chưa có template config hoặc file. Vui lòng tạo template config hoặc upload file cho mẫu này trước khi cấp chứng nhận.');
      return;
    }

    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Sự kiện đã kết thúc' && eventStatus !== 'Đã kết thúc') {
      this.toastService.warning('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }
    
    const notIssuedCount = this.approvedCount;
    
    if (notIssuedCount === 0) {
      this.toastService.info('Không có tình nguyện viên nào chưa được cấp chứng nhận');
      return;
    }
    
    if (confirm(`Xác nhận cấp chứng nhận cho ${notIssuedCount} tình nguyện viên chưa được cấp?`)) {
      this.certificateService.issueAllCertificates(this.eventId, sampleId).subscribe({
        next: (response: any) => {
          const count = response.data?.length || 0;
          this.toastService.success(`Đã cấp chứng nhận thành công cho ${count} tình nguyện viên`);
          // Reload danh sách chứng nhận đã cấp
          this.loadIssuedCertificates();
          this.loadRegistrations();
        },
        error: (err: any) => {
          console.error('Lỗi cấp hàng loạt:', err);
          this.toastService.error(err.error?.message || 'Không thể cấp chứng nhận hàng loạt');
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
  
  isEventEnded(): boolean {
    if (!this.event) return false;
    
    const now = new Date();
    const endDate = this.event.ngayKetThuc ? new Date(this.event.ngayKetThuc) : null;
    
    // Kiểm tra nếu sự kiện đã kết thúc
    if (endDate && endDate < now) {
      return true;
    }
    
    // Kiểm tra trạng thái
    const status = this.getEventStatusText();
    return status === 'Sự kiện đã kết thúc' || status === 'Đã kết thúc';
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
      return 'Sự kiện đã kết thúc';
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
      case 'Sự kiện đã kết thúc':
      case 'Đã kết thúc': return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  }

  // Helper methods for metrics
  getTotalRegistrations(): number {
    return this.registrations.length;
  }

  getApprovedRegistrationsCount(): number {
    return this.approvedRegistrations.length;
  }

  getPendingRegistrationsCount(): number {
    return this.registrations.filter(r => r.trangThai === 0).length;
  }

  getRejectedRegistrationsCount(): number {
    return this.registrations.filter(r => r.trangThai === 2).length;
  }

  getRequiredSlots(): number {
    return this.event?.soLuong || 0;
  }

  getRemainingSlots(): number {
    const required = this.getRequiredSlots();
    const approved = this.getApprovedRegistrationsCount();
    return Math.max(0, required - approved);
  }

  formatDateOnly(date: any): string {
    if (!date) return '';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  }
  
  canCompleteEvent(): boolean {
    if (!this.event) return false;
    const status = this.getEventStatusText();
    // Chỉ cho phép kết thúc khi đang diễn ra, không cho phép khi đã kết thúc
    return status === 'Đang diễn ra';
  }
  
  completeEvent(): void {
    if (!this.canCompleteEvent()) {
      this.toastService.warning('Chỉ có thể kết thúc sự kiện khi sự kiện đang diễn ra hoặc đã kết thúc');
      return;
    }
    
    if (confirm('Xác nhận kết thúc sự kiện? Sau khi kết thúc, bạn có thể cấp chứng nhận cho các tình nguyện viên.')) {
      // Gọi endpoint finish đã có sẵn trong backend
      this.http.post(`${this.apiUrl}/sukien/${this.eventId}/finish`, {}).subscribe({
        next: () => {
          this.toastService.success('Đã kết thúc sự kiện thành công');
          this.loadEventDetails(); // Reload to update status
          this.switchTab('certificates'); // Switch to certificates tab
        },
        error: (err: any) => {
          console.error('Lỗi kết thúc sự kiện:', err);
          this.toastService.error(err.error?.message || 'Không thể kết thúc sự kiện');
        }
      });
    }
  }

  canCloseRecruitment(): boolean {
    if (!this.event) return false;
    
    // 1. Sự kiện chưa kết thúc
    if (this.event.trangThaiSuKien === 'Đã kết thúc') return false;
    
    // 2. Phiên tuyển chưa đóng
    if (this.event.trangThaiTuyen === 'Đóng') return false;
    
    // 3. Đã tới thời gian tuyển (kiểm tra tuyenBatDau và tuyenKetThuc)
    if (!this.event.tuyenBatDau || !this.event.tuyenKetThuc) return false;
    
    const now = new Date();
    const recruitStart = new Date(this.event.tuyenBatDau);
    const recruitEnd = new Date(this.event.tuyenKetThuc);
    
    // Chỉ cho phép đóng khi đang trong thời gian tuyển
    return now >= recruitStart && now <= recruitEnd;
  }

  closeRecruitment(): void {
    if (!this.canCloseRecruitment()) {
      this.toastService.warning('Không thể đóng phiên tuyển');
      return;
    }
    
    if (confirm('Xác nhận đóng phiên tuyển? Sau khi đóng, tình nguyện viên sẽ không thể đăng ký thêm.')) {
      this.eventService.closeRecruitment(this.eventId).subscribe({
        next: () => {
          this.toastService.success('Đã đóng phiên tuyển thành công');
          this.loadEventDetails(); // Reload to update status
        },
        error: (err: any) => {
          console.error('Lỗi đóng phiên tuyển:', err);
          this.toastService.error(err.error?.message || 'Không thể đóng phiên tuyển');
        }
      });
    }
  }
  
  canReopenRecruitment(): boolean {
    if (!this.event) return false;
    
    // 1. Sự kiện chưa kết thúc
    if (this.event.trangThaiSuKien === 'Đã kết thúc') return false;
    
    // 2. Phiên tuyển đã đóng
    if (this.event.trangThaiTuyen !== 'Đóng') return false;
    
    // 3. Đã tới thời gian tuyển (kiểm tra tuyenBatDau và tuyenKetThuc)
    if (!this.event.tuyenBatDau || !this.event.tuyenKetThuc) return false;
    
    const now = new Date();
    const recruitStart = new Date(this.event.tuyenBatDau);
    const recruitEnd = new Date(this.event.tuyenKetThuc);
    
    // Chỉ cho phép mở lại khi vẫn còn trong thời gian tuyển
    return now >= recruitStart && now <= recruitEnd;
  }
  
  reopenRecruitment(): void {
    if (!this.canReopenRecruitment()) {
      this.toastService.warning('Không thể mở lại phiên tuyển. Vui lòng kiểm tra lại thời gian tuyển dụng.');
      return;
    }
    
    if (confirm('Xác nhận mở lại phiên tuyển? Sau khi mở lại, tình nguyện viên có thể đăng ký thêm.')) {
      this.eventService.openRecruitment(this.eventId).subscribe({
        next: () => {
          this.toastService.success('Đã mở lại phiên tuyển thành công');
          this.loadEventDetails(); // Reload to update status
        },
        error: (err: any) => {
          console.error('Lỗi mở lại phiên tuyển:', err);
          this.toastService.error(err.error?.message || 'Không thể mở lại phiên tuyển');
        }
      });
    }
  }
  
  editEventInline(): void {
    // Load đầy đủ dữ liệu từ API và mở modal chỉnh sửa
    if (!this.eventId) {
      this.toastService.error('Không tìm thấy ID sự kiện');
      return;
    }

    this.eventService.getSuKienById(this.eventId).subscribe({
      next: (response: any) => {
        const fullEvent = response.data || response;
        
        // Chuẩn bị dữ liệu cho modal
        this.eventFormData = {
          maSuKien: fullEvent.maSuKien,
          tenSuKien: fullEvent.tenSuKien || '',
          noiDung: fullEvent.noiDung || '',
          ngayBatDau: fullEvent.ngayBatDau,
          ngayKetThuc: fullEvent.ngayKetThuc,
          tuyenBatDau: fullEvent.tuyenBatDau,
          tuyenKetThuc: fullEvent.tuyenKetThuc,
          ngayDienRaBatDau: fullEvent.ngayDienRaBatDau,
          ngayDienRaKetThuc: fullEvent.ngayDienRaKetThuc,
          thoiGianKhoaHuy: fullEvent.thoiGianKhoaHuy,
          diaChi: fullEvent.diaChi || '',
          soLuong: fullEvent.soLuong || fullEvent.soLuongTNV || 1,
          maToChuc: fullEvent.maToChuc,
          hinhAnh: fullEvent.hinhAnh,
          linhVucIds: Array.isArray(fullEvent.linhVucIds) && fullEvent.linhVucIds.length > 0 
            ? fullEvent.linhVucIds 
            : (fullEvent.linhVucs && Array.isArray(fullEvent.linhVucs) 
              ? fullEvent.linhVucs.map((lv: any) => lv.maLinhVuc || lv.maLinhVucId)
              : []),
          kyNangIds: Array.isArray(fullEvent.kyNangIds) && fullEvent.kyNangIds.length > 0 
            ? fullEvent.kyNangIds 
            : (fullEvent.kyNangs && Array.isArray(fullEvent.kyNangs) 
              ? fullEvent.kyNangs.map((kn: any) => kn.maKyNang || kn.maKyNangId)
              : [])
        };
        
        this.isEditingEvent = true;
        this.showEventModal = true;
      },
      error: (err: any) => {
        console.error('Lỗi khi load chi tiết sự kiện:', err);
        this.toastService.error('Không thể tải thông tin sự kiện. Vui lòng thử lại.');
      }
    });
  }
  
  onEventModalSaved(): void {
    // Reload dữ liệu sự kiện sau khi cập nhật thành công
    this.loadEventDetails();
    this.showEventModal = false;
    this.isEditingEvent = false;
    this.eventFormData = null;
  }
  
  onEventModalCancelled(): void {
    // Đóng modal khi user cancel
    this.showEventModal = false;
    this.isEditingEvent = false;
    this.eventFormData = null;
  }
  
  openSelectVolunteersModal(sample: CertificateSample): void {
    this.selectedCertificateTemplate = sample.maMau;
    this.selectedVolunteersForCert.clear();
    this.showSelectVolunteersModal = true;
  }
  
  closeSelectVolunteersModal(): void {
    this.showSelectVolunteersModal = false;
    this.selectedVolunteersForCert.clear();
    this.selectedCertificateTemplate = null;
  }
  
  toggleVolunteerSelection(maTNV: number): void {
    if (this.selectedVolunteersForCert.has(maTNV)) {
      this.selectedVolunteersForCert.delete(maTNV);
    } else {
      this.selectedVolunteersForCert.add(maTNV);
    }
  }

  toggleVolunteerSelectionForCert(maTNV: number): void {
    this.toggleVolunteerSelection(maTNV);
  }
  
  selectAllVolunteersForCert(): void {
    this.approvedRegistrationsNotIssued.forEach(reg => {
      this.selectedVolunteersForCert.add(reg.maTNV);
    });
  }
  
  deselectAllVolunteersForCert(): void {
    this.selectedVolunteersForCert.clear();
  }

  // Giữ lại các phương thức cũ để tương thích với modal
  selectAllVolunteers(): void {
    this.selectAllVolunteersForCert();
  }
  
  deselectAllVolunteers(): void {
    this.deselectAllVolunteersForCert();
  }

  areAllVolunteersForCertSelected(): boolean {
    if (this.approvedRegistrationsNotIssued.length === 0) return false;
    return this.approvedRegistrationsNotIssued.every(reg => this.selectedVolunteersForCert.has(reg.maTNV));
  }

  toggleSelectAllVolunteersForCert(): void {
    if (this.areAllVolunteersForCertSelected()) {
      this.deselectAllVolunteersForCert();
    } else {
      this.selectAllVolunteersForCert();
    }
  }

  getSelectedCertificateSample(): CertificateSample | null {
    if (!this.selectedCertificateTemplate) return null;
    return this.certificateSamples.find(s => s.maMau === this.selectedCertificateTemplate) || null;
  }

  canIssueCertificate(sample?: CertificateSample | null): boolean {
    if (!sample) {
      sample = this.getSelectedCertificateSample();
    }
    if (!sample) return false;
    
    // Kiểm tra mẫu có TemplateConfig (mẫu động) hoặc File (mẫu tĩnh)
    const hasTemplateConfig: boolean = !!(sample.templateConfig && sample.templateConfig.trim() !== '');
    const hasFileFromFile: boolean = !!(sample.file && sample.file.trim() !== '');
    const hasFileFromPath: boolean = !!(sample.filePath && sample.filePath.trim() !== '');
    const hasFile: boolean = hasFileFromFile || hasFileFromPath;
    
    return hasTemplateConfig || hasFile;
  }

  onCertificateTemplateChange(value: number | null): void {
    // Kiểm tra nếu chọn option đầu tiên (null)
    if (value === null || value === undefined) {
      // Clear selection và ẩn danh sách TNV
      this.selectedCertificateTemplate = null;
      this.selectedVolunteersForCert.clear();
      return;
    }
    
    // Nếu chọn mẫu mới (khác với mẫu hiện tại), clear selection cũ
    if (value !== this.selectedCertificateTemplate) {
      this.selectedVolunteersForCert.clear();
    }
    
    // Set mẫu mới
    this.selectedCertificateTemplate = value;
  }
  
  async bulkIssueCertificates(): Promise<void> {
    if (!this.selectedCertificateTemplate) {
      this.toastService.warning('Vui lòng chọn mẫu chứng nhận');
      return;
    }

    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Sự kiện đã kết thúc' && eventStatus !== 'Đã kết thúc') {
      this.toastService.warning('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }

    const selectedSample = this.getSelectedCertificateSample();
    if (!this.canIssueCertificate(selectedSample)) {
      this.toastService.error('Mẫu chứng nhận chưa có template config hoặc file. Vui lòng tạo template config hoặc upload file cho mẫu này trước khi cấp chứng nhận.');
      return;
    }
    
    if (this.selectedVolunteersForCert.size === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một tình nguyện viên');
      return;
    }
    
    if (!confirm(`Xác nhận cấp chứng nhận cho ${this.selectedVolunteersForCert.size} tình nguyện viên đã chọn?`)) {
      return;
    }
    
    this.isIssuingCertificates = true;
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    // Cấp chứng nhận tuần tự cho từng TNV
    for (const maTNV of Array.from(this.selectedVolunteersForCert)) {
      try {
        const formData = new FormData();
        formData.append('MaMau', this.selectedCertificateTemplate.toString());
        formData.append('MaTNV', maTNV.toString());
        formData.append('MaSuKien', this.eventId.toString());
        
        await this.certificateService.issueCertificate(formData).toPromise();
        successCount++;
      } catch (error: any) {
        console.error(`Lỗi cấp chứng nhận cho TNV ${maTNV}:`, error);
        failCount++;
        const errorMessage = error.error?.message || error.message || 'Không thể cấp chứng nhận';
        if (!errors.includes(errorMessage)) {
          errors.push(errorMessage);
        }
      }
    }
    
    this.isIssuingCertificates = false;
    
    // Hiển thị kết quả
    if (failCount === 0) {
      this.toastService.success(`Đã cấp chứng nhận thành công cho ${successCount} tình nguyện viên`);
    } else {
      const errorMsg = errors.length > 0 ? `\nLỗi: ${errors.join(', ')}` : '';
      this.toastService.warning(`Cấp chứng nhận hoàn tất:\n- Thành công: ${successCount}\n- Thất bại: ${failCount}${errorMsg}`);
    }
    
    // Reload và clear selection
    this.loadIssuedCertificates();
    this.loadRegistrations(); // Reload để cập nhật danh sách
    this.selectedVolunteersForCert.clear();
  }

  async issueCertificateToVolunteerSingle(reg: Registration): Promise<void> {
    if (!this.selectedCertificateTemplate) {
      this.toastService.warning('Vui lòng chọn mẫu chứng nhận');
      return;
    }

    // Kiểm tra sự kiện đã kết thúc chưa
    const eventStatus = this.getEventStatusText();
    if (eventStatus !== 'Sự kiện đã kết thúc' && eventStatus !== 'Đã kết thúc') {
      this.toastService.warning('Chỉ có thể cấp chứng nhận khi sự kiện đã kết thúc');
      return;
    }

    const selectedSample = this.getSelectedCertificateSample();
    if (!this.canIssueCertificate(selectedSample)) {
      this.toastService.error('Mẫu chứng nhận chưa có template config hoặc file. Vui lòng tạo template config hoặc upload file cho mẫu này trước khi cấp chứng nhận.');
      return;
    }
    
    if (!confirm(`Xác nhận cấp chứng nhận cho ${reg.tenTNV || 'tình nguyện viên này'}?`)) {
      return;
    }
    
    this.isIssuingCertificates = true;
    try {
      const formData = new FormData();
      formData.append('MaMau', this.selectedCertificateTemplate.toString());
      formData.append('MaTNV', reg.maTNV.toString());
      formData.append('MaSuKien', this.eventId.toString());
      
      await this.certificateService.issueCertificate(formData).toPromise();
      this.toastService.success('Đã cấp chứng nhận thành công');
      
      // Reload
      this.loadIssuedCertificates();
      this.loadRegistrations();
    } catch (error: any) {
      console.error('Lỗi cấp chứng nhận:', error);
      this.toastService.error(error.error?.message || 'Không thể cấp chứng nhận');
    } finally {
      this.isIssuingCertificates = false;
    }
  }
  
  // Giữ lại phương thức cũ để tương thích với modal
  async issueSelectedCertificates(): Promise<void> {
    if (!this.selectedCertificateTemplate) {
      this.toastService.warning('Vui lòng chọn mẫu chứng nhận');
      return;
    }
    
    await this.bulkIssueCertificates();
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
        this.toastService.error('Không thể tải dữ liệu chứng nhận');
      }
    } catch (error) {
      console.error('Lỗi xem chứng nhận:', error);
      this.toastService.error('Không thể xem chứng nhận: ' + ((error as any)?.message || 'Đã xảy ra lỗi'));
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
      this.toastService.error('Không thể render chứng nhận');
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
        this.toastService.success('Đã thu hồi chứng nhận thành công');
        // Reload danh sách
        this.loadIssuedCertificates();
      },
      error: (err: any) => {
        console.error('Lỗi thu hồi chứng nhận:', err);
        this.toastService.error(err.error?.message || 'Không thể thu hồi chứng nhận');
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
    return eventStatus === 'Sự kiện đã kết thúc' || eventStatus === 'Đã kết thúc';
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
      this.toastService.error('Không thể xác định tài khoản tổ chức');
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
        this.toastService.success('Đánh giá tình nguyện viên thành công!');
        
        // Reload evaluations để cập nhật trạng thái
        this.loadEvaluations();
        
        this.closeEvaluateModal();
      },
      error: (err: any) => {
        console.error('Lỗi đánh giá:', err);
        this.toastService.error(err.error?.message || 'Không thể gửi đánh giá');
      }
    });
  }

  // Bulk evaluation methods
  getSelectableVolunteersForBulkEvaluation(): Registration[] {
    return this.registrations.filter(reg => this.canEvaluateVolunteer(reg));
  }

  getSelectedVolunteersForBulkEvaluation(): number[] {
    return Array.from(this.selectedVolunteersForBulkEvaluation);
  }

  toggleVolunteerForBulkEvaluation(maTNV: number): void {
    if (this.selectedVolunteersForBulkEvaluation.has(maTNV)) {
      this.selectedVolunteersForBulkEvaluation.delete(maTNV);
    } else {
      this.selectedVolunteersForBulkEvaluation.add(maTNV);
    }
  }

  selectAllVolunteersForBulkEvaluation(): void {
    const selectable = this.getSelectableVolunteersForBulkEvaluation();
    selectable.forEach(reg => {
      this.selectedVolunteersForBulkEvaluation.add(reg.maTNV);
    });
  }

  selectAllApprovedVolunteersForBulkEvaluation(): void {
    // Chọn tất cả TNV đã duyệt và chưa được đánh giá
    this.approvedRegistrations.forEach(reg => {
      // Chỉ thêm vào nếu chưa được đánh giá
      if (!this.getEvaluationForVolunteer(reg).fromOrg) {
        this.selectedVolunteersForBulkEvaluation.add(reg.maTNV);
      }
    });
  }

  deselectAllVolunteersForBulkEvaluation(): void {
    this.selectedVolunteersForBulkEvaluation.clear();
  }

  areAllSelectableVolunteersSelected(): boolean {
    // Kiểm tra xem tất cả TNV đã duyệt và chưa được đánh giá có được chọn không
    const selectableApproved = this.approvedRegistrations.filter(reg => !this.getEvaluationForVolunteer(reg).fromOrg);
    if (selectableApproved.length === 0) return false;
    return selectableApproved.every(reg => this.selectedVolunteersForBulkEvaluation.has(reg.maTNV));
  }

  toggleSelectAllVolunteersForBulkEvaluation(): void {
    if (this.areAllSelectableVolunteersSelected()) {
      this.deselectAllVolunteersForBulkEvaluation();
    } else {
      this.selectAllApprovedVolunteersForBulkEvaluation();
    }
  }

  openBulkEvaluateModal(): void {
    if (this.selectedVolunteersForBulkEvaluation.size === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một tình nguyện viên');
      return;
    }
    
    // Kiểm tra và lọc lại danh sách để chỉ giữ những TNV có thể đánh giá được
    const selectableTNVs = Array.from(this.selectedVolunteersForBulkEvaluation).filter(maTNV => {
      const reg = this.approvedRegistrations.find(r => r.maTNV === maTNV);
      return reg && reg.trangThai === 1 && !this.getEvaluationForVolunteer(reg).fromOrg;
    });
    
    if (selectableTNVs.length === 0) {
      this.toastService.warning('Không có tình nguyện viên nào có thể được đánh giá. Vui lòng chọn các tình nguyện viên đã được duyệt và chưa được đánh giá.');
      return;
    }
    
    // Cập nhật lại selection với danh sách đã lọc
    this.selectedVolunteersForBulkEvaluation.clear();
    selectableTNVs.forEach(maTNV => {
      this.selectedVolunteersForBulkEvaluation.add(maTNV);
    });
    
    this.bulkEvaluationRating = 5;
    this.bulkEvaluationComment = '';
    this.showBulkEvaluateModal = true;
  }

  closeBulkEvaluateModal(): void {
    this.showBulkEvaluateModal = false;
    this.bulkEvaluationRating = 5;
    this.bulkEvaluationComment = '';
  }

  setBulkEvaluationRating(rating: number): void {
    this.bulkEvaluationRating = rating;
  }

  submitBulkEvaluation(): void {
    if (this.selectedVolunteersForBulkEvaluation.size === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một tình nguyện viên');
      return;
    }

    if (!this.eventId) {
      this.toastService.error('Không tìm thấy sự kiện');
      return;
    }

    const maTNVs = Array.from(this.selectedVolunteersForBulkEvaluation);
    
    this.isSubmittingBulkEvaluation = true;
    
    this.evaluationService.bulkEvaluate(
      this.eventId,
      maTNVs,
      this.bulkEvaluationRating,
      this.bulkEvaluationComment
    ).subscribe({
      next: (response: any) => {
        const count = response.data?.length || response.count || maTNVs.length;
        this.toastService.success(`Đã đánh giá thành công ${count} tình nguyện viên!`);
        
        // Reload evaluations và registrations để cập nhật trạng thái
        this.loadEvaluations();
        this.loadRegistrations();
        
        // Clear selection
        this.selectedVolunteersForBulkEvaluation.clear();
        
        this.closeBulkEvaluateModal();
        this.isSubmittingBulkEvaluation = false;
      },
      error: (err: any) => {
        console.error('Lỗi đánh giá hàng loạt:', err);
        this.toastService.error(err.error?.message || 'Không thể gửi đánh giá hàng loạt');
        this.isSubmittingBulkEvaluation = false;
      }
    });
  }
}


