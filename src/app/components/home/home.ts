import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { TinhNguyenVienService } from '../../services/volunteer';
import { ToChucService } from '../../services/organization';
import { RegistrationService } from '../../services/registration';
import { SuKienResponseDto } from '../../models/event';
import { TinhNguyenVienResponeDTos } from '../../models/volunteer';
import { EventCardComponent } from '../shared/event-card/event-card';
import { OrganizationCardComponent } from '../shared/organization-card/organization-card';
import { VolunteerProfileViewerComponent } from '../volunteer-profile-viewer/volunteer-profile-viewer';
import { getImageUrl } from '../../utils/image-url.util';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, EventCardComponent, OrganizationCardComponent, VolunteerProfileViewerComponent],
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
  
  @ViewChild(VolunteerProfileViewerComponent) volunteerProfileViewer?: VolunteerProfileViewerComponent;
  
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
  
  // Banner items - có thể sử dụng video hoặc image
  // 
  // 📹 CÁCH SỬ DỤNG VIDEO:
  // 1. Đặt file video vào thư mục: src/assets/banners/
  // 2. Thay 'banner.mp4' bên dưới bằng tên file video của bạn
  //    Ví dụ: nếu file của bạn là "my-video.mp4" thì viết: video: 'my-video.mp4'
  // 
  // 🖼️ CÁCH SỬ DỤNG ẢNH:
  // 1. Đặt file ảnh vào thư mục: src/assets/banners/
  // 2. Thay 'banner1.svg' bằng tên file ảnh của bạn
  //    Ví dụ: image: 'my-image.jpg'
  //
  bannerItems: Array<{
    id: number;
    video?: string;
    image?: string;
    title: string;
    description: string;
  }> = [
    {
      id: 1,
      video: 'banner.mp4', 
      title: 'Cùng nhau tạo nên thay đổi tích cực',
      description: 'Hãy là một phần của hành trình lan tỏa yêu thương và giá trị nhân văn'
    },
    {
      id: 2,
      image: 'banner1.png', 
      title: 'Kết nối - Chia sẻ - Hành động',
      description: 'Nơi những trái tim nhiệt huyết hội tụ vì một cộng đồng tốt đẹp hơn'
    },
    {
      id: 3,
      image: 'banner2.png',
      title: 'Lan tỏa tinh thần tình nguyện',
      description: 'Mỗi hành động nhỏ đều góp phần xây dựng tương lai tươi sáng'
    }
  ];
  
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
    private toChucService: ToChucService,
    private registrationService: RegistrationService
  ) { }

  ngOnDestroy(): void {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  ngOnInit(): void {
    // Banner rotation
    this.startBanner();
    
    // Play video của slide đầu tiên sau khi view render
    setTimeout(() => {
      this.playActiveVideo();
    }, 500);
    
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
      // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
      this.user = this.auth.getUser();
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
  
  // Helper function để xác định trạng thái sự kiện
  getEventStatus(event: any): string {
    if (event?.trangThaiHienThi) {
      return event.trangThaiHienThi;
    }
    
    if (event?.trangThai === 'Đã kết thúc' || event?.trangThai === 'Sự kiện đã kết thúc') {
      return 'Sự kiện đã kết thúc';
    }
    
    const now = new Date();
    const startDate = event?.ngayBatDau ? new Date(event.ngayBatDau) : null;
    const endDate = event?.ngayKetThuc ? new Date(event.ngayKetThuc) : null;
    const recruitStart = event?.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
    const recruitEnd = event?.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
    
    if (endDate && endDate < now) {
      return 'Sự kiện đã kết thúc';
    }
    
    if (startDate && startDate <= now && endDate && now <= endDate) {
      return 'Đang diễn ra';
    }
    
    if (recruitStart && recruitEnd && recruitStart <= now && now <= recruitEnd) {
      return 'Đang tuyển';
    }
    
    return 'Sắp diễn ra';
  }

  // Helper function để kiểm tra sự kiện đã hết hạn tuyển
  isEventRecruitmentExpired(event: any): boolean {
    const now = new Date();
    const recruitEnd = event?.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
    return recruitEnd !== null && recruitEnd < now;
  }

  // Helper function để kiểm tra sự kiện đã kết thúc
  isEventEnded(event: any): boolean {
    const now = new Date();
    if (event?.trangThai === 'Đã kết thúc' || event?.trangThai === 'Sự kiện đã kết thúc') {
      return true;
    }
    const endDate = event?.ngayKetThuc ? new Date(event.ngayKetThuc) : null;
    return endDate !== null && endDate < now;
  }

  // Load random data cho homepage
  loadRandomData(): void {
    // Load random events
    this.eventS.getAllSuKien().subscribe({
      next: (data: any) => {
        const events = Array.isArray(data) ? data : (data?.data || data?.items || []);
        
        // Lọc bỏ sự kiện đã kết thúc và đã hết hạn tuyển
        const activeEvents = events.filter((event: any) => {
          return !this.isEventEnded(event) && !this.isEventRecruitmentExpired(event);
        });
        
        // Sắp xếp theo ngày tạo giảm dần (sự kiện mới nhất lên đầu)
        const sortedEvents = activeEvents.sort((a: any, b: any) => {
          const dateA = a?.ngayTao ? new Date(a.ngayTao).getTime() : 0;
          const dateB = b?.ngayTao ? new Date(b.ngayTao).getTime() : 0;
          return dateB - dateA; // Sắp xếp giảm dần (mới nhất trước)
        });
        
        // Lấy 5 sự kiện đầu tiên sau khi đã sắp xếp
        this.randomEvents = sortedEvents.slice(0, 5);
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
        const shuffledVolunteers = this.shuffleArray(volunteers);
        
        // Khởi tạo giá trị mặc định cho tất cả volunteers
        shuffledVolunteers.forEach((volunteer: any) => {
          volunteer.dangThamGia = 0;
          volunteer.tongSuKienThamGia = volunteer.tongSuKienThamGia || volunteer.suKienDaThamGia || 0;
          volunteer.suKienDaThamGia = volunteer.tongSuKienThamGia || volunteer.suKienDaThamGia || 0;
        });
        
        // Load số sự kiện đã tham gia cho tất cả volunteers (luôn load bất kể role)
        const loadPromises: Promise<void>[] = [];
        
        shuffledVolunteers.forEach((volunteer: any) => {
          // Khởi tạo giá trị mặc định cho tất cả volunteers
          if (volunteer.dangThamGia === undefined) {
            volunteer.dangThamGia = 0;
          }
          
          if (volunteer.maTNV) {
            const promise = new Promise<void>((resolve) => {
              this.loadVolunteerEventCount(volunteer, () => resolve());
            });
            loadPromises.push(promise);
          } else {
            // Nếu không có maTNV, vẫn resolve ngay để không block
            loadPromises.push(Promise.resolve());
          }
        });
        
        // Đợi tất cả API calls hoàn thành, sau đó sắp xếp và lấy top 5
        Promise.all(loadPromises).then(() => {
          // Sắp xếp theo: đang tham gia (giảm dần), sau đó tổng tham gia (giảm dần)
          const sorted = shuffledVolunteers.sort((a: any, b: any) => {
            const dangThamGiaA = a.dangThamGia || 0;
            const dangThamGiaB = b.dangThamGia || 0;
            const tongThamGiaA = a.tongSuKienThamGia || a.suKienDaThamGia || 0;
            const tongThamGiaB = b.tongSuKienThamGia || b.suKienDaThamGia || 0;
            
            // Ưu tiên đang tham gia trước
            if (dangThamGiaA !== dangThamGiaB) {
              return dangThamGiaB - dangThamGiaA;
            }
            // Nếu đang tham gia bằng nhau, sắp xếp theo tổng tham gia
            return tongThamGiaB - tongThamGiaA;
          });
          
          this.randomVolunteers = sorted.slice(0, 5);
        }).catch(() => {
          // Nếu có lỗi, vẫn hiển thị danh sách đã shuffle
          this.randomVolunteers = shuffledVolunteers.slice(0, 5);
        });
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
      // Play video của slide active
      this.playActiveVideo();
    }, 5000);
  }

  playActiveVideo(): void {
    setTimeout(() => {
      const videos = document.querySelectorAll('.banner-video') as NodeListOf<HTMLVideoElement>;
      videos.forEach((video, i) => {
        if (i === this.activeBannerIndex) {
          video.play().catch(err => console.log('Video play error:', err));
        } else {
          video.pause();
        }
      });
    }, 100);
  }
  
  setBannerSlide(index: number): void {
    this.activeBannerIndex = index;
    
    // Play video của slide active
    this.playActiveVideo();
    
    // Reset timer
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.startBanner();
    }
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    // Đảm bảo video play khi slide active
    if (video.parentElement?.classList.contains('active')) {
      video.play().catch(err => console.log('Video play error:', err));
    }
  }

  onVideoCanPlay(event: Event, index: number): void {
    const video = event.target as HTMLVideoElement;
    // Play video nếu đây là slide đang active
    if (index === this.activeBannerIndex) {
      video.play().catch(err => {
        console.log('Video play error:', err);
        // Nếu autoplay bị chặn, thử play lại sau khi user tương tác
      });
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
    // Sử dụng authService.logout() để xóa cả localStorage và sessionStorage
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  // Load số sự kiện đã tham gia và đang tham gia
  loadVolunteerEventCount(volunteer: any, callback?: () => void): void {
    if (!volunteer.maTNV) {
      volunteer.dangThamGia = 0;
      volunteer.tongSuKienThamGia = volunteer.tongSuKienThamGia || volunteer.suKienDaThamGia || 0;
      volunteer.suKienDaThamGia = volunteer.tongSuKienThamGia || volunteer.suKienDaThamGia || 0;
      if (callback) callback();
      return;
    }

    // Đảm bảo giá trị mặc định được set trước khi gọi API
    if (volunteer.dangThamGia === undefined) {
      volunteer.dangThamGia = 0;
    }

    this.registrationService.getRegistrationsByVolunteer(volunteer.maTNV).subscribe({
      next: (response: any) => {
        const registrations = response?.data || response || [];
        
        // Đếm số sự kiện đang tham gia (chờ duyệt + đã duyệt nhưng chưa hoàn thành)
        // Trạng thái: 0 = Chờ duyệt, 1 = Đã duyệt (đang tham gia), 2 = Đã từ chối, 3 = Đã hoàn thành
        const dangThamGia = registrations.filter((reg: any) => 
          reg.trangThai === 0 || reg.trangThai === 1
        ).length;
        
        // Tổng số sự kiện đã tham gia (bao gồm cả đã hoàn thành)
        const tongSuKien = registrations.filter((reg: any) => 
          reg.trangThai === 0 || reg.trangThai === 1 || reg.trangThai === 3
        ).length;
        
        volunteer.dangThamGia = dangThamGia;
        volunteer.tongSuKienThamGia = tongSuKien;
        volunteer.suKienDaThamGia = tongSuKien;
        
        if (callback) callback();
      },
      error: (err) => {
        // Không log lỗi để tránh spam console khi không phải TNV
        // Chỉ set giá trị mặc định
        volunteer.dangThamGia = volunteer.dangThamGia || 0;
        volunteer.tongSuKienThamGia = volunteer.tongSuKienThamGia || volunteer.suKienDaThamGia || 0;
        volunteer.suKienDaThamGia = volunteer.tongSuKienThamGia || volunteer.suKienDaThamGia || 0;
        
        if (callback) callback();
      }
    });
  }

  // Mở modal xem hồ sơ volunteer
  viewVolunteerProfile(volunteer: any): void {
    if (this.volunteerProfileViewer && volunteer.maTNV) {
      this.volunteerProfileViewer.open(volunteer.maTNV, volunteer);
    }
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }
}
