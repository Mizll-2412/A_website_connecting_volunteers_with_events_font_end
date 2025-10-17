import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { LocalDataService, Event as LocalEvent, Organization, Volunteer, EventRegistration } from '../../services/local-data';
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
    },
    {
      maSuKien: 103,
      tenSuKien: 'Quyên góp quần áo mùa đông',
      noiDung: 'Thu thập quần áo ấm cho người dân vùng cao',
      diaChi: 'Nhà Văn hóa Thanh niên, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-10-30'),
      ngayKetThuc: new Date('2025-11-15'),
      hinhAnh: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png',
      maToChuc: 1,
      trangThai: 'Đã duyệt',
      isFeatured: true,
      matchRate: 90,
      isOngoing: true
    },
    {
      maSuKien: 104,
      tenSuKien: 'Hiến máu nhân đạo',
      noiDung: 'Chương trình hiến máu tình nguyện',
      diaChi: 'Bệnh viện Bạch Mai, Hà Nội',
      ngayBatDau: new Date('2025-11-15'),
      ngayKetThuc: new Date('2025-11-15'),
      hinhAnh: '/uploads/avatars/f81ee63b-4b0b-49c8-a2e9-5335474d0e23.png',
      maToChuc: 3,
      trangThai: 'Đã duyệt',
      isFeatured: false,
      matchRate: 85,
      isOngoing: false
    },
    {
      maSuKien: 105,
      tenSuKien: 'Chạy bộ gây quỹ từ thiện',
      noiDung: 'Chương trình chạy bộ gây quỹ ủng hộ trẻ em mồ côi',
      diaChi: 'Công viên 23/9, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-10-22'),
      ngayKetThuc: new Date('2025-10-22'),
      hinhAnh: '/uploads/avatars/1_20251015005804.png',
      maToChuc: 2,
      trangThai: 'Đã duyệt',
      isFeatured: true,
      matchRate: 75,
      isOngoing: false
    },
    {
      maSuKien: 106,
      tenSuKien: 'Nhặt rác tại bãi biển',
      noiDung: 'Làm sạch bãi biển và nâng cao ý thức bảo vệ môi trường',
      diaChi: 'Bãi biển Nha Trang, Khánh Hòa',
      ngayBatDau: new Date('2025-11-05'),
      ngayKetThuc: new Date('2025-11-06'),
      hinhAnh: '/uploads/avatars/1_20251015111309.png',
      maToChuc: 3,
      trangThai: 'Đã duyệt',
      isFeatured: false,
      matchRate: 80,
      isOngoing: false
    },
    {
      maSuKien: 107,
      tenSuKien: 'Hội chợ từ thiện',
      noiDung: 'Gây quỹ hỗ trợ người già neo đơn',
      diaChi: 'Cung Văn hóa Hữu nghị Việt Xô, Hà Nội',
      ngayBatDau: new Date('2025-10-28'),
      ngayKetThuc: new Date('2025-11-02'),
      hinhAnh: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png',
      maToChuc: 2,
      trangThai: 'Đã duyệt',
      isFeatured: true,
      matchRate: 70,
      isOngoing: true
    },
    {
      maSuKien: 108,
      tenSuKien: 'Khám bệnh miễn phí',
      noiDung: 'Chương trình khám bệnh miễn phí cho người cao tuổi',
      diaChi: 'Trung tâm Y tế quận 10, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-11-10'),
      ngayKetThuc: new Date('2025-11-11'),
      hinhAnh: '/uploads/avatars/f81ee63b-4b0b-49c8-a2e9-5335474d0e23.png',
      maToChuc: 1,
      trangThai: 'Đã duyệt',
      isFeatured: false,
      matchRate: 65,
      isOngoing: false
    }
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
  
  // Dữ liệu từ LocalStorage
  localEvents: LocalEvent[] = [];
  localOrganizations: Organization[] = [];
  localVolunteer?: Volunteer;
  registrations: EventRegistration[] = [];
  
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
  volunteerId: number = 0;

  constructor(
    private router: Router,
    private auth: AuthService,
    private eventS: EventService,
    private org: ToChucService,
    private http: HttpClient,
    private localDataService: LocalDataService
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
      
      // Lấy thông tin TNV từ LocalStorage
      if (this.user?.maTaiKhoan) {
        const localVolunteer = this.localDataService.getVolunteerByUserId(this.user.maTaiKhoan);
        if (localVolunteer) {
          this.localVolunteer = localVolunteer;
          this.volunteerId = localVolunteer.id;
          // Lấy các đăng ký của TNV
          this.registrations = this.localDataService.getRegistrationsByVolunteer(localVolunteer.id);
        }
      }
    }
    
    // Lấy dữ liệu từ LocalStorage
    this.loadLocalData();
    
    // Thử API, nếu không hoạt động thì sử dụng LocalStorage
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
      }
    });
  }

  loadSuKien(): void {
    this.eventS.getAllSuKien().subscribe({
      next: (data: any) => {
        console.log('Dữ liệu API:', data);
        if (Array.isArray(data) && data.length > 0) {
          this.suKiens = data;
        } else if (data && (data.data || data.items) && (data.data.length > 0 || data.items.length > 0)) {
          this.suKiens = data.data || data.items;
        }
        // Nếu API không trả về dữ liệu, giữ nguyên mockdata đã có
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
        if (Array.isArray(data) && data.length > 0) {
          this.toChucs = data;
        } else if (data && (data.data || data.items) && (data.data.length > 0 || data.items.length > 0)) {
          this.toChucs = data.data || data.items;
        }
        // Nếu API không trả về dữ liệu, giữ nguyên mockdata đã có
      },
      error: (err) => {
        console.error('Lỗi tải danh sách tổ chức:', err);
      }
    });
  }

  loadLocalData(): void {
    // Lấy dữ liệu sự kiện và tổ chức từ LocalStorage
    this.localEvents = this.localDataService.getEvents();
    this.localOrganizations = this.localDataService.getOrganizations();
    
    // Cập nhật danh sách tổ chức cho bộ lọc
    this.organizations = ['Tất cả'];
    this.localOrganizations.forEach(org => {
      this.organizations.push(org.name);
    });
    
    // Chuyển đổi dữ liệu để hiển thị
    this.convertLocalDataToDisplayFormat();
  }
  
  convertLocalDataToDisplayFormat(): void {
    // Chuyển đổi dữ liệu từ LocalEvent sang format hiển thị
    this.filteredEvents = this.localEvents.map(event => {
      const now = new Date();
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const isOngoing = now >= startDate && now <= endDate;
      
      // Tính matchRate giả lập dựa trên kỹ năng và lĩnh vực nếu có TNV đăng nhập
      let matchRate = 0;
      if (this.localVolunteer) {
        const commonSkills = event.requireSkills.filter(skill => 
          this.localVolunteer?.skills.includes(skill));
        const commonFields = event.fields.filter(field => 
          this.localVolunteer?.fields.includes(field));
          
        if (event.requireSkills.length > 0 && event.fields.length > 0) {
          matchRate = Math.round((commonSkills.length / event.requireSkills.length * 0.6 + 
                             commonFields.length / event.fields.length * 0.4) * 100);
        }
      } else {
        // Nếu không có TNV, gán giá trị ngẫu nhiên
        matchRate = Math.round(Math.random() * 30) + 60; // 60-90
      }
      
      // Kiểm tra đã đăng ký chưa
      const isRegistered = this.registrations.some(reg => reg.eventId === event.id);
      
      return {
        maSuKien: event.id,
        tenSuKien: event.title,
        noiDung: event.description,
        diaChi: event.location,
        ngayBatDau: new Date(event.startDate),
        ngayKetThuc: new Date(event.endDate),
        hinhAnh: '/uploads/avatars/1_20251015005804.png', // Default image
        maToChuc: event.organizationId,
        trangThai: event.status === 'active' ? 'Đã duyệt' : 'Đã hủy',
        isFeatured: event.id % 2 === 0, // Giả lập: các ID chẵn là nổi bật
        matchRate: matchRate,
        isOngoing: isOngoing,
        isRegistered: isRegistered
      };
    });
  }
  
  applyFilters(): void {
    let results = this.convertLocalEventsToDisplay();
    
    // Lọc theo loại sự kiện
    if (this.selectedEventType === 'Phù hợp với bạn') {
      results = results.filter(event => event.matchRate >= 70);
      results.sort((a, b) => b.matchRate - a.matchRate);
    } else if (this.selectedEventType === 'Nổi bật') {
      results = results.filter(event => event.isFeatured);
    } else if (this.selectedEventType === 'Đang diễn ra') {
      results = results.filter(event => event.isOngoing);
    }
    
    // Lọc theo địa điểm
    if (this.selectedLocation !== 'Tất cả') {
      results = results.filter(event => event.diaChi.includes(this.selectedLocation));
    }
    
    // Lọc theo tổ chức
    if (this.selectedOrganization !== 'Tất cả') {
      const org = this.localOrganizations.find(o => o.name === this.selectedOrganization);
      if (org) {
        results = results.filter(event => event.maToChuc === org.id);
      }
    }
    
    // Lọc theo từ khóa tìm kiếm
    if (this.searchKeyword.trim() !== '') {
      const keyword = this.searchKeyword.toLowerCase().trim();
      results = results.filter(event => 
        event.tenSuKien.toLowerCase().includes(keyword) || 
        event.noiDung.toLowerCase().includes(keyword) ||
        event.diaChi.toLowerCase().includes(keyword)
      );
    }
    
    this.filteredEvents = results;
  }
  
  convertLocalEventsToDisplay(): any[] {
    return this.localEvents.map(event => {
      const now = new Date();
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const isOngoing = now >= startDate && now <= endDate;
      
      // Tính matchRate giả lập dựa trên kỹ năng và lĩnh vực nếu có TNV đăng nhập
      let matchRate = 0;
      if (this.localVolunteer) {
        const commonSkills = event.requireSkills.filter(skill => 
          this.localVolunteer?.skills.includes(skill));
        const commonFields = event.fields.filter(field => 
          this.localVolunteer?.fields.includes(field));
          
        if (event.requireSkills.length > 0 && event.fields.length > 0) {
          matchRate = Math.round((commonSkills.length / event.requireSkills.length * 0.6 + 
                             commonFields.length / event.fields.length * 0.4) * 100);
        }
      } else {
        // Nếu không có TNV, gán giá trị ngẫu nhiên
        matchRate = Math.round(Math.random() * 30) + 60; // 60-90
      }
      
      // Kiểm tra đã đăng ký chưa
      const isRegistered = this.registrations.some(reg => reg.eventId === event.id);
      
      return {
        maSuKien: event.id,
        tenSuKien: event.title,
        noiDung: event.description,
        diaChi: event.location,
        ngayBatDau: new Date(event.startDate),
        ngayKetThuc: new Date(event.endDate),
        hinhAnh: '/uploads/avatars/1_20251015005804.png', // Default image
        maToChuc: event.organizationId,
        trangThai: event.status === 'active' ? 'Đã duyệt' : 'Đã hủy',
        isFeatured: event.id % 2 === 0, // Giả lập: các ID chẵn là nổi bật
        matchRate: matchRate,
        isOngoing: isOngoing,
        isRegistered: isRegistered
      };
    });
  }

  resetFilters(): void {
    this.selectedEventType = 'Tất cả';
    this.selectedLocation = 'Tất cả';
    this.selectedOrganization = 'Tất cả';
    this.searchKeyword = '';
    this.convertLocalDataToDisplayFormat();
  }

  thamGiaSuKien(maSuKien: number): void {
    // Kiểm tra xem đã có thông tin TNV chưa
    if (!this.localVolunteer) {
      alert('Vui lòng hoàn thiện hồ sơ tình nguyện viên trước khi đăng ký sự kiện');
      this.router.navigate(['/volunteer-profile']); // Chuyển đến trang profile
      return;
    }

    if (this.role !== 'User') {
      alert('Chỉ tình nguyện viên mới có thể đăng ký sự kiện');
      return;
    }
    
    // Kiểm tra đã đăng ký chưa
    const isAlreadyRegistered = this.registrations.some(reg => reg.eventId === maSuKien);
    if (isAlreadyRegistered) {
      alert('Bạn đã đăng ký sự kiện này rồi');
      return;
    }

    // Đăng ký sự kiện trong localStorage
    const registration = this.localDataService.createRegistration({
      eventId: maSuKien,
      volunteerId: this.localVolunteer.id,
      volunteerName: this.localVolunteer.name,
      status: 'pending'
    });

    if (registration) {
      alert('Đăng ký tham gia thành công! Vui lòng đợi ban tổ chức phê duyệt.');
      // Cập nhật lại danh sách đăng ký
      this.registrations = this.localDataService.getRegistrationsByVolunteer(this.localVolunteer.id);
      // Cập nhật hiển thị
      this.convertLocalDataToDisplayFormat();
    } else {
      alert('Có lỗi xảy ra khi đăng ký. Hãy thử lại sau!');
    }
    
    // Thử gọi API
    if (this.volunteer && this.volunteer.maTNV) {
      const donDangKy = {
        maTNV: this.volunteer.maTNV,
        maSuKien: maSuKien,
        ghiChu: ''
      };
      
      this.http.post(this.apiUrl, donDangKy).subscribe({
        next: (res: any) => {
          console.log('API đăng ký thành công:', res);
        },
        error: (err) => {
          console.error('Lỗi đăng ký qua API:', err);
        }
      });
    }
  }

  getTenToChuc(maToChuc: number): string {
    // Kiểm tra trong dữ liệu LocalStorage
    const toChuc = this.localOrganizations.find(tc => tc.id === maToChuc);
    if (toChuc) return toChuc.name;
    
    // Nếu không có, kiểm tra trong mockdata cũ
    const mockToChuc = this.mockOrganizations.find(tc => tc.maToChuc === maToChuc);
    return mockToChuc?.tenToChuc || 'Chưa có thông tin';
  }

  viewEventDetails(maSuKien: number): void {
    this.router.navigate(['/su-kien', maSuKien]);
  }
}