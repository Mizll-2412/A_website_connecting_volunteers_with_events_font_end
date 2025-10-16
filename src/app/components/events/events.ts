import { Component, OnInit } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { SuKienResponseDto } from '../../models/event';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { ToChucResponseDto } from '../../models/organiztion';
import { TinhNguyenVien } from '../../models/volunteer';

@Component({
  selector: 'app-event-registered',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './events.html',
  styleUrls: ['./events.css']
})
export class EventRegisteredComponent implements OnInit {
  apiUrl = 'http://localhost:5000/api/dondangky';
  apiVolunteerUrl = 'http://localhost:5000/api/tinhnguyenvien';
  suKiens: SuKienResponseDto[] = [];
  toChucs: ToChucResponseDto[] = [];
  user?: User;
  volunteer?: TinhNguyenVien;
  isLoggedIn = false;
  username = '';
  role = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private eventS: EventService,
    private org: ToChucService,
    private http: HttpClient
  ) { }

  ngOnDestroy(): void {
  }

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
    }

    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
      this.loadVolunteerInfo();
    } else {
      this.router.navigate(['/login']);
      return;
    }

    this.loadSuKien();
    this.loadTochuc();
  }

  loadVolunteerInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    this.http.get<any>(`${this.apiVolunteerUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: (data: any) => {
        this.volunteer = data.data || data;
        console.log('Thông tin tình nguyện viên:', this.volunteer);
      },
      error: (err) => {
        console.error('Lỗi tải thông tin tình nguyện viên:', err);
        alert('Không tìm thấy thông tin tình nguyện viên. Vui lòng hoàn thiện hồ sơ.');
      }
    });
  }

  loadSuKien(): void {
    this.eventS.getAllSuKien().subscribe({
      next: (data: any) => {
        console.log('Dữ liệu API:', data);
        this.suKiens = Array.isArray(data) ? data : data.data || data.items || [];
      },
      error: (err) => {
        console.error('Lỗi tải danh sách sự kiện:', err);
      }
    });
  }

  loadTochuc(): void {
    this.org.layTatCaToChuc().subscribe({
      next: (data: any) => {
        console.log('Dữ liệu API tổ chức:', data);
        this.toChucs = Array.isArray(data) ? data : data.data || data.items || [];
      },
      error: (err) => {
        console.error('Lỗi tải danh sách tổ chức:', err);
      }
    });
  }

  thamGiaSuKien(maSuKien: number): void {
    if (!this.volunteer || !this.volunteer.maTNV) {
      alert('Vui lòng hoàn thiện hồ sơ tình nguyện viên trước khi đăng ký sự kiện');
      this.router.navigate(['/profile']); // Chuyển đến trang profile
      return;
    }

    if (this.role !== 'TinhNguyenVien') {
      alert('Chỉ tình nguyện viên mới có thể đăng ký sự kiện');
      return;
    }

    const donDangKy = {
      maTNV: this.volunteer.maTNV,
      maSuKien: maSuKien,
      ghiChu: ''
    };

    this.http.post(this.apiUrl, donDangKy).subscribe({
      next: (res: any) => {
        alert(res.message || 'Đăng ký tham gia thành công!');
        this.router.navigate(['/my-registrations']);
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'Đã xảy ra lỗi khi đăng ký';
        alert(errorMessage);
        console.error('Lỗi đăng ký:', err);
      }
    });
  }

  getTenToChuc(maToChuc: number): string {
    const toChuc = this.toChucs.find(tc => tc.maToChuc === maToChuc);
    return toChuc?.tenToChuc || 'Chưa có thông tin';
  }

  hasVolunteerProfile(): boolean {
    return !!this.volunteer && !!this.volunteer.maTNV;
  }
}