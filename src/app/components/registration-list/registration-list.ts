import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { RegistrationService } from '../../services/registration';
import { EventService } from '../../services/event';
import { TinhNguyenVienService } from '../../services/volunteer';
import { EvaluationService, CreateEvaluationDto } from '../../services/evaluation.service';
import { CertificateService } from '../../services/certificate.service';
import { CertificateViewerModalComponent } from '../certificate-viewer-modal/certificate-viewer-modal';
import { StarRatingComponent } from '../shared/star-rating/star-rating';
import { PaginationComponent } from '../shared/pagination/pagination';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CertificateViewerModalComponent, StarRatingComponent, PaginationComponent],
  templateUrl: './registration-list.html',
  styleUrls: ['./registration-list.css']
})
export class RegistrationListComponent implements OnInit {
  registrations: any[] = [];
  filteredRegistrations: any[] = [];
  isLoading = false;
  errorMessage = '';
  
  // Bộ lọc
  statusFilter = 'all'; // 'all', 'pending', 'approved', 'rejected'
  sortBy = 'date'; // 'date', 'event', 'status'
  searchTerm = '';
  selectedTab: string = 'active'; // 'active' hoặc 'finished'
  
  // Thông tin người dùng
  isLoggedIn = false;
  user: any = null;
  volunteer: any = null;
  
  // Đánh giá
  selectedRegistration: any = null;
  evaluationRating: number = 5;
  evaluationComment: string = '';
  
  // Preview đánh giá
  selectedEvaluationForPreview: any = null;
  showEvaluationPreviewModal = false;
  
  // Map đánh giá theo sự kiện
  eventEvaluationsMap: Map<number, { fromMe: any | null, toMe: any | null }> = new Map();
  
  // Track các sự kiện đã gửi yêu cầu đánh giá
  requestedEvaluationEvents: Set<number> = new Set();
  
  // Track các sự kiện đã gửi yêu cầu cấp chứng nhận
  requestedCertificateEvents: Set<number> = new Set();
  
  // Map chứng nhận theo sự kiện
  certificatesMap: Map<number, any> = new Map();
  
  // Modal xem chứng nhận
  showCertificateModal = false;
  selectedCertificateId: number | null = null;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  constructor(
    private authService: AuthService,
    private registrationService: RegistrationService,
    private eventService: EventService,
    private volunteerService: TinhNguyenVienService,
    private evaluationService: EvaluationService,
    private certificateService: CertificateService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated();
    
    // Đọc tab đã lưu từ localStorage
    const savedTab = localStorage.getItem('registrationListActiveTab');
    if (savedTab && ['active', 'finished'].includes(savedTab)) {
      this.selectedTab = savedTab;
    }
    
    if (this.isLoggedIn) {
      // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
      this.user = this.authService.getUser();
      if (this.user) {
        this.loadVolunteerInfo();
      }
    }
  }

