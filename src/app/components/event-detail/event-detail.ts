import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { LocalDataService, Event as LocalEvent, Organization, Volunteer, EventRegistration } from '../../services/local-data';

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
  isLoggedIn = false;
  username = '';
  role = '';
  volunteer: any = null;
  user: any = null;
  
  // Dữ liệu từ LocalStorage
  localEvent?: LocalEvent;
  localOrganization?: Organization;
  localVolunteer?: Volunteer;
  registrations: EventRegistration[] = [];
  volunteerId: number = 0;
  localSimilarEvents: LocalEvent[] = [];

  // Mock data
  mockEvent = {
    maSuKien: 101,
    tenSuKien: 'Trồng cây xanh tại công viên',
    noiDung: 'Tham gia trồng cây xanh để cải thiện môi trường sống và nâng cao ý thức bảo vệ môi trường cho cộng đồng. Chương trình do Quỹ Hy Vọng phối hợp với Sở Tài nguyên và Môi trường tổ chức, dự kiến trồng 500 cây xanh tại công viên Thống Nhất.',
    moTaChiTiet: 'Chương trình "Trồng cây xanh tại công viên" là một phần của sáng kiến "Vì một Việt Nam xanh" nhằm tăng độ phủ xanh tại các đô thị và nâng cao ý thức bảo vệ môi trường cho cộng đồng.\n\nSự kiện được tổ chức tại Công viên Thống Nhất, Hà Nội vào ngày 01/11/2025 với mục tiêu trồng 500 cây xanh các loại như phượng, sao đen, bàng và các loại cây bóng mát khác.\n\nTình nguyện viên tham gia sẽ được hướng dẫn cách trồng cây đúng kỹ thuật, chăm sóc cây trong giai đoạn đầu và có cơ hội tham gia các hoạt động giao lưu, trò chơi vận động về chủ đề môi trường.\n\nĐối tượng tham gia: Mọi đối tượng từ 15 tuổi trở lên, không yêu cầu kinh nghiệm trồng cây trước đây.\n\nVật dụng cần mang theo: Găng tay làm vườn (nếu có), mũ, khẩu trang, áo chống nắng, nước uống cá nhân.\n\nBan tổ chức sẽ cung cấp dụng cụ trồng cây, cây giống, và hướng dẫn chi tiết tại sự kiện.',
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
    quyenLoi: '- Được cung cấp dụng cụ, nước uống và bữa trưa\n- Được cấp giấy chứng nhận tham gia\n- Được tham gia các hoạt động giao lưu',
    timeline: [
      {
        time: '07:00 - 08:00',
        activity: 'Đón tiếp và đăng ký tình nguyện viên'
      },
      {
        time: '08:00 - 08:30',
        activity: 'Khai mạc sự kiện, phổ biến kế hoạch'
      },
      {
        time: '08:30 - 11:30',
        activity: 'Hoạt động trồng cây tại các khu vực đã phân công'
      },
      {
        time: '11:30 - 13:00',
        activity: 'Nghỉ trưa, dùng bữa'
      },
      {
        time: '13:00 - 15:00',
        activity: 'Các hoạt động trò chơi giao lưu về chủ đề môi trường'
      },
      {
        time: '15:00 - 16:00',
        activity: 'Tổng kết, trao giấy chứng nhận và bế mạc'
      }
    ]
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
    eventCount: 12
  };

  mockSimilarEvents = [
    {
      maSuKien: 106,
      tenSuKien: 'Nhặt rác tại bãi biển',
      noiDung: 'Làm sạch bãi biển và nâng cao ý thức bảo vệ môi trường',
      diaChi: 'Bãi biển Nha Trang, Khánh Hòa',
      ngayBatDau: new Date('2025-11-05'),
      ngayKetThuc: new Date('2025-11-06'),
      hinhAnh: '/uploads/avatars/1_20251015111309.png',
      maToChuc: 3,
      trangThai: 'Đã duyệt'
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
      trangThai: 'Đã duyệt'
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
      trangThai: 'Đã duyệt'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private eventS: EventService,
    private orgService: ToChucService,
    private http: HttpClient,
    private localDataService: LocalDataService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      
      const userInfo = localStorage.getItem('user');
      if (userInfo) {
        this.user = JSON.parse(userInfo);
        
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
        
        // Vẫn gọi các API nếu có để tương thích với code cũ
        this.loadVolunteerInfo();
      }
    }
    
    this.route.params.subscribe(params => {
      this.eventId = +params['id']; // Convert string to number
      if (this.eventId) {
        this.loadEventDetails();
      } else {
        this.router.navigate(['/su-kien']);
      }
    });
  }

  loadEventDetails(): void {
    // Lấy dữ liệu từ LocalStorage
    if (this.eventId) {
      this.loadEventFromLocalStorage(this.eventId);
    }
    
    // Nếu không có dữ liệu trong LocalStorage, dùng mock data
    if (!this.localEvent) {
      this.useMockData();
    }
  }
  
  loadEventFromLocalStorage(eventId: number): void {
    // Lấy thông tin sự kiện từ LocalStorage
    this.localEvent = this.localDataService.getEventById(eventId);
    
    if (this.localEvent) {
      // Lấy thông tin tổ chức
      this.localOrganization = this.localDataService.getOrganizationById(this.localEvent.organizationId);
      
      // Lấy danh sách sự kiện tương tự
      this.loadSimilarEventsFromLocalStorage();
      
      // Kiểm tra trạng thái đăng ký
      if (this.localVolunteer && this.localVolunteer.id) {
        this.checkRegistrationStatusFromLocalStorage();
      }
      
      // Chuyển đổi dữ liệu để hiển thị
      this.convertLocalDataToDisplayFormat();
    }
  }

  useMockData(): void {
    this.event = this.mockEvent;
    this.organization = this.mockOrganization;
    this.similarEvents = this.mockSimilarEvents;
    // Giả lập trạng thái đăng ký ngẫu nhiên
    this.isRegistered = Math.random() > 0.5;
  }

  loadVolunteerInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    // Giả lập dữ liệu tình nguyện viên
    this.volunteer = {
      maTNV: 1,
      hoTen: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      anhDaiDien: '/uploads/avatars/1_20251015005804.png'
    };
    this.checkRegistrationStatus();
  }

  checkRegistrationStatus(): void {
    if (!this.volunteer?.maTNV || !this.eventId) return;
    // Giả lập trạng thái đăng ký
    this.isRegistered = Math.random() > 0.5;
  }

  loadSimilarEventsFromLocalStorage(): void {
    // Lấy tất cả sự kiện
    const allEvents = this.localDataService.getEvents();
    
    if (this.localEvent) {
      // Lọc các sự kiện cùng tổ chức hoặc cùng lĩnh vực nhưng không phải sự kiện hiện tại
      this.localSimilarEvents = allEvents.filter(event => 
        event.id !== this.localEvent?.id && 
        (event.organizationId === this.localEvent?.organizationId || 
         event.fields.some(field => this.localEvent?.fields.includes(field)))
      ).slice(0, 3); // Chỉ lấy 3 sự kiện tương tự
    }
  }
  
  checkRegistrationStatusFromLocalStorage(): void {
    if (!this.volunteerId || !this.eventId) return;
    
    // Kiểm tra xem TNV đã đăng ký sự kiện này chưa
    this.isRegistered = this.registrations.some(reg => reg.eventId === this.eventId);
  }
  
  convertLocalDataToDisplayFormat(): void {
    if (!this.localEvent || !this.localOrganization) return;
    
    // Chuyển đổi dữ liệu sự kiện để hiển thị
    const approvedRegistrations = this.localDataService.getRegistrationsByEvent(this.localEvent.id)
                                     .filter(r => r.status === 'approved').length;
    
    // Tạo matchRate giả lập
    let matchRate = 0;
    if (this.localVolunteer) {
      const commonSkills = this.localEvent.requireSkills.filter(skill => 
        this.localVolunteer?.skills.includes(skill));
      const commonFields = this.localEvent.fields.filter(field => 
        this.localVolunteer?.fields.includes(field));
        
      if (this.localEvent.requireSkills.length > 0 && this.localEvent.fields.length > 0) {
        matchRate = Math.round((commonSkills.length / this.localEvent.requireSkills.length * 0.6 + 
                          commonFields.length / this.localEvent.fields.length * 0.4) * 100);
      }
    } else {
      // Nếu không có TNV, gán giá trị ngẫu nhiên
      matchRate = Math.round(Math.random() * 30) + 60; // 60-90
    }
    
    // Tạo timeline giả lập
    const timeline = [
      { time: '08:00 - 09:00', activity: 'Đón tiếp và đăng ký tình nguyện viên' },
      { time: '09:00 - 12:00', activity: 'Hoạt động chính' },
      { time: '12:00 - 13:00', activity: 'Nghỉ trưa' },
      { time: '13:00 - 16:30', activity: 'Hoạt động chiều' }
    ];
    
    // Cập nhật dữ liệu hiển thị
    this.event = {
      maSuKien: this.localEvent.id,
      tenSuKien: this.localEvent.title,
      noiDung: this.localEvent.description,
      moTaChiTiet: this.localEvent.description,
      diaChi: this.localEvent.location,
      ngayBatDau: new Date(this.localEvent.startDate),
      ngayKetThuc: new Date(this.localEvent.endDate),
      hinhAnh: '/uploads/avatars/1_20251015005804.png', // Default image
      soLuongTNV: this.localEvent.maxVolunteers,
      soLuongDaDangKy: approvedRegistrations,
      maToChuc: this.localEvent.organizationId,
      trangThai: this.localEvent.status === 'active' ? 'Đã duyệt' : 'Đã hủy',
      matchRate: matchRate,
      yeuCau: 'Không yêu cầu kinh nghiệm, phù hợp với mọi đối tượng từ 15 tuổi trở lên',
      quyenLoi: '- Được cung cấp dụng cụ, nước uống và bữa trưa\n- Được cấp giấy chứng nhận tham gia\n- Được tham gia các hoạt động giao lưu',
      timeline: timeline
    };
    
    // Cập nhật thông tin tổ chức
    this.organization = {
      maToChuc: this.localOrganization.id,
      tenToChuc: this.localOrganization.name,
      gioiThieu: this.localOrganization.description || 'Không có mô tả',
      anhDaiDien: this.localOrganization.logoUrl || '/uploads/avatars/1_20251015005804.png',
      diaChi: this.localOrganization.address || 'Hà Nội',
      website: 'example.org',
      email: this.localOrganization.email,
      soDienThoai: this.localOrganization.phone || '0123456789',
      eventCount: this.localOrganization.eventCount
    };
    
    // Cập nhật sự kiện tương tự
    if (this.localSimilarEvents.length > 0) {
      this.similarEvents = this.localSimilarEvents.map(event => ({
        maSuKien: event.id,
        tenSuKien: event.title,
        noiDung: event.description,
        diaChi: event.location,
        ngayBatDau: new Date(event.startDate),
        ngayKetThuc: new Date(event.endDate),
        hinhAnh: '/uploads/avatars/1_20251015111309.png',
        maToChuc: event.organizationId,
        trangThai: 'Đã duyệt'
      }));
    } else {
      // Nếu không có sự kiện tương tự trong localStorage, dùng mock data
      this.similarEvents = this.mockSimilarEvents;
    }
  }

  registerForEvent(): void {
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
    
    if (!this.eventId) {
      alert('Không tìm thấy thông tin sự kiện');
      return;
    }
    
    // Kiểm tra đã đăng ký chưa
    const isAlreadyRegistered = this.registrations.some(reg => reg.eventId === this.eventId);
    if (isAlreadyRegistered) {
      alert('Bạn đã đăng ký sự kiện này rồi');
      return;
    }

    // Đăng ký sự kiện trong localStorage
    const registration = this.localDataService.createRegistration({
      eventId: this.eventId,
      volunteerId: this.localVolunteer.id,
      volunteerName: this.localVolunteer.name,
      status: 'pending'
    });

    if (registration) {
      alert('Đăng ký tham gia thành công! Vui lòng đợi ban tổ chức phê duyệt.');
      // Cập nhật lại danh sách đăng ký
      this.registrations = this.localDataService.getRegistrationsByVolunteer(this.localVolunteer.id);
      // Cập nhật trạng thái đăng ký
      this.isRegistered = true;
    } else {
      alert('Có lỗi xảy ra khi đăng ký. Hãy thử lại sau!');
    }
  }

  cancelRegistration(): void {
    if (!this.localVolunteer?.id || !this.eventId) return;

    // Kiểm tra xem sự kiện đã diễn ra chưa
    const now = new Date();
    const eventStart = new Date(this.event.ngayBatDau);
    
    if (now > eventStart) {
      alert('Không thể hủy đăng ký vì sự kiện đã diễn ra!');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện này?')) {
      // Tìm đăng ký để hủy
      const registration = this.registrations.find(reg => reg.eventId === this.eventId);
      if (registration) {
        const success = this.localDataService.cancelRegistration(registration.id, 'Hủy đăng ký theo yêu cầu của TNV');
        if (success) {
          alert('Hủy đăng ký thành công!');
          this.isRegistered = false;
          // Cập nhật lại danh sách đăng ký
          this.registrations = this.localDataService.getRegistrationsByVolunteer(this.localVolunteer.id);
        } else {
          alert('Không thể hủy đăng ký. Hãy thử lại sau!');
        }
      } else {
        alert('Không tìm thấy thông tin đăng ký!');
      }
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  eventHasStarted(): boolean {
    const now = new Date();
    const eventStart = new Date(this.event?.ngayBatDau || this.mockEvent.ngayBatDau);
    return now >= eventStart;
  }

  navigateToOtherEvent(eventId: number): void {
    this.router.navigate(['/su-kien', eventId]);
  }
}