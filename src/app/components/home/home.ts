import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { TinhNguyenVienService } from '../../services/volunteer';
import { SuKienResponseDto } from '../../models/event';
import { TinhNguyenVienResponeDTos } from '../../models/volunteer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  suKiens: SuKienResponseDto[] = [];
  tinhNguyenViens: TinhNguyenVienResponeDTos[] = [];
  mockVolunteers = [
    {
      maTNV: 1,
      hoTen: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      anhDaiDien: '/uploads/avatars/1_20251015005804.png',
      diemTrungBinh: 4.8,
      suKienDaThamGia: 12
    },
    {
      maTNV: 2,
      hoTen: 'Trần Thị B',
      email: 'tranthib@gmail.com',
      anhDaiDien: '/uploads/avatars/1_20251015111309.png',
      diemTrungBinh: 4.9,
      suKienDaThamGia: 15
    },
    {
      maTNV: 3,
      hoTen: 'Lê Văn C',
      email: 'levanc@gmail.com',
      anhDaiDien: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png',
      diemTrungBinh: 4.7,
      suKienDaThamGia: 8
    },
    {
      maTNV: 4,
      hoTen: 'Phạm Thị D',
      email: 'phamthid@gmail.com',
      anhDaiDien: '/uploads/avatars/f81ee63b-4b0b-49c8-a2e9-5335474d0e23.png',
      diemTrungBinh: 5.0,
      suKienDaThamGia: 20
    }
  ];
  user: any;
  isLoggedIn = false;
  username = '';
  role = '';
  
  // Mock data cho carousel
  carouselItems = [
    {
      id: 1,
      imageUrl: 'tinhnguyen.png',
      title: 'Cùng nhau tạo nên thay đổi',
      description: 'Tham gia các dự án tình nguyện để tạo nên sự khác biệt'
    },
    {
      id: 2,
      imageUrl: 'tinhnguyen2.jpg',
      title: 'Kết nối - Chia sẻ - Hành động',
      description: 'Tìm kiếm các dự án phù hợp với khả năng của bạn'
    },
    {
      id: 3,
      imageUrl: 'corporate.png',
      title: 'Lan tỏa yêu thương',
      description: 'Cùng chung tay xây dựng cộng đồng tốt đẹp hơn'
    }
  ];
  
  // Mock data cho các dự án phù hợp
  suitableProjects = [
    {
      maSuKien: 101,
      tenSuKien: 'Trồng cây xanh tại công viên',
      noiDung: 'Tham gia trồng cây xanh để cải thiện môi trường sống',
      diaChi: 'Công viên Thống Nhất, Hà Nội',
      ngayBatDau: new Date('2025-11-01'),
      hinhAnh: '/uploads/avatars/1_20251015005804.png',
      matchRate: 98
    },
    {
      maSuKien: 102,
      tenSuKien: 'Dạy học cho trẻ em khó khăn',
      noiDung: 'Chương trình dạy học miễn phí cho các em nhỏ có hoàn cảnh khó khăn',
      diaChi: 'Trường Tiểu học Thăng Long, Hà Nội',
      ngayBatDau: new Date('2025-10-25'),
      hinhAnh: '/uploads/avatars/1_20251015111309.png',
      matchRate: 95
    },
    {
      maSuKien: 103,
      tenSuKien: 'Quyên góp quần áo mùa đông',
      noiDung: 'Thu thập quần áo ấm cho người dân vùng cao',
      diaChi: 'Nhà Văn hóa Thanh niên, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-10-30'),
      hinhAnh: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png',
      matchRate: 90
    },
    {
      maSuKien: 104,
      tenSuKien: 'Hiến máu nhân đạo',
      noiDung: 'Chương trình hiến máu tình nguyện',
      diaChi: 'Bệnh viện Bạch Mai, Hà Nội',
      ngayBatDau: new Date('2025-11-15'),
      hinhAnh: '/uploads/avatars/f81ee63b-4b0b-49c8-a2e9-5335474d0e23.png',
      matchRate: 85
    }
  ];
  
  // Mock data cho top dự án nổi bật
  topProjects = [
    {
      maSuKien: 201,
      tenSuKien: 'Chạy bộ gây quỹ từ thiện',
      noiDung: 'Chương trình chạy bộ gây quỹ ủng hộ trẻ em mồ côi',
      diaChi: 'Công viên 23/9, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-10-22'),
      hinhAnh: '/uploads/avatars/1_20251015005804.png',
      luotXem: 1250
    },
    {
      maSuKien: 202,
      tenSuKien: 'Nhặt rác tại bãi biển',
      noiDung: 'Làm sạch bãi biển và nâng cao ý thức bảo vệ môi trường',
      diaChi: 'Bãi biển Nha Trang, Khánh Hòa',
      ngayBatDau: new Date('2025-11-05'),
      hinhAnh: '/uploads/avatars/1_20251015111309.png',
      luotXem: 980
    },
    {
      maSuKien: 203,
      tenSuKien: 'Hội chợ từ thiện',
      noiDung: 'Gây quỹ hỗ trợ người già neo đơn',
      diaChi: 'Cung Văn hóa Hữu nghị Việt Xô, Hà Nội',
      ngayBatDau: new Date('2025-10-28'),
      hinhAnh: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png',
      luotXem: 820
    },
    {
      maSuKien: 204,
      tenSuKien: 'Khám bệnh miễn phí',
      noiDung: 'Chương trình khám bệnh miễn phí cho người cao tuổi',
      diaChi: 'Trung tâm Y tế quận 10, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-11-10'),
      hinhAnh: '/uploads/avatars/f81ee63b-4b0b-49c8-a2e9-5335474d0e23.png',
      luotXem: 750
    }
  ];
  
  // Mock data cho sự kiện đang diễn ra
  ongoingEvents = [
    {
      maSuKien: 301,
      tenSuKien: 'Tình nguyện viên tại bệnh viện',
      noiDung: 'Hỗ trợ các hoạt động chăm sóc bệnh nhân',
      diaChi: 'Bệnh viện Nhi Trung ương, Hà Nội',
      ngayBatDau: new Date('2025-10-15'),
      ngayKetThuc: new Date('2025-10-25'),
      hinhAnh: '/uploads/avatars/1_20251015005804.png'
    },
    {
      maSuKien: 302,
      tenSuKien: 'Dọn dẹp khu phố',
      noiDung: 'Làm đẹp khu phố và trồng hoa',
      diaChi: 'Phường Bến Nghé, Quận 1, Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-10-12'),
      ngayKetThuc: new Date('2025-10-20'),
      hinhAnh: '/uploads/avatars/1_20251015111309.png'
    },
    {
      maSuKien: 303,
      tenSuKien: 'Hướng dẫn sử dụng máy tính cho người cao tuổi',
      noiDung: 'Dạy người cao tuổi cách sử dụng máy tính và internet',
      diaChi: 'Trung tâm Văn hóa quận Thanh Xuân, Hà Nội',
      ngayBatDau: new Date('2025-10-10'),
      ngayKetThuc: new Date('2025-10-24'),
      hinhAnh: '/uploads/avatars/42e7380a-e4b0-4762-928a-a9be0d18abca.png'
    },
    {
      maSuKien: 304,
      tenSuKien: 'Phát quà cho người vô gia cư',
      noiDung: 'Phát thực phẩm và nhu yếu phẩm cho người vô gia cư',
      diaChi: 'Các khu vực trung tâm Tp. Hồ Chí Minh',
      ngayBatDau: new Date('2025-10-14'),
      ngayKetThuc: new Date('2025-10-21'),
      hinhAnh: '/uploads/avatars/f81ee63b-4b0b-49c8-a2e9-5335474d0e23.png'
    }
  ];

  activeCarouselIndex = 0;
  carouselInterval: any;

  constructor(private router: Router, private auth: AuthService, private eventS: EventService, private Volunteer: TinhNguyenVienService) { }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  ngOnInit(): void {
    // Carousel rotation
    this.startCarousel();
    
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const header = document.querySelector('.header') as HTMLElement;
      const currentScroll = window.pageYOffset;
      if (currentScroll > lastScroll) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }
      lastScroll = currentScroll;
    });

    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
    }

    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
    } else {
      this.router.navigate(['/login']);
    }

    this.loadSuKien();
    this.loadVolunteer();
  }
  
  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.activeCarouselIndex = (this.activeCarouselIndex + 1) % this.carouselItems.length;
    }, 5000);
  }
  
  setCarouselSlide(index: number): void {
    this.activeCarouselIndex = index;
    
    // Reset timer
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    }
  }
  
  loadVolunteer(): void {
    // Sử dụng mock data thay vì API vì API chưa hoạt động
    this.tinhNguyenViens = this.mockVolunteers;
    
    /* Phần code cho API khi hoạt động
    this.Volunteer.getAllTinhNguyen().subscribe({
      next: (data: any) => {
        console.log("Dữ liệu api tình nguyện", data);
        this.tinhNguyenViens = Array.isArray(data) ? data : data.data || data.items || [];
      }, error: (err) => {
        console.error('Lỗi tải danh sách sự kiện:', err);
      }
    });
    */
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

  logout(): void {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
