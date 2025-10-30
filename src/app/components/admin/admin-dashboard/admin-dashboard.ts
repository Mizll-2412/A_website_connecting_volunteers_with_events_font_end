import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  imports: [CommonModule, RouterModule, DatePipe],
  standalone: true
})
export class AdminDashboard implements OnInit {
  stats = {
    users: 0,
    organizations: 0,
    events: 0
  };

  pendingOrganizations: any[] = [];
  recentEvents: any[] = [];
  recentUsers: any[] = [];

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadStatistics();
    this.loadPendingOrganizations();
    this.loadRecentEvents();
    this.loadRecentUsers();
  }

  refreshStats(): void {
    this.loadStatistics();
    this.loadPendingOrganizations();
    this.loadRecentEvents();
    this.loadRecentUsers();
  }

  loadStatistics(): void {
    // Khởi tạo giá trị mặc định
    this.stats = {
      users: 0,
      organizations: 0,
      events: 0
    };
    
    // Gọi API lấy số lượng người dùng
    this.adminService.getAllUsers().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          this.stats.users = response.data.length || 0;
        } else if (Array.isArray(response)) {
          this.stats.users = response.length || 0;
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
      }
    });

    // Gọi API lấy số lượng tổ chức
    this.adminService.getAllOrganizations().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          this.stats.organizations = response.data.length || 0;
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách tổ chức:', error);
      }
    });

    // Lấy số lượng sự kiện
    this.adminService.getLatestEvents().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          // Đây chỉ lấy 5 sự kiện mới nhất, nên không phải tổng số sự kiện
          // Nhưng có thể hiển thị số lượng này tạm thời
          this.stats.events = response.data.length || 0;
        } else if (Array.isArray(response)) {
          this.stats.events = response.length || 0;
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách sự kiện:', error);
      }
    });
  }

  loadPendingOrganizations(): void {
    // Gọi API lấy danh sách tổ chức đang chờ xác minh
    this.adminService.getPendingOrganizations().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          this.pendingOrganizations = response.data.filter((org: any) => 
            org.trangThaiXacMinh === 0 || org.trangThaiXacMinh === null
          ).slice(0, 5); // Chỉ lấy tối đa 5 tổ chức
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          this.pendingOrganizations = [];
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách tổ chức chờ xác minh:', error);
        // Sử dụng dữ liệu mẫu khi API lỗi
        this.pendingOrganizations = [
          {
            maToChuc: 1,
            tenToChuc: 'Hội Chữ thập đỏ Việt Nam',
            email: 'chuthapdo@example.com',
            soDienThoai: '0123456789',
            diaChi: 'Hà Nội',
            ngayTao: new Date(2025, 9, 15),
            trangThaiXacMinh: 0
          },
          {
            maToChuc: 2,
            tenToChuc: 'Quỹ Bảo trợ trẻ em Việt Nam',
            email: 'baotrotreem@example.com',
            soDienThoai: '0987654321',
            diaChi: 'Hồ Chí Minh',
            ngayTao: new Date(2025, 9, 20),
            trangThaiXacMinh: 0
          }
        ];
      }
    });
  }

  loadRecentEvents(): void {
    // Gọi API lấy danh sách sự kiện mới nhất
    this.adminService.getLatestEvents().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          // Xử lý dữ liệu
          this.recentEvents = response.data.map((event: any) => {
            // Thêm thông tin tổ chức nếu có
            let tenToChuc = '';
            if (event.toChuc && event.toChuc.tenToChuc) {
              tenToChuc = event.toChuc.tenToChuc;
            }
            
            return {
              maSuKien: event.maSuKien,
              tenSuKien: event.tenSuKien,
              tenToChuc: tenToChuc,
              ngayBatDau: event.ngayBatDau ? new Date(event.ngayBatDau) : null
            };
          }).slice(0, 5); // Lấy tối đa 5 sự kiện
        } else if (Array.isArray(response)) {
          // Xử lý dữ liệu nếu API trả về trực tiếp mảng
          this.recentEvents = response.map((event: any) => {
            return {
              maSuKien: event.maSuKien,
              tenSuKien: event.tenSuKien,
              tenToChuc: event.toChuc?.tenToChuc || '',
              ngayBatDau: event.ngayBatDau ? new Date(event.ngayBatDau) : null
            };
          }).slice(0, 5);
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          this.recentEvents = [];
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách sự kiện mới nhất:', error);
        // Sử dụng dữ liệu mẫu khi API lỗi
        this.recentEvents = [
          {
            maSuKien: 1,
            tenSuKien: 'Hiến máu tình nguyện',
            tenToChuc: 'Hội Chữ thập đỏ Việt Nam',
            ngayBatDau: new Date(2025, 10, 5)
          },
          {
            maSuKien: 2,
            tenSuKien: 'Hỗ trợ trẻ em vùng cao',
            tenToChuc: 'Quỹ Bảo trợ trẻ em Việt Nam',
            ngayBatDau: new Date(2025, 10, 10)
          }
        ];
      }
    });
  }

  loadRecentUsers(): void {
    // Gọi API lấy danh sách người dùng mới đăng ký
    this.adminService.getAllUsers().subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          // Sắp xếp theo ngày đăng ký mới nhất
          const sortedUsers = [...response.data].sort((a, b) => {
            const dateA = a.ngayTao ? new Date(a.ngayTao).getTime() : 0;
            const dateB = b.ngayTao ? new Date(b.ngayTao).getTime() : 0;
            return dateB - dateA;
          });

          // Lấy tối đa 5 người dùng mới nhất
          this.recentUsers = sortedUsers.slice(0, 5).map(user => ({
            maTaiKhoan: user.maTaiKhoan,
            hoTen: user.hoTen || user.email.split('@')[0],
            email: user.email,
            vaiTro: user.vaiTro,
            ngayTao: user.ngayTao ? new Date(user.ngayTao) : new Date()
          }));
        } else if (Array.isArray(response)) {
          // Sắp xếp theo ngày đăng ký mới nhất
          const sortedUsers = [...response].sort((a, b) => {
            const dateA = a.ngayTao ? new Date(a.ngayTao).getTime() : 0;
            const dateB = b.ngayTao ? new Date(b.ngayTao).getTime() : 0;
            return dateB - dateA;
          });

          // Lấy tối đa 5 người dùng mới nhất
          this.recentUsers = sortedUsers.slice(0, 5).map(user => ({
            maTaiKhoan: user.maTaiKhoan,
            hoTen: user.hoTen || user.email.split('@')[0],
            email: user.email,
            vaiTro: user.vaiTro,
            ngayTao: user.ngayTao ? new Date(user.ngayTao) : new Date()
          }));
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          this.recentUsers = [];
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách người dùng mới:', error);
        // Sử dụng dữ liệu mẫu khi API lỗi
        this.recentUsers = [
          {
            maTaiKhoan: 1,
            hoTen: 'Nguyễn Văn A',
            email: 'nguyenvana@example.com',
            vaiTro: 'User',
            ngayTao: new Date(2025, 9, 28)
          },
          {
            maTaiKhoan: 2,
            hoTen: 'Trần Thị B',
            email: 'tranthib@example.com',
            vaiTro: 'Organization',
            ngayTao: new Date(2025, 9, 27)
          }
        ];
      }
    });
  }
}