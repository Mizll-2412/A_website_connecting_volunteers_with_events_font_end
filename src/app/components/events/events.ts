import { Component, OnInit, OnDestroy } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { SuKienResponseDto } from '../../models/event';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { ToChucResponseDto } from '../../models/organiztion';
import { TinhNguyenVien } from '../../models/volunteer';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-registered',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './events.html',
  styleUrls: ['./events.css']
})
export class EventRegisteredComponent implements OnInit, OnDestroy {
  apiUrl = 'http://localhost:5000/api/dondangky';
  apiVolunteerUrl = 'http://localhost:5000/api/tinhnguyenvien';
  
  // Thêm dữ liệu giả
  mockEvents = [
    {
      maSuKien: 101,
      tenSuKien: 'Trồng cây xanh tại công viên',
      noiDung: 'Tham gia trồng cây xanh để cải thiện môi trường sống',
      diaChi: 'Công viên Thống Nhất, Hà Nội',
      ngayBatDau: new Date('2025-11-01'),
      ngayKetThuc: new Date('2025-11-02'),
      hinhAnh: '/uploads/avatars/1_20251015005804.png',
      maToChuc: 1,
      trangThai: 'Đã duyệt',
      isFeatured: true,
      matchRate: 98,
      isOngoing: false
    },
    {
      maSuKien: 102,
      tenSuKien: 'Dạy học cho trẻ em khó khăn',
      noiDung: 'Chương trình dạy học miễn phí cho các em nhỏ có hoàn cảnh khó khăn',
      diaChi: 'Trường Tiểu học Thăng Long, Hà Nội',
      ngayBatDau: new Date('2025-10-25'),
      ngayKetThuc: new Date('2025-11-25'),
      hinhAnh: '/uploads/avatars/1_20251015111309.png',
      maToChuc: 2,
      trangThai: 'Đã duyệt',
      isFeatured: false,
      matchRate: 95,
      isOngoing: true
    }
    // Các sự kiện khác giữ nguyên...
  ];

  mockOrganizations = [
    {
      maToChuc: 1,
      tenToChuc: 'Quỹ Hy Vọng',
      gioiThieu: 'Hỗ trợ giáo dục cho trẻ em vùng cao',
      anhDaiDien: '/uploads/avatars/1_20251015005804.png',
      diaChi: 'Hà Nội',
      website: 'hyvong.org',
      email: 'info@hyvong.org',
      soDienThoai: '0123456789',
      eventCount: 12
    },
    {
      maToChuc: 2,
      tenToChuc: 'Trái Tim Nhân Ái',
      gioiThieu: 'Hỗ trợ người già neo đơn và trẻ em có hoàn cảnh khó khăn',
      anhDaiDien: '/uploads/avatars/1_20251015111309.png',
      diaChi: 'Tp. Hồ Chí Minh',
      website: 'traitimnhanai.org',
      email: 'info@traitimnhanai.org',
      soDienThoai: '0987654321',
      eventCount: 8
    },
    {
      maToChuc: 3,
      tenToChuc: 'Vì Môi Trường Xanh',
      gioiThieu: 'Bảo vệ môi trường và phát triển bền vững',
      anhDaiDien: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png',
      diaChi: 'Đà Nẵng',
      website: 'moitruongxanh.org',
      email: 'info@moitruongxanh.org',
      soDienThoai: '0369852147',
      eventCount: 15
    }
  ];

  suKiens: SuKienResponseDto[] = [];
  toChucs: ToChucResponseDto[] = [];
  filteredEvents: any[] = [];
  
  // Biến lưu trữ cho tính năng lọc
  eventTypes = ['Tất cả', 'Phù hợp với bạn', 'Nổi bật', 'Đang diễn ra'];
  selectedEventType = 'Tất cả';
  
  locations = ['Tất cả', 'Hà Nội', 'Tp. Hồ Chí Minh', 'Đà Nẵng', 'Khác'];
  selectedLocation = 'Tất cả';
  
  organizations = ['Tất cả'];
  selectedOrganization = 'Tất cả';
  
  searchKeyword = '';
  
