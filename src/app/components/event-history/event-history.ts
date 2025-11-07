import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { getImageUrl as getImageUrlUtil } from '../../utils/image-url.util';

interface EventHistoryFilter {
  nam?: number;
  thang?: number;
  hoanThanh?: boolean;
  coGiayChungNhan?: boolean;
}

export interface EventHistoryDto {
  maSuKien: number;
  tenSuKien: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  diaChi?: string;
  hinhAnh?: string;
  trangThaiDangKy?: number;
  trangThaiDangKyText?: string;
  ngayDangKy: Date;
  daHoanThanh: boolean;
  daDanhGia: boolean;
  coGiayChungNhan: boolean;
  tenToChuc?: string;
  maToChuc: number;
}

interface EventHistoryStats {
  tongSuKien: number;
  suKienDaHoanThanh: number;
  suKienDangCho: number;
  suKienDaHuy: number;
  soGiayChungNhan: number;
  thongKeSuKienTheoThang: { [key: string]: number };
}

interface Certificate {
  maGiayChungNhan: number;
  maTNV: number;
  maMau: number;
  ngayCap?: Date;
  file?: string;
  filePath?: string;
}

@Component({
  selector: 'app-event-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './event-history.html',
  styleUrls: ['./event-history.css']
})
export class EventHistory implements OnInit {
  events: EventHistoryDto[] = [];
  eventStats: EventHistoryStats | null = null;
  filter: EventHistoryFilter = {};
  isLoading = false;
  availableYears: number[] = [];
  availableMonths: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  selectedEvent: EventHistoryDto | null = null;
  rating = 0;
  ratingComment = '';
  certificate: Certificate | null = null;