  loadVolunteerInfo() {
    if (!this.user?.maTaiKhoan) return;
    
    this.volunteerService.getVolunteerByAccountId(this.user.maTaiKhoan).subscribe({
      next: (response: any) => {
        console.log('Thông tin tình nguyện viên:', response);
        
        if (response && response.data) {
          this.volunteer = response.data;
        } else {
          this.volunteer = response;
        }
        
        if (this.volunteer?.maTNV) {
          this.loadRegistrations();
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy thông tin tình nguyện viên:', err);
        this.errorMessage = 'Không thể lấy thông tin tình nguyện viên. Vui lòng thử lại sau.';
      }
    });
  }

  loadRegistrations() {
    if (!this.volunteer?.maTNV) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.registrationService.getRegistrationsByVolunteer(this.volunteer.maTNV).subscribe({
      next: (response: any) => {
        console.log('Danh sách đăng ký:', response);
        
        // Xử lý nhiều cấu trúc dữ liệu
        if (response && response.data) {
          this.registrations = response.data;
        } else if (Array.isArray(response)) {
          this.registrations = response;
        } else {
          this.registrations = [];
        }
        
        // Đảm bảo ngày đăng ký được parse đúng
        this.registrations.forEach(reg => {
          if (!reg.ngayDangKy && reg.ngayTao) {
            reg.ngayDangKy = reg.ngayTao;
          }
          this.loadEventDetails(reg);
          // Kiểm tra đã đánh giá chưa
          this.checkIfEvaluated(reg);
        });
        
        // Load thông tin đánh giá và chứng nhận
        this.loadRequestedEvaluations();
        this.loadRequestedCertificates();
        this.loadAllEvaluations();
        this.loadAllCertificates();
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách đăng ký:', err);
        this.errorMessage = 'Không thể lấy danh sách đăng ký. Vui lòng thử lại sau.';
        this.isLoading = false;
        this.registrations = this.getMockRegistrations();
        this.applyFilters();
      }
    });
  }

  checkIfEvaluated(registration: any): void {
    if (!this.user?.maTaiKhoan || !registration.event?.maTaiKhoanToChuc) return;
    
    this.evaluationService.checkEvaluationExists(
      this.user.maTaiKhoan,
      registration.event.maTaiKhoanToChuc,
      registration.maSuKien
    ).subscribe({
      next: (response: any) => {
        registration.hasEvaluated = response?.exists || response?.data?.exists || false;
      },
      error: () => {
        registration.hasEvaluated = false;
      }
    });
  }

  loadEventDetails(registration: any) {
    if (!registration.maSuKien) return;
    
    this.eventService.getSuKienById(registration.maSuKien).subscribe({
      next: (eventData: any) => {
        // Xử lý nhiều cấu trúc dữ liệu
        if (eventData && eventData.data) {
          registration.event = eventData.data;
        } else {
          registration.event = eventData;
        }
        
        // Cập nhật chứng nhận từ map
        this.updateCertificateInfo(registration);
        
        this.applyFilters();
      },
      error: (err) => {
        console.error(`Lỗi khi lấy thông tin sự kiện ${registration.maSuKien}:`, err);
      }
    });
  }
  
  // Load tất cả chứng nhận của tình nguyện viên
  loadAllCertificates(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${environment.apiUrl}/certificate/volunteers/${this.volunteer.maTNV}`).subscribe({
      next: (response: any) => {
        const certificates = response?.data || response || [];
        
        // Map chứng nhận theo sự kiện
        certificates.forEach((cert: any) => {
          if (cert.maSuKien) {
            this.certificatesMap.set(cert.maSuKien, cert);
          }
        });
        
        // Cập nhật thông tin chứng nhận cho tất cả registrations
        this.registrations.forEach(reg => {
          this.updateCertificateInfo(reg);
        });
      },
      error: (err) => {
        console.error('Lỗi load chứng nhận:', err);
      }
    });
  }
  
  // Cập nhật thông tin chứng nhận cho registration
  updateCertificateInfo(registration: any): void {
    const cert = this.certificatesMap.get(registration.maSuKien);
    if (cert) {
      registration.certificate = cert;
      registration.hasCertificate = true;
    } else {
      registration.hasCertificate = false;
    }
  }

  applyFilters() {
    // Lọc theo trạng thái
    let filtered = [...this.registrations];
    
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(reg => {
        if (this.statusFilter === 'pending') return reg.trangThai === 0;
        if (this.statusFilter === 'approved') return reg.trangThai === 1;
        if (this.statusFilter === 'rejected') return reg.trangThai === 2;
        return true;
      });
    }
    
    // Tìm kiếm
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(reg => 
        (reg.event?.tenSuKien && reg.event.tenSuKien.toLowerCase().includes(term)) ||
        (reg.ghiChu && reg.ghiChu.toLowerCase().includes(term))
      );
    }
    
    // Sắp xếp
    filtered.sort((a, b) => {
      if (this.sortBy === 'date') {
        return new Date(b.ngayDangKy).getTime() - new Date(a.ngayDangKy).getTime();
      } else if (this.sortBy === 'event' && a.event && b.event) {
        return a.event.tenSuKien.localeCompare(b.event.tenSuKien);
      } else if (this.sortBy === 'status') {
        return a.trangThai - b.trangThai;
      }
      return 0;
    });
    
    this.filteredRegistrations = filtered;
  }

  // Map lưu thông tin hủy đăng ký
  cancellationInfoMap: Map<number, any> = new Map();

  getCancellationInfo(registration: any): any {
    if (!this.volunteer || !registration.maSuKien || registration.trangThai !== 1) {
      return null;
    }
    
    // Nếu chưa có trong map, gọi API
    if (!this.cancellationInfoMap.has(registration.maSuKien)) {
      this.registrationService.canCancelRegistration(this.volunteer.maTNV, registration.maSuKien).subscribe({
        next: (res) => {
          this.cancellationInfoMap.set(registration.maSuKien, res);
          this.cdr.detectChanges();
        },
        error: () => {
          this.cancellationInfoMap.set(registration.maSuKien, {
            canCancel: false,
            reason: 'Không thể kiểm tra',
            hoursRemaining: 0
          });
        }
      });
      return null; // Trả về null lần đầu, sẽ update sau
    }
    
    return this.cancellationInfoMap.get(registration.maSuKien);
  }

  formatCountdown(hours: number): string {
    if (hours <= 0) return 'Hết hạn';
    
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (remainingHours > 0) result += `${remainingHours}h`;
    
    return result.trim() || '< 1h';
  }

  cancelRegistration(registration: any): void {
    if (!this.volunteer || !registration.maSuKien) return;
    
    if (confirm(`Xác nhận hủy đăng ký sự kiện "${registration.event?.tenSuKien}"?`)) {
      this.registrationService.cancelRegistration(this.volunteer.maTNV, registration.maSuKien).subscribe({
        next: () => {
          this.toastService.success('Đã hủy đăng ký thành công');
          this.loadRegistrations(); // Reload list
        },
        error: (err) => {
          console.error('Lỗi hủy đăng ký:', err);
          this.toastService.error(err.error?.message || 'Không thể hủy đăng ký');
        }
      });
    }
  }

  cancelRegistrationWithWarning(registration: any, cancelInfo: any): void {
    if (!cancelInfo.canCancel) {
      this.toastService.warning(cancelInfo.reason);
      return;
    }
    
    const timeLeft = this.formatCountdown(cancelInfo.hoursRemaining);
    const message = `Xác nhận hủy đăng ký sự kiện "${registration.event?.tenSuKien}"?\n\nThời gian còn lại để hủy: ${timeLeft}\n\nSau thời gian này, bạn sẽ không thể hủy được nữa.`;
    
    if (confirm(message)) {
      this.registrationService.cancelRegistration(this.volunteer.maTNV, registration.maSuKien).subscribe({
        next: () => {
          this.toastService.success('Đã hủy đăng ký thành công');
          this.loadRegistrations(); // Reload list
        },
        error: (err) => {
          console.error('Lỗi hủy đăng ký:', err);
          this.toastService.error(err.error?.message || 'Không thể hủy đăng ký');
        }
      });
    }
  }

  getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã duyệt';
      case 2: return 'Từ chối';
      default: return 'Không xác định';
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 0: return 'text-warning';
      case 1: return 'text-success';
      case 2: return 'text-danger';
      default: return '';
    }
  }

  canCancelRegistration(registration: any): boolean {
    // Chỉ có thể hủy nếu chưa diễn ra và chưa bị từ chối
    if (registration.trangThai === 2) return false; // Đã bị từ chối
    
    // Kiểm tra xem sự kiện đã bắt đầu chưa
    if (registration.event && registration.event.ngayBatDau) {
      const now = new Date();
      const eventStart = new Date(registration.event.ngayBatDau);
      if (now >= eventStart) return false; // Đã bắt đầu
    }
    
    // Có thể hủy nếu đang chờ duyệt (0) hoặc đã được duyệt (1)
    return registration.trangThai === 0 || registration.trangThai === 1;
  }

  canReRegister(registration: any): boolean {
    // Có thể đăng ký lại nếu bị từ chối (2) và sự kiện còn đang tuyển
    if (registration.trangThai !== 2) return false;
    
    if (!registration.event) return false;
    
    // Kiểm tra thời gian tuyển
    if (registration.event.tuyenBatDau && registration.event.tuyenKetThuc) {
      const now = new Date();
      const startDate = new Date(registration.event.tuyenBatDau);
      const endDate = new Date(registration.event.tuyenKetThuc);
      return now >= startDate && now <= endDate;
    }
    
    // Nếu không có thời gian tuyển, kiểm tra trạng thái sự kiện
    return registration.event.trangThai === 0 || registration.event.trangThai === 'Đang tuyển';
  }

  reRegister(registration: any) {
    if (!this.volunteer?.maTNV || !registration.maSuKien) return;
    
    if (!confirm('Bạn có chắc chắn muốn đăng ký lại tham gia sự kiện này?')) return;
    
    const registerData = {
      maTNV: this.volunteer.maTNV,
      maSuKien: registration.maSuKien,
      ghiChu: 'Đăng ký lại sau khi bị từ chối'
    };
    
    this.registrationService.register(registerData).subscribe({
      next: (response) => {
        console.log('Đăng ký lại thành công:', response);
        // Cập nhật trạng thái trong danh sách
        const index = this.registrations.findIndex(r => 
          r.maTNV === registration.maTNV && r.maSuKien === registration.maSuKien
        );
        if (index !== -1) {
          this.registrations[index].trangThai = 0; // Chờ duyệt
          this.registrations[index].ngayDangKy = new Date();
        }
        this.applyFilters();
        this.toastService.success('Đăng ký lại thành công!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi đăng ký lại:', err);
        const errorMsg = err.error?.message || 'Không thể đăng ký lại. Vui lòng thử lại sau.';
        this.toastService.error(errorMsg);
      }
    });
  }

  getCancelButtonText(registration: any): string {
    if (registration.trangThai === 0) return 'Hủy chờ duyệt';
    if (registration.trangThai === 1) return 'Hủy đăng ký';
    return 'Hủy đăng ký';
  }

  getMockRegistrations(): any[] {
    return [
      {
        maDonDK: 1,
        maTNV: 1,
        maSuKien: 101,
        ngayDangKy: new Date('2025-10-20'),
        trangThai: 1,
        ghiChu: 'Tôi rất mong được tham gia sự kiện',
        event: {
          maSuKien: 101,
          tenSuKien: 'Trồng cây xanh tại công viên',
          diaChi: 'Công viên Thống Nhất, Hà Nội',
          ngayBatDau: new Date('2025-11-01'),
          ngayKetThuc: new Date('2025-11-01')
        }
      },
      {
        maDonDK: 2,
        maTNV: 1,
        maSuKien: 102,
        ngayDangKy: new Date('2025-10-15'),
        trangThai: 0,
        ghiChu: 'Tôi có kinh nghiệm dạy học',
        event: {
          maSuKien: 102,
          tenSuKien: 'Dạy học cho trẻ em khó khăn',
          diaChi: 'Trường Tiểu học Thăng Long, Hà Nội',
          ngayBatDau: new Date('2025-10-25'),
          ngayKetThuc: new Date('2025-11-25')
        }
      }
    ];
  }

  // Đánh giá tổ chức
  openEvaluationModal(registration: any): void {
    this.selectedRegistration = registration;
    this.evaluationRating = 5;
    this.evaluationComment = '';
    
    const modalEl = document.getElementById('evaluationModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  submitEvaluation(): void {
    if (!this.selectedRegistration || !this.selectedRegistration.event) {
      this.toastService.error('Không thể gửi đánh giá. Vui lòng thử lại.');
      return;
    }

    // Kiểm tra sự kiện đã kết thúc chưa
    const eventEndDate = new Date(this.selectedRegistration.event.ngayKetThuc);
    if (eventEndDate > new Date()) {
      this.toastService.warning('Sự kiện chưa kết thúc. Bạn chỉ có thể đánh giá sau khi sự kiện kết thúc.');
      return;
    }

    const evaluation: CreateEvaluationDto = {
      maNguoiDanhGia: this.user.maTaiKhoan,
      maNguoiDuocDanhGia: this.selectedRegistration.event.maTaiKhoanToChuc || this.selectedRegistration.event.maToChuc, // Đánh giá tổ chức - dùng maTaiKhoanToChuc
      maSuKien: this.selectedRegistration.maSuKien,
      diemSo: this.evaluationRating,
      noiDung: this.evaluationComment.trim() || undefined
    };
    
    if (!evaluation.maNguoiDuocDanhGia) {
      this.toastService.error('Không thể lấy thông tin tổ chức. Vui lòng thử lại sau.');
      return;
    }

    this.evaluationService.createEvaluation(evaluation).subscribe({
      next: (response) => {
        this.toastService.success('Đánh giá thành công! Cảm ơn bạn đã đóng góp ý kiến.');
        
        // Đóng modal
        const modalEl = document.getElementById('evaluationModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }

        // Mark as evaluated
        this.selectedRegistration.hasEvaluated = true;
      },
      error: (err) => {
        console.error('Lỗi đánh giá:', err);
        const errorMsg = err.normalizedMessage || err.error?.message || 'Không thể gửi đánh giá';
        this.toastService.error(errorMsg);
      }
    });
  }

  canEvaluate(registration: any): boolean {
    // Chỉ có thể đánh giá nếu:
    // 1. Đơn đã được duyệt (trangThai === 1)
    // 2. Sự kiện đã kết thúc
    // 3. Chưa đánh giá
    if (registration.trangThai !== 1) return false;
    if (registration.hasEvaluated || registration.daDanhGia) return false;
    if (!registration.event || !registration.event.ngayKetThuc) return false;
    
    const event = registration.event;
    const now = new Date();
    
    // Kiểm tra sự kiện đã kết thúc theo trạng thái hoặc ngày
    if (event.trangThaiHienThi === 'Sự kiện đã kết thúc' || event.trangThaiHienThi === 'Đã kết thúc' || event.trangThai === 'Đã kết thúc' || event.trangThai === 'Sự kiện đã kết thúc') {
      return true;
    }
    
    const eventEndDate = new Date(event.ngayKetThuc);
    return eventEndDate < now;
  }

  setRating(rating: number): void {
    this.evaluationRating = rating;
  }

  // Kiểm tra sự kiện đã kết thúc chưa
  isEventFinished(registration: any): boolean {
    if (!registration.event) return false;
    
    const event = registration.event;
    const now = new Date();
    
    // Kiểm tra theo trạng thái
    if (event.trangThaiHienThi === 'Sự kiện đã kết thúc' || event.trangThaiHienThi === 'Đã kết thúc' || event.trangThai === 'Đã kết thúc' || event.trangThai === 'Sự kiện đã kết thúc') {
      return true;
    }
    
    // Kiểm tra theo ngày
    if (event.ngayKetThuc) {
      const eventEndDate = new Date(event.ngayKetThuc);
      return eventEndDate < now;
    }
    
    return false;
  }

  // Lọc đăng ký theo tab
  get activeRegistrations(): any[] {
    return this.filteredRegistrations.filter(reg => !this.isEventFinished(reg));
  }

  get finishedRegistrations(): any[] {
    return this.filteredRegistrations.filter(reg => this.isEventFinished(reg));
  }

  get paginatedActiveRegistrations(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.activeRegistrations.slice(startIndex, endIndex);
  }

  get paginatedFinishedRegistrations(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.finishedRegistrations.slice(startIndex, endIndex);
  }

  get currentRegistrations(): any[] {
    return this.selectedTab === 'active' ? this.activeRegistrations : this.finishedRegistrations;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
    this.currentPage = 1; // Reset về trang đầu khi đổi tab
    
    // Lưu tab vào localStorage
    localStorage.setItem('registrationListActiveTab', tab);
  }

  viewEvaluation(registration: any): void {
    if (!registration.event?.maTaiKhoanToChuc || !this.user?.maTaiKhoan) {
      this.toastService.error('Không thể xem đánh giá');
      return;
    }
    
    // Lấy đánh giá của tôi cho tổ chức
    const evaluation = this.eventEvaluationsMap.get(registration.maSuKien)?.fromMe;
    if (evaluation) {
      this.viewEvaluationPreview(evaluation, 'Đánh giá của bạn');
    } else {
      // Fallback: fetch từ API
      this.evaluationService.checkEvaluationExists(
        this.user.maTaiKhoan,
        registration.event.maTaiKhoanToChuc,
        registration.maSuKien
      ).subscribe({
        next: (response: any) => {
          if (response?.data) {
            this.viewEvaluationPreview(response.data, 'Đánh giá của bạn');
          } else {
            this.toastService.warning('Không tìm thấy đánh giá');
          }
        },
        error: (err) => {
          console.error('Lỗi khi lấy đánh giá:', err);
          this.toastService.error('Không thể xem đánh giá');
        }
      });
    }
  }
  
  // Load tất cả đánh giá
  loadAllEvaluations(): void {
    if (!this.user?.maTaiKhoan) return;
    
    // Load đánh giá đã tạo
    this.evaluationService.getGivenEvaluations(this.user.maTaiKhoan).subscribe({
      next: (myEvalsResponse: any) => {
        const myEvals = myEvalsResponse?.data || myEvalsResponse || [];
        
        // Load đánh giá nhận được
        this.evaluationService.getReceivedEvaluations(this.user.maTaiKhoan).subscribe({
          next: (receivedEvalsResponse: any) => {
            const receivedEvals = receivedEvalsResponse?.data || receivedEvalsResponse || [];
            
            // Map đánh giá theo sự kiện
            this.registrations.forEach(reg => {
              if (!reg.event?.maTaiKhoanToChuc) return;
              
              // Đánh giá của tôi cho tổ chức
              const fromMe = myEvals.find((e: any) => 
                e.maSuKien === reg.maSuKien && 
                e.maNguoiDuocDanhGia === reg.event.maTaiKhoanToChuc
              ) || null;
              
              // Đánh giá của tổ chức cho tôi
              const toMe = receivedEvals.find((e: any) => 
                e.maSuKien === reg.maSuKien && 
                e.maNguoiDanhGia === reg.event.maTaiKhoanToChuc
              ) || null;
              
              this.eventEvaluationsMap.set(reg.maSuKien, { fromMe, toMe });
              
              // Cập nhật flag hasEvaluated
              if (fromMe) {
                reg.hasEvaluated = true;
              }
              
              // Nếu tổ chức đã đánh giá, xóa khỏi danh sách đã gửi yêu cầu
              if (toMe) {
                this.requestedEvaluationEvents.delete(reg.maSuKien);
                this.saveRequestedEvaluations();
              }
            });
          },
          error: (err) => {
            console.error('Lỗi load đánh giá nhận được:', err);
          }
        });
      },
      error: (err) => {
        console.error('Lỗi load đánh giá đã tạo:', err);
      }
    });
  }
  
  // Xem preview đánh giá
  viewEvaluationPreview(evaluation: any, title: string): void {
    if (!evaluation) {
      console.error('Không có đánh giá để hiển thị');
      this.toastService.warning('Không tìm thấy đánh giá');
      return;
    }
    
    this.selectedEvaluationForPreview = evaluation;
    this.showEvaluationPreviewModal = true;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      const modalEl = document.getElementById('evaluationPreviewModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = new (window as any).bootstrap.Modal(modalEl);
        modal.show();
      }
    }, 0);
  }
  
  closeEvaluationPreviewModal(): void {
    const modalEl = document.getElementById('evaluationPreviewModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      }
    }
    
    this.showEvaluationPreviewModal = false;
    this.selectedEvaluationForPreview = null;
  }
  
  // Helper để lấy đánh giá cho một sự kiện
  getEvaluationForEvent(maSuKien: number): { fromMe: any | null, toMe: any | null } {
    return this.eventEvaluationsMap.get(maSuKien) || { fromMe: null, toMe: null };
  }
  
  // Xem đánh giá từ tổ chức
  viewEvaluationFromOrganization(registration: any): void {
    const evaluation = this.eventEvaluationsMap.get(registration.maSuKien)?.toMe;
    if (evaluation) {
      this.viewEvaluationPreview(evaluation, 'Đánh giá từ tổ chức');
    } else {
      this.toastService.info('Tổ chức chưa đánh giá bạn cho sự kiện này');
    }
  }
  
  // Gửi yêu cầu được đánh giá
  requestEvaluationFromOrganization(registration: any): void {
    if (!this.user?.maTaiKhoan) {
      this.toastService.warning('Bạn cần đăng nhập để gửi yêu cầu');
      return;
    }
    
    const eventData = registration.event;
    if (!eventData?.maTaiKhoanToChuc) {
      this.toastService.error('Không thể lấy thông tin tổ chức');
      return;
    }
    
    // Kiểm tra đã gửi yêu cầu chưa
    if (this.requestedEvaluationEvents.has(registration.maSuKien)) {
      if (!confirm('Bạn đã gửi yêu cầu đánh giá cho sự kiện này. Bạn có muốn gửi lại yêu cầu không?')) {
        return;
      }
    } else {
      if (!confirm('Bạn có muốn gửi yêu cầu tổ chức đánh giá bạn cho sự kiện này không?')) {
        return;
      }
    }
    
    const volunteerName = this.volunteer?.hoTen || 'Tình nguyện viên';
    const requestData = {
      maTaiKhoanToChuc: eventData.maTaiKhoanToChuc,
      noiDung: `${volunteerName} yêu cầu bạn đánh giá cho sự kiện "${eventData.tenSuKien || 'Sự kiện'}"`
    };
    
    this.http.post<any>(`${environment.apiUrl}/notification/request-evaluation`, requestData).subscribe({
      next: () => {
        // Đánh dấu đã gửi yêu cầu
        this.requestedEvaluationEvents.add(registration.maSuKien);
        this.saveRequestedEvaluations();
        this.toastService.success('Đã gửi yêu cầu đánh giá tới tổ chức thành công!');
      },
      error: (err) => {
        console.error('Lỗi gửi yêu cầu:', err);
        this.toastService.error('Không thể gửi yêu cầu: ' + (err.error?.message || 'Đã xảy ra lỗi'));
      }
    });
  }
  
  // Kiểm tra đã gửi yêu cầu đánh giá chưa
  hasRequestedEvaluation(maSuKien: number): boolean {
    return this.requestedEvaluationEvents.has(maSuKien);
  }
  
  // Lưu danh sách đã gửi yêu cầu vào localStorage
  saveRequestedEvaluations(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_evaluations_${this.user.maTaiKhoan}`;
      const data = Array.from(this.requestedEvaluationEvents);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
  
  // Load danh sách đã gửi yêu cầu từ localStorage
  loadRequestedEvaluations(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_evaluations_${this.user.maTaiKhoan}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const array = JSON.parse(data);
          this.requestedEvaluationEvents = new Set(array);
        } catch (e) {
          console.error('Lỗi khi tải đánh giá đã yêu cầu:', e);
        }
      }
    }
  }
  
  // Kiểm tra đã yêu cầu cấp chứng nhận chưa
  hasRequestedCertificate(maSuKien: number): boolean {
    return this.requestedCertificateEvents.has(maSuKien);
  }
  
  // Lưu danh sách đã gửi yêu cầu cấp chứng nhận vào localStorage
  saveRequestedCertificates(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_certificates_${this.user.maTaiKhoan}`;
      const data = Array.from(this.requestedCertificateEvents);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
  
  // Load danh sách đã gửi yêu cầu cấp chứng nhận từ localStorage
  loadRequestedCertificates(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_certificates_${this.user.maTaiKhoan}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const array = JSON.parse(data);
          this.requestedCertificateEvents = new Set(array);
        } catch (e) {
          console.error('Lỗi khi tải chứng nhận đã yêu cầu:', e);
        }
      }
    }
  }
  
  // Xem chứng nhận
  viewCertificate(registration: any): void {
    if (!registration.certificate?.maGiayChungNhan) {
      this.toastService.warning('Không tìm thấy thông tin chứng nhận');
      return;
    }
    
    // Mở modal xem chứng nhận
    this.selectedCertificateId = registration.certificate.maGiayChungNhan;
    this.showCertificateModal = true;
  }
  
  // Đóng modal chứng nhận
  closeCertificateModal(): void {
    this.showCertificateModal = false;
    this.selectedCertificateId = null;
  }
  
  // Kiểm tra có thể xem chứng nhận không
  canViewCertificate(registration: any): boolean {
    // Chỉ có thể xem chứng nhận nếu:
    // 1. Sự kiện đã kết thúc
    // 2. Đơn đăng ký đã được duyệt
    // 3. Có chứng nhận
    return registration.hasCertificate && 
           registration.trangThai === 1 && 
           this.isEventFinished(registration);
  }
  
  // Kiểm tra có thể yêu cầu chứng nhận không
  canRequestCertificate(registration: any): boolean {
    // Có thể yêu cầu nếu:
    // 1. Sự kiện đã kết thúc
    // 2. Đơn đăng ký đã được duyệt
    // 3. Chưa có chứng nhận
    return !registration.hasCertificate && 
           registration.trangThai === 1 && 
           this.isEventFinished(registration);
  }
  
  // Yêu cầu cấp giấy chứng nhận
  requestCertificate(registration: any): void {
    if (!this.user?.maTaiKhoan || !registration.event?.maTaiKhoanToChuc) {
      this.toastService.error('Không thể gửi yêu cầu. Vui lòng thử lại.');
      return;
    }
    
    if (!confirm('Bạn có muốn gửi yêu cầu tổ chức cấp giấy chứng nhận cho sự kiện này không?')) {
      return;
    }
    
    const volunteerName = this.volunteer?.hoTen || 'Tình nguyện viên';
    const requestData = {
      maTaiKhoanToChuc: registration.event.maTaiKhoanToChuc,
      noiDung: `${volunteerName} yêu cầu bạn cấp giấy chứng nhận cho sự kiện "${registration.event.tenSuKien || 'Sự kiện'}"`
    };
    
    // Sử dụng endpoint request-evaluation tạm thời (có thể cần tạo endpoint riêng sau)
    this.http.post<any>(`${environment.apiUrl}/notification/request-evaluation`, requestData).subscribe({
      next: () => {
        // Lưu trạng thái đã gửi yêu cầu
        this.requestedCertificateEvents.add(registration.maSuKien);
        this.saveRequestedCertificates();
        this.toastService.success('Đã gửi yêu cầu cấp giấy chứng nhận tới tổ chức thành công!');
      },
      error: (err) => {
        console.error('Lỗi gửi yêu cầu:', err);
        this.toastService.error('Không thể gửi yêu cầu: ' + (err.error?.message || 'Đã xảy ra lỗi'));
      }
    });
  }
}