  user?: User;
  volunteer?: TinhNguyenVien;
  isLoggedIn = false;
  username = '';
  role = '';
  showMockData = true; // Thêm biến để kiểm soát việc hiển thị mockdata

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
    }

    // Thêm tên tổ chức vào danh sách lọc
    this.mockOrganizations.forEach(org => {
      this.organizations.push(org.tenToChuc);
    });

    // Ban đầu, hiển thị tất cả sự kiện
    this.filteredEvents = [...this.mockEvents];
    
    // Thử API, nếu không hoạt động thì sử dụng mockdata
    this.loadTochuc(); // Tải tổ chức trước
    this.loadSuKien(); // Sau đó tải sự kiện
  }

  loadVolunteerInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    this.http.get<any>(`${this.apiVolunteerUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: (data: any) => {
        this.volunteer = data.data || data;
        console.log('Thông tin tình nguyện viên:', this.volunteer);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi tải thông tin tình nguyện viên:', err);
      }
    });
  }

  loadSuKien(): void {
    this.eventS.getAllSuKien().subscribe({
      next: (response: any) => {
        console.log('Dữ liệu API sự kiện:', response);
        
        // Xử lý cấu trúc dữ liệu khác nhau
        if (response && response.data && Array.isArray(response.data)) {
          this.suKiens = response.data;
        } else if (Array.isArray(response)) {
          this.suKiens = response;
        } else {
          console.log('Không có dữ liệu API hợp lệ');
          this.suKiens = [];
        }
        
        // Kiểm tra nếu có dữ liệu API thì sử dụng, không thì dùng mockdata
        if (this.suKiens.length > 0) {
          // Thêm các thuộc tính UI cần thiết
          this.suKiens = this.suKiens.map(event => ({
            ...event,
            isFeatured: Math.random() > 0.7,  // Ngẫu nhiên đánh dấu một số sự kiện là nổi bật
            isOngoing: this.isEventOngoing(event),
            matchRate: Math.floor(Math.random() * 30) + 70  // Ngẫu nhiên từ 70-100%
          }));
          
          this.filteredEvents = this.suKiens;
          this.showMockData = false; // Có dữ liệu API, không hiển thị mockdata
          console.log('Đã load sự kiện từ API');
        } else {
          // Nếu API trả về mảng rỗng, sử dụng mockdata
          console.log('API trả về mảng rỗng, sử dụng mockdata');
          this.filteredEvents = [...this.mockEvents];
          this.showMockData = true; // Không có dữ liệu API, hiển thị mockdata
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi tải danh sách sự kiện:', err);
        this.filteredEvents = [...this.mockEvents];
        this.showMockData = true; // Lỗi API, hiển thị mockdata
      }
    });
  }

  isEventOngoing(event: any): boolean {
    if (!event?.ngayBatDau || !event?.ngayKetThuc) return false;
    
    const now = new Date();
    const startDate = new Date(event.ngayBatDau);
    const endDate = new Date(event.ngayKetThuc);
    
    return now >= startDate && now <= endDate;
  }

  loadTochuc(): void {
    this.org.getAllOrganizations().subscribe({
      next: (response: any) => {
        console.log('Dữ liệu API tổ chức:', response);
        
        // Xử lý cấu trúc dữ liệu khác nhau
        if (response && response.data && Array.isArray(response.data)) {
          this.toChucs = response.data;
        } else if (Array.isArray(response)) {
          this.toChucs = response;
        } else {
          console.log('Không có dữ liệu API tổ chức hợp lệ');
          this.toChucs = [];
        }
        
        // Cập nhật danh sách tổ chức cho bộ lọc nếu có dữ liệu API
        if (this.toChucs.length > 0) {
          this.organizations = ['Tất cả'];
          this.toChucs.forEach(org => {
            if (org.tenToChuc) {
              this.organizations.push(org.tenToChuc);
            }
          });
          console.log('Đã load tổ chức từ API');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi tải danh sách tổ chức:', err);
      }
    });
  }

  // Thêm phương thức getTenToChuc
  getTenToChuc(maToChuc: number): string {
    // Tìm trong dữ liệu API trước
    if (this.toChucs && this.toChucs.length > 0) {
      const org = this.toChucs.find(o => o.maToChuc === maToChuc);
      if (org && org.tenToChuc) return org.tenToChuc;
    }
    
    // Nếu không tìm thấy trong API, tìm trong mockdata
    const mockOrg = this.mockOrganizations.find(o => o.maToChuc === maToChuc);
    return mockOrg ? mockOrg.tenToChuc : 'Tổ chức không xác định';
  }

  // Thêm phương thức viewEventDetails
  viewEventDetails(eventId: number): void {
    this.router.navigate(['/su-kien', eventId]);
  }

  // Thêm phương thức thamGiaSuKien
  thamGiaSuKien(eventId: number): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/su-kien/${eventId}` } });
      return;
    }

    // Nếu đã đăng nhập, chuyển đến trang chi tiết để đăng ký
    this.router.navigate(['/su-kien', eventId]);
  }

  resetFilters(): void {
    this.selectedEventType = 'Tất cả';
    this.selectedLocation = 'Tất cả';
    this.selectedOrganization = 'Tất cả';
    this.searchKeyword = '';
    this.applyFilters();
  }

  applyFilters(): void {
    // Bắt đầu với tất cả sự kiện (từ API nếu có, hoặc từ mockdata)
    let results = [];
    
    // Nếu có dữ liệu API và không hiển thị mockdata
    if (this.suKiens.length > 0 && !this.showMockData) {
      results = [...this.suKiens];
    } else {
      results = [...this.mockEvents];
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (this.searchKeyword) {
      const keyword = this.searchKeyword.toLowerCase();
      results = results.filter(event => 
        (event.tenSuKien && event.tenSuKien.toLowerCase().includes(keyword)) ||
        (event.noiDung && event.noiDung.toLowerCase().includes(keyword)) ||
        (event.diaChi && event.diaChi.toLowerCase().includes(keyword))
      );
    }
    
    // Lọc theo loại sự kiện
    if (this.selectedEventType === 'Phù hợp với bạn') {
      results = results.filter(event => event.matchRate && event.matchRate >= 70);
      results.sort((a, b) => (b.matchRate || 0) - (a.matchRate || 0));
    } else if (this.selectedEventType === 'Nổi bật') {
      results = results.filter(event => event.isFeatured);
    } else if (this.selectedEventType === 'Đang diễn ra') {
      results = results.filter(event => event.isOngoing);
    }
    
    // Lọc theo địa điểm
    if (this.selectedLocation !== 'Tất cả') {
      results = results.filter(event => 
        event.diaChi && event.diaChi.includes(this.selectedLocation)
      );
    }
    
    // Lọc theo tổ chức
    if (this.selectedOrganization !== 'Tất cả') {
      results = results.filter(event => this.getTenToChuc(event.maToChuc) === this.selectedOrganization);
    }
    
    this.filteredEvents = results;
  }
}