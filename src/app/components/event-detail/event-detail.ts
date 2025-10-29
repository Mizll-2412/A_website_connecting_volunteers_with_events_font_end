import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { RegistrationService } from '../../services/registration';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.css']
})
export class EventDetailComponent implements OnInit {
  apiUrl = 'http://localhost:5000/api/sukien';
  apiVolunteerUrl = 'http://localhost:5000/api/tinhnguyenvien';
  apiRegistrationUrl = 'http://localhost:5000/api/dondangky';

  eventId?: number;
  event: any = null;
  organization: any = null;
  similarEvents: any[] = [];
  isRegistered = false;
  registrationNote = '';
  isLoading = false;
  isRegistering = false;
  registrationError = '';
  isLoggedIn = false;
  username = '';
  role = '';
  volunteer: any = null;
  user: any = null;

  // Mock data
  mockEvent = {
    maSuKien: 101,
    tenSuKien: 'Trồng cây xanh tại công viên',
    noiDung: 'Tham gia trồng cây xanh để cải thiện môi trường sống và nâng cao ý thức bảo vệ môi trường cho cộng đồng.',
    moTaChiTiet: 'Chương trình "Trồng cây xanh tại công viên" là một phần của sáng kiến "Vì một Việt Nam xanh"...',
    diaChi: 'Công viên Thống Nhất, Hà Nội',
    ngayBatDau: new Date('2025-11-01T07:00:00'),
    ngayKetThuc: new Date('2025-11-01T16:00:00'),
    hinhAnh: '/uploads/avatars/1_20251015005804.png',
    soLuongTNV: 50,
    soLuongDaDangKy: 35,
    maToChuc: 1,
    trangThai: 'Đã duyệt',
    matchRate: 98,
    yeuCau: 'Không yêu cầu kinh nghiệm, phù hợp với mọi đối tượng từ 15 tuổi trở lên',
    quyenLoi: '- Được cung cấp dụng cụ, nước uống và bữa trưa\n- Được cấp giấy chứng nhận tham gia\n- Được tham gia các hoạt động giao lưu'
  };

  mockOrganization = {
    maToChuc: 1,
    tenToChuc: 'Quỹ Hy Vọng',
    gioiThieu: 'Hỗ trợ giáo dục cho trẻ em vùng cao và các hoạt động bảo vệ môi trường',
    anhDaiDien: '/uploads/avatars/1_20251015005804.png',
    diaChi: 'Hà Nội',
    website: 'hyvong.org',
    email: 'info@hyvong.org',
    soDienThoai: '0123456789',
    diemDanhGia: 4.8,
    soLuotDanhGia: 124
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private eventService: EventService,
    private orgService: ToChucService,
    private registrationService: RegistrationService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      const userInfo = localStorage.getItem('user');
      if (userInfo) {
        this.user = JSON.parse(userInfo);
        this.loadVolunteerInfo();
      }
    }

