import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event';
import { RegistrationService } from '../../services/registration';
import { AuthService } from '../../services/auth';
import { CertificateService } from '../../services/certificate.service';
import { EvaluationService, CreateEvaluationDto } from '../../services/evaluation.service';
import { getImageUrl } from '../../utils/image-url.util';
import { StarRatingComponent } from '../shared/star-rating/star-rating';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

interface Volunteer {
  maTNV: number;
  maTaiKhoan: number;
  hoTen: string;
  soDienThoai: string;
  email: string;
  diaChi: string;
  trangThai: number;
}

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StarRatingComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit {
  eventId: number = 0;
  event: any = null;
  isLoading = true;
  errorMessage = '';
  approvedVolunteerCount = 0;
  
  // Tình nguyện viên đã đăng ký
  eventVolunteers: Volunteer[] = [];
  isLoadingVolunteers = false;
  
  // Chứng nhận
  certificateSamples: any[] = [];
  selectedCertificateSample: number | null = null;
  selectedVolunteersForCert: Set<number> = new Set();
  issuedCertificates: Set<number> = new Set();
  isIssuingCertificates: boolean = false;
  
  // Đánh giá TNV
  evalScore: number = 5;
  evalComment: string = '';
  evaluatingVolunteer: Volunteer | null = null;
  evaluatedVolunteerIds: Set<number> = new Set<number>();
  evalSubmitting: boolean = false;
  
  // User info
  user: any = null;
  role: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private registrationService: RegistrationService,
    private authService: AuthService,
    private certificateService: CertificateService,
    private evaluationService: EvaluationService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) {}

  ngOnInit(): void {
    // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
    this.user = this.authService.getUser();
    if (this.user) {
      this.role = this.authService.getRole();
      
      // Chặn không cho User (TNV) vào trang này
      if (this.role !== 'Organization' && this.role !== 'Admin') {
        this.toast.error('Bạn không có quyền truy cập trang này!');
        this.router.navigate(['/home']);
        return;
      }
    }
    
    this.route.params.subscribe(params => {
      this.eventId = +params['id'];
      if (this.eventId) {
        this.loadEventDetail();
        this.loadEventVolunteers();
        this.loadCertificateSamples();
      }
    });
  }

  loadEventDetail(): void {
    this.isLoading = true;
    this.eventService.getSuKienById(this.eventId).subscribe({
      next: (response: any) => {
        this.event = this.normalizeEventData(response?.data ?? response);
        this.syncRegistrationCounts();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Lỗi tải sự kiện:', err);
        this.errorMessage = 'Không thể tải thông tin sự kiện';
        this.isLoading = false;
      }
    });
  }

  loadEventVolunteers(): void {
    this.isLoadingVolunteers = true;
    this.registrationService.getRegistrationsByEvent(this.eventId).subscribe({
      next: (response: any) => {
        const data = response.data || response || [];
        // Lọc chỉ lấy các đăng ký đã được duyệt (trangThai === 1)
        this.eventVolunteers = data
          .filter((reg: any) => reg.trangThai === 1)
          .map((reg: any) => ({
            maTNV: reg.maTNV || reg.maTnv,
            maTaiKhoan: reg.maTaiKhoan || reg.maTaiKhoan || 0,
            hoTen: reg.tenTnv || reg.hoTen || 'Chưa cập nhật',
            soDienThoai: reg.soDienThoai || 'Chưa cập nhật',
            email: reg.email || 'Chưa cập nhật',
            diaChi: reg.diaChi || 'Chưa cập nhật',
            trangThai: reg.trangThai || 0
          }));
        this.isLoadingVolunteers = false;
        this.syncRegistrationCounts();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách TNV:', err);
        this.isLoadingVolunteers = false;
      }
    });
  }

  loadCertificateSamples(): void {
    this.certificateService.getCertificateSamples().subscribe({
      next: (res) => {
        this.certificateSamples = res.data || res || [];
      },
      error: (err) => {
        console.error('Lỗi tải mẫu chứng nhận:', err);
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return 'Chưa xác định';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }

  getEventStatusText(): string {
    if (!this.event) return '';
    
    if (this.event.trangThaiHienThi) {
      return this.event.trangThaiHienThi;
    }
    
    if (this.event.trangThai === 'Đã kết thúc' || this.event.trangThai === 'Sự kiện đã kết thúc') {
      return 'Sự kiện đã kết thúc';
    }
    
    const now = new Date();
    const start = this.event.ngayBatDau ? new Date(this.event.ngayBatDau) : null;
    const end = this.event.ngayKetThuc ? new Date(this.event.ngayKetThuc) : null;
    
    if (end && end < now) return 'Sự kiện đã kết thúc';
    if (start && start > now) return 'Sắp diễn ra';
    if (start && start <= now && (!end || end >= now)) return 'Đang diễn ra';
    
    return 'Đang tuyển';
  }

  getEventStatusClass(): string {
    const status = this.getEventStatusText();
    switch (status) {
      case 'Sự kiện đã kết thúc':
      case 'Đã kết thúc': return 'bg-secondary';
      case 'Đang diễn ra': return 'bg-success';
      case 'Sắp diễn ra': return 'bg-info';
      case 'Đang tuyển': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  editEvent(): void {
    this.router.navigate(['/manage-org'], { 
      queryParams: { edit: this.eventId } 
    });
  }

  finishEvent(): void {
    this.confirm.confirm('Bạn có chắc chắn muốn kết thúc sự kiện này?', { okText: 'Kết thúc' }).then(confirmed => {
      if (!confirmed) return;

      this.eventService.finishEvent(this.eventId).subscribe({
        next: () => {
          this.toast.success('Đã kết thúc sự kiện thành công!');
          this.loadEventDetail();
        },
        error: (err: any) => {
          console.error('Lỗi kết thúc sự kiện:', err);
          this.toast.error(err.error?.message || 'Không thể kết thúc sự kiện');
        }
      });
    });
  }

  deleteEvent(): void {
    this.confirm.confirm('Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác!', { variant: 'danger', okText: 'Xóa' }).then(confirmed => {
      if (!confirmed) return;

      this.eventService.deleteSuKien(this.eventId).subscribe({
        next: () => {
          this.toast.success('Đã xóa sự kiện thành công!');
          this.router.navigate(['/manage-org']);
        },
        error: (err) => {
          console.error('Lỗi xóa sự kiện:', err);
          this.toast.error(err.error?.message || 'Không thể xóa sự kiện');
        }
      });
    });
  }

  backToList(): void {
    this.router.navigate(['/manage-org']);
  }

  // Đánh giá tình nguyện viên
  openEvaluateVolunteer(volunteer: Volunteer): void {
    this.evaluatingVolunteer = volunteer;
    this.evalScore = 5;
    this.evalComment = '';
    
    const modalEl = document.getElementById('evaluateModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  submitEvaluation(): void {
    if (!this.evaluatingVolunteer || !this.event) {
      return;
    }

    this.evalSubmitting = true;
    
    console.log('Thông tin tình nguyện viên:', this.evaluatingVolunteer);
    console.log('Thông tin người dùng:', this.user);
    
    const evalDto: CreateEvaluationDto = {
      maNguoiDanhGia: this.user.maTaiKhoan,
      maNguoiDuocDanhGia: this.evaluatingVolunteer.maTaiKhoan, // Dùng maTaiKhoan thay vì maTNV
      maSuKien: this.event.maSuKien,
      diemSo: this.evalScore,
      noiDung: this.evalComment
    };
    
    console.log('Đang gửi đánh giá:', evalDto);

    this.evaluationService.createEvaluation(evalDto).subscribe({
      next: () => {
        this.toast.success('Đánh giá thành công!');
        this.evaluatedVolunteerIds.add(this.evaluatingVolunteer!.maTNV);
        this.evalSubmitting = false;
        
        const modalEl = document.getElementById('evaluateModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      },
      error: (err) => {
        console.error('Lỗi đánh giá:', err);
        this.toast.error(err.error?.message || 'Không thể gửi đánh giá');
        this.evalSubmitting = false;
      }
    });
  }

  setRating(rating: number): void {
    this.evalScore = rating;
  }

  // Chọn TNV để cấp chứng nhận
  toggleVolunteerForCert(maTNV: number): void {
    if (this.selectedVolunteersForCert.has(maTNV)) {
      this.selectedVolunteersForCert.delete(maTNV);
    } else {
      this.selectedVolunteersForCert.add(maTNV);
    }
  }

  toggleAllVolunteers(): void {
    if (this.selectedVolunteersForCert.size === this.eventVolunteers.length) {
      this.selectedVolunteersForCert.clear();
    } else {
      this.eventVolunteers.forEach(v => this.selectedVolunteersForCert.add(v.maTNV));
    }
  }

  issueCertificatesBulk(): void {
    if (!this.selectedCertificateSample || this.selectedVolunteersForCert.size === 0) {
      this.toast.warning('Vui lòng chọn mẫu chứng nhận và ít nhất một tình nguyện viên!');
      return;
    }

    this.isIssuingCertificates = true;
    let successCount = 0;
    let failCount = 0;
    const total = this.selectedVolunteersForCert.size;

    const promises = Array.from(this.selectedVolunteersForCert).map(maTNV => {
      const formData = new FormData();
      formData.append('MaMau', this.selectedCertificateSample!.toString());
      formData.append('MaTNV', maTNV.toString());
      formData.append('MaSuKien', this.eventId.toString());
      
      return this.certificateService.issueCertificate(formData).toPromise()
        .then(() => {
          successCount++;
          this.issuedCertificates.add(maTNV);
        })
        .catch(err => {
          console.error(`Lỗi cấp chứng nhận cho TNV ${maTNV}:`, err);
          failCount++;
        });
    });

    Promise.all(promises).then(() => {
      this.isIssuingCertificates = false;
      this.toast.success(`Hoàn thành! Thành công: ${successCount}/${total}`);
      this.selectedVolunteersForCert.clear();
      
      const modalEl = document.getElementById('certificateModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
    });
  }

  openCertificateModal(): void {
    const modalEl = document.getElementById('certificateModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  canEditOrDelete(): boolean {
    return this.role === 'Organization' || this.role === 'Admin';
  }

  canFinishEvent(): boolean {
    if (!this.event) return false;
    const status = this.getEventStatusText();
    return status !== 'Sự kiện đã kết thúc' && status !== 'Đã kết thúc' && this.canEditOrDelete();
  }

  canEvaluateVolunteer(volunteer: Volunteer): boolean {
    if (!this.event) return false;
    const status = this.getEventStatusText();
    return (status === 'Sự kiện đã kết thúc' || status === 'Đã kết thúc') && 
           volunteer.trangThai === 1 && 
           !this.evaluatedVolunteerIds.has(volunteer.maTNV);
  }

  getRequiredSlots(): number {
    const slots = this.event?.soLuong ?? this.event?.soLuongCanTuyen ?? this.event?.soLuongTNV ?? this.event?.soLuongTnv;
    return this.ensureNumber(slots);
  }

  getRegisteredSlots(): number {
    const fromEvent = this.event?.soLuongDaDangKy ?? this.event?.soLuongDangKy ?? this.event?.soLuongDaThamGia;
    const value = this.ensureNumber(fromEvent);
    return value > 0 ? value : this.approvedVolunteerCount;
  }

  getRemainingSlots(): number {
    const remaining = this.getRequiredSlots() - this.getRegisteredSlots();
    return remaining > 0 ? remaining : 0;
  }

  getRegistrationProgress(): number {
    const total = this.getRequiredSlots();
    if (total <= 0) {
      return 0;
    }
    const percent = (this.getRegisteredSlots() / total) * 100;
    return Math.min(Math.max(percent, 0), 100);
  }

  private normalizeEventData(raw: any): any {
    if (!raw) {
      return null;
    }
    const eventData = Array.isArray(raw) ? raw[0] : raw;
    if (!eventData) {
      return null;
    }
    if (eventData.soLuong == null) {
      eventData.soLuong = eventData.soLuongCanTuyen ?? eventData.soLuongTNV ?? eventData.soLuongTnv ?? 0;
    }
    if (eventData.soLuongCanTuyen == null) {
      eventData.soLuongCanTuyen = eventData.soLuong ?? 0;
    }
    if (eventData.soLuongDaDangKy == null) {
      eventData.soLuongDaDangKy = eventData.soLuongDangKy ?? eventData.soLuongDaThamGia ?? null;
    }
    if (!eventData.tuyenBatDau) {
      eventData.tuyenBatDau = eventData.ngayTuyenBatDau ?? eventData.thoiGianTuyenBatDau;
    }
    if (!eventData.tuyenKetThuc) {
      eventData.tuyenKetThuc = eventData.ngayTuyenKetThuc ?? eventData.thoiGianTuyenKetThuc;
    }
    return eventData;
  }

  private ensureNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private syncRegistrationCounts(): void {
    this.approvedVolunteerCount = this.eventVolunteers.length;
    if (!this.event) {
      return;
    }
    if (this.event.soLuongDaDangKy == null) {
      this.event.soLuongDaDangKy = this.approvedVolunteerCount;
    }
  }
}

