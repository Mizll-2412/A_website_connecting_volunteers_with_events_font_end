import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { TinhNguyenVienService } from '../../services/volunteer';
import { ToChucService } from '../../services/organization';
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
  
  // Random items for homepage (5 each)
  randomEvents: any[] = [];
  randomOrganizations: any[] = [];
  randomVolunteers: any[] = [];
  
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
  
  // Banner items with demo images (no buttons inside)
  bannerItems = [
    {
      id: 1,
      image: 'banner1.svg',
      title: 'Cùng nhau tạo nên thay đổi tích cực',
      description: 'Hãy là một phần của hành trình lan tỏa yêu thương và giá trị nhân văn'
    },
    {
      id: 2,
      image: 'banner2.svg',
      title: 'Kết nối - Chia sẻ - Hành động',
      description: 'Nơi những trái tim nhiệt huyết hội tụ vì một cộng đồng tốt đẹp hơn'
    },
    {
      id: 3,
      image: 'banner3.svg',
      title: 'Lan tỏa tinh thần tình nguyện',
      description: 'Mỗi hành động nhỏ đều góp phần xây dựng tương lai tươi sáng'
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
  

  activeBannerIndex = 0;
  bannerInterval: any;

  constructor(
    private router: Router, 
    private auth: AuthService, 
    private eventS: EventService, 
    private Volunteer: TinhNguyenVienService,
    private toChucService: ToChucService
  ) { }

  ngOnDestroy(): void {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  ngOnInit(): void {
    // Banner rotation
    this.startBanner();
    
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
    }

    this.loadSuKien();
    this.loadVolunteer();
    this.loadRandomData();
  }
  
  // Hàm shuffle array để lấy ngẫu nhiên
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Load random data cho homepage
  loadRandomData(): void {
    // Load random events
    this.eventS.getAllSuKien().subscribe({
      next: (data: any) => {
        const events = Array.isArray(data) ? data : (data?.data || data?.items || []);
        this.randomEvents = this.shuffleArray(events).slice(0, 5);
      },
      error: (err) => {
        console.error('Lỗi tải sự kiện:', err);
        this.randomEvents = [];
      }
    });
    
    // Load random organizations
    this.toChucService.getAllOrganizations().subscribe({
      next: (data: any) => {
        const orgs = Array.isArray(data) ? data : (data?.data || data?.items || []);
        this.randomOrganizations = this.shuffleArray(orgs).slice(0, 5);
      },
      error: (err) => {
        console.error('Lỗi tải tổ chức:', err);
        this.randomOrganizations = [];
      }
    });
    
    // Load random volunteers
    this.Volunteer.getAllVolunteers().subscribe({
      next: (data: any) => {
        const volunteers = Array.isArray(data) ? data : (data?.data || data?.items || []);
        this.randomVolunteers = this.shuffleArray(volunteers).slice(0, 5);
      },
      error: (err) => {
        console.error('Lỗi tải tình nguyện viên:', err);
        this.randomVolunteers = [];
      }
    });
  }
  
  startBanner(): void {
    this.bannerInterval = setInterval(() => {
      this.activeBannerIndex = (this.activeBannerIndex + 1) % this.bannerItems.length;
    }, 5000);
  }
  
  setBannerSlide(index: number): void {
    this.activeBannerIndex = index;
    
    // Reset timer
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.startBanner();
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