    this.route.params.subscribe(params => {
      this.eventId = +params['id'];
      if (this.eventId) {
        this.loadEventDetails(this.eventId);
      }
    });
  }

  loadEventDetails(id: number) {
    this.isLoading = true;
    // Thử load dữ liệu từ API
    this.eventService.getSuKienById(id).subscribe({
      next: (response: any) => {
        console.log('Chi tiết sự kiện từ API:', response);
        
        // Xử lý nhiều định dạng dữ liệu có thể có
        if (response && response.data) {
          this.event = response.data;
        } else if (response && !Array.isArray(response)) {
          this.event = response;
        } else {
          console.log('Không tìm thấy sự kiện từ API, sử dụng dữ liệu mẫu');
          this.event = this.mockEvent;
        }
        
        // Load thông tin tổ chức
        if (this.event.maToChuc) {
          this.loadOrganizationDetails(this.event.maToChuc);
        }
        
        // Nếu đã đăng nhập, kiểm tra xem đã đăng ký chưa
        if (this.isLoggedIn && this.volunteer) {
          this.checkRegistrationStatus();
        }
        
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy chi tiết sự kiện:', err);
        // Sử dụng dữ liệu mẫu khi API lỗi
        this.event = this.mockEvent;
        this.organization = this.mockOrganization;
        this.isLoading = false;
      }
    });
  }

  loadOrganizationDetails(orgId: number) {
    this.orgService.getOrganizationById(orgId).subscribe({
      next: (response: any) => {
        console.log('Thông tin tổ chức từ API:', response);
        
        // Xử lý nhiều định dạng dữ liệu có thể có
        if (response && response.data) {
          this.organization = response.data;
        } else if (response && !Array.isArray(response)) {
          this.organization = response;
        } else {
          console.log('Không tìm thấy tổ chức từ API, sử dụng dữ liệu mẫu');
          this.organization = this.mockOrganization;
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy thông tin tổ chức:', err);
        this.organization = this.mockOrganization;
      }
    });
  }

  loadVolunteerInfo() {
    if (!this.user?.maTaiKhoan) return;

    this.http.get<any>(`${this.apiVolunteerUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.volunteer = response.data;
        } else {
          this.volunteer = response;
        }
        
        console.log('Thông tin tình nguyện viên:', this.volunteer);
        
        // Nếu đã load được sự kiện, kiểm tra trạng thái đăng ký
        if (this.event) {
          this.checkRegistrationStatus();
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy thông tin tình nguyện viên:', err);
      }
    });
  }

  checkRegistrationStatus() {
    // Kiểm tra nếu TNV đã đăng ký sự kiện này chưa
    if (!this.volunteer?.maTNV || !this.eventId) return;

    this.registrationService.getRegistrationStatus(this.volunteer.maTNV, this.eventId).subscribe({
      next: (response: any) => {
        if (response) {
          console.log('Trạng thái đăng ký:', response);
          this.isRegistered = true;
        }
      },
      error: (err: HttpErrorResponse) => {
        console.log('Chưa đăng ký sự kiện này');
        this.isRegistered = false;
      }
    });
  }

  registerForEvent() {
    if (!this.volunteer?.maTNV || !this.eventId) {
      alert('Bạn cần đăng nhập và hoàn thiện hồ sơ tình nguyện viên trước khi đăng ký');
      return;
    }

    this.isRegistering = true;
    
    const registerData = {
      maTNV: this.volunteer.maTNV,
      maSuKien: this.eventId,
      ghiChu: this.registrationNote || 'Đăng ký tham gia'
    };

    this.registrationService.register(registerData).subscribe({
      next: (response: any) => {
        console.log('Đăng ký thành công:', response);
        this.isRegistered = true;
        this.isRegistering = false;
        alert('Đăng ký tham gia sự kiện thành công!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi đăng ký sự kiện:', err);
        this.isRegistering = false;
        this.registrationError = 'Không thể đăng ký tham gia. Vui lòng thử lại sau.';
        alert('Không thể đăng ký tham gia. Vui lòng thử lại sau.');
      }
    });
  }

  cancelRegistration() {
    if (!this.volunteer?.maTNV || !this.eventId) return;

    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện này?')) return;

    this.registrationService.cancelRegistration(this.volunteer.maTNV, this.eventId).subscribe({
      next: (response: any) => {
        console.log('Hủy đăng ký thành công:', response);
        this.isRegistered = false;
        alert('Hủy đăng ký tham gia sự kiện thành công!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi hủy đăng ký:', err);
        alert('Không thể hủy đăng ký. Vui lòng thử lại sau.');
      }
    });
  }

  eventHasStarted(): boolean {
    if (!this.event?.ngayBatDau) return false;
    const now = new Date();
    const eventStart = new Date(this.event.ngayBatDau);
    return now >= eventStart;
  }

  navigateToOtherEvent(eventId: number) {
    this.router.navigate(['/su-kien', eventId]);
  }

  formatDate(dateStr?: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  }
}