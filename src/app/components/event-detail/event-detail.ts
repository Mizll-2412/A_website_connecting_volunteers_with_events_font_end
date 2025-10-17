import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';

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
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.eventId = +params['id']; // Convert string to number
      if (this.eventId) {
        this.loadEventDetails();
      } else {
        this.router.navigate(['/su-kien']);
      }
    });

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
  }

  loadEventDetails(): void {
    // Dùng mock data trực tiếp vì API chưa hoạt động
    this.useMockData();
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

  registerForEvent(): void {
    if (!this.volunteer || !this.volunteer.maTNV) {
      alert('Vui lòng hoàn thiện hồ sơ tình nguyện viên trước khi đăng ký sự kiện');
      this.router.navigate(['/profile']); // Chuyển đến trang profile
      return;
    }

    if (this.role !== 'TinhNguyenVien') {
      alert('Chỉ tình nguyện viên mới có thể đăng ký sự kiện');
      return;
    }

    // Giả lập đăng ký thành công
    alert('Đăng ký tham gia thành công!');
    this.isRegistered = true;
  }

  cancelRegistration(): void {
    if (!this.volunteer?.maTNV || !this.eventId) return;

    // Kiểm tra xem sự kiện đã diễn ra chưa
    const now = new Date();
    const eventStart = new Date(this.event.ngayBatDau);
    
    if (now > eventStart) {
      alert('Không thể hủy đăng ký vì sự kiện đã diễn ra!');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện này?')) {
      // Giả lập hủy đăng ký thành công
      alert('Hủy đăng ký thành công!');
      this.isRegistered = false;
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