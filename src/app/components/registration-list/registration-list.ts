import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { RegistrationService } from '../../services/registration';
import { EventService } from '../../services/event';
import { TinhNguyenVienService } from '../../services/volunteer';

@Component({
  selector: 'app-registration-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
  
  // Thông tin người dùng
  isLoggedIn = false;
  user: any = null;
  volunteer: any = null;
  
  constructor(
    private authService: AuthService,
    private registrationService: RegistrationService,
    private eventService: EventService,
    private volunteerService: TinhNguyenVienService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      const userInfo = localStorage.getItem('user');
      if (userInfo) {
        this.user = JSON.parse(userInfo);
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
        
        // Cập nhật thông tin sự kiện cho mỗi đăng ký
        this.registrations.forEach(reg => this.loadEventDetails(reg));
        
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
        this.applyFilters();
      },
      error: (err) => {
        console.error(`Lỗi khi lấy thông tin sự kiện ${registration.maSuKien}:`, err);
      }
    });
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

  cancelRegistration(registration: any) {
    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện này?')) return;
    
    this.registrationService.cancelRegistration(this.volunteer.maTNV, registration.maSuKien).subscribe({
      next: (response) => {
        console.log('Hủy đăng ký thành công:', response);
        this.registrations = this.registrations.filter(r => 
          r.maTNV !== registration.maTNV || r.maSuKien !== registration.maSuKien
        );
        this.applyFilters();
        alert('Hủy đăng ký thành công!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi hủy đăng ký:', err);
        alert('Không thể hủy đăng ký. Vui lòng thử lại sau.');
      }
    });
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
    
    return true;
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
}