  private apiUrl = environment.apiUrl;
  private volunteer: any = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.initAvailableYears();
  }

  loadUserInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (!userInfo) {
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(userInfo);
    if (user.maTaiKhoan) {
      // Lấy thông tin tình nguyện viên
      this.http.get<any>(`${this.apiUrl}/tinhnguyenvien/by-account/${user.maTaiKhoan}`).subscribe({
        next: (response) => {
          this.volunteer = response.data || response;
          if (this.volunteer?.maTNV) {
            this.loadEventHistory();
            this.loadEventStats();
          }
        },
        error: (err) => {
          console.error('Lỗi tải thông tin tình nguyện viên:', err);
        }
      });
    }
  }

  initAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear; i++) {
      this.availableYears.push(i);
    }
    this.availableYears.sort((a, b) => b - a); // Sắp xếp giảm dần
  }

  loadEventHistory(): void {
    if (!this.volunteer?.maTNV) return;

    this.isLoading = true;
    let url = `${this.apiUrl}/dondangky/history/${this.volunteer.maTNV}`;

    // Thêm các tham số filter
    const queryParams: string[] = [];
    if (this.filter.nam !== undefined && this.filter.nam !== null) {
      queryParams.push(`nam=${this.filter.nam}`);
    }
    if (this.filter.thang !== undefined && this.filter.thang !== null) {
      queryParams.push(`thang=${this.filter.thang}`);
    }
    if (this.filter.hoanThanh !== undefined && this.filter.hoanThanh !== null) {
      queryParams.push(`hoanThanh=${this.filter.hoanThanh}`);
    }
    if (this.filter.coGiayChungNhan !== undefined && this.filter.coGiayChungNhan !== null) {
      queryParams.push(`coGiayChungNhan=${this.filter.coGiayChungNhan}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.events = response.data || response;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải lịch sử sự kiện:', err);
        this.isLoading = false;
      }
    });
  }

  loadEventStats(): void {
    if (!this.volunteer?.maTNV) return;

    this.http.get<any>(`${this.apiUrl}/dondangky/history/${this.volunteer.maTNV}/stats`).subscribe({
      next: (response) => {
        this.eventStats = response.data || response;
      },
      error: (err) => {
        console.error('Lỗi tải thống kê sự kiện:', err);
      }
    });
  }

  applyFilter(): void {
    this.loadEventHistory();
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  getEventStatusText(event: EventHistoryDto): string {
    if (event.daHoanThanh) {
      return 'Đã hoàn thành';
    }
    
    switch(event.trangThaiDangKy) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã duyệt';
      case 2: return 'Đã từ chối';
      default: return 'Không xác định';
    }
  }

  viewEventDetails(eventId: number): void {
    this.router.navigate(['/su-kien', eventId]);
  }

  rateEvent(eventId: number): void {
    this.selectedEvent = this.events.find(e => e.maSuKien === eventId) || null;
    this.rating = 0;
    this.ratingComment = '';
    
    const modalEl = document.getElementById('ratingModal');
    if ((window as any).bootstrap && modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  setRating(value: number): void {
    this.rating = value;
  }

  submitRating(): void {
    if (!this.selectedEvent || !this.volunteer?.maTNV || this.rating === 0) return;
    // Cần MaTaiKhoan của tổ chức
    this.http.get<any>(`${this.apiUrl}/organization/${this.selectedEvent.maToChuc}`).subscribe({
      next: (res) => {
        const org = res?.data || res;
        const maNguoiDuocDanhGia = org?.maTaiKhoan;
        if (!maNguoiDuocDanhGia) {
          alert('Không xác định được tài khoản tổ chức.');
          return;
        }
        const payload = {
          maNguoiDuocDanhGia,
          maSuKien: this.selectedEvent!.maSuKien,
          diemSo: this.rating,
          noiDung: this.ratingComment
        };
        this.http.post<any>(`${this.apiUrl}/danhgia`, payload, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
        }).subscribe({
          next: (response) => {
            alert(response?.message || 'Đánh giá thành công');
            const modalEl = document.getElementById('ratingModal');
            if ((window as any).bootstrap && modalEl) {
              const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
              if (modal) modal.hide();
            }
            if (this.selectedEvent) {
              this.selectedEvent.daDanhGia = true;
              const index = this.events.findIndex(e => e.maSuKien === this.selectedEvent?.maSuKien);
              if (index !== -1) this.events[index].daDanhGia = true;
            }
          },
          error: (err) => {
            console.error('Lỗi gửi đánh giá:', err);
            alert(err?.error?.message || 'Không thể gửi đánh giá');
          }
        });
      },
      error: (err) => {
        console.error('Lỗi lấy thông tin tổ chức:', err);
        alert('Không thể xác định tổ chức để đánh giá');
      }
    });
  }

  viewCertificate(eventId: number): void {
    if (!this.volunteer?.maTNV) return;
    
    // Lấy thông tin giấy chứng nhận
    this.http.get<any>(`${this.apiUrl}/certificate/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        const certificates = response.data || response;
        // Tìm giấy chứng nhận cho sự kiện này
        const eventCertificate = certificates.find((cert: any) => cert.maSuKien === eventId);
        
        if (eventCertificate) {
          this.certificate = eventCertificate;
          // Mở modal xem giấy chứng nhận
          // $('#certificateModal').modal('show');
        } else {
          alert('Không tìm thấy giấy chứng nhận cho sự kiện này');
        }
      },
      error: (err) => {
        console.error('Lỗi tải giấy chứng nhận:', err);
        alert('Lỗi tải giấy chứng nhận: ' + (err.error?.message || 'Đã xảy ra lỗi'));
      }
    });
  }

  getMonthsArray(): number[] {
    return this.availableMonths;
  }

  getMonthPercentage(month: number): number {
    if (!this.eventStats || !this.eventStats.thongKeSuKienTheoThang) return 0;
    
    const currentYear = new Date().getFullYear();
    const yearToUse = this.filter.nam || currentYear;
    const key = `${yearToUse}-${month.toString().padStart(2, '0')}`;
    
    const count = this.eventStats.thongKeSuKienTheoThang[key] || 0;
    const maxCount = Math.max(...Object.values(this.eventStats.thongKeSuKienTheoThang), 1);
    
    return (count / maxCount) * 100;
  }

  isImageFile(filePath: string | undefined): boolean {
    if (!filePath) return false;
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif'].includes(ext || '');
  }

  isPdfFile(filePath: string | undefined): boolean {
    if (!filePath) return false;
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ext === 'pdf';
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrlUtil(path);
  }
}
