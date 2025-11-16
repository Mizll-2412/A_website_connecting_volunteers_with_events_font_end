import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification';
import { ToChucService } from '../../services/organization';
import { TinhNguyenVienService } from '../../services/volunteer';
import { Subscription } from 'rxjs';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  isLoggedIn = false;
  username = '';
  role = '';
  userAvatar: string | null = null;
  verificationStatus: number | null = null; // 0: pending, 1: verified, 2: rejected, null: not set
  isUserMenuOpen = false;
  isMobileMenuOpen = false;
  isScrolled = false;
  isHeaderHidden = false;
  lastScrollTop = 0;
  
  // Thông báo
  showNotifications = false;
  notificationCount = 0;
  notifications: Notification[] = [];
  private notificationsSubscription: Subscription | undefined;
  private unreadCountSubscription: Subscription | undefined;

  constructor(
    private router: Router, 
    private auth: AuthService,
    private notificationService: NotificationService,
    private toChucService: ToChucService,
    private volunteerService: TinhNguyenVienService,
    private http: HttpClient,
    private toast: ToastService
  ) { }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Kiểm tra đã cuộn xuống đủ để thay đổi header chưa
    this.isScrolled = currentScrollTop > 50;
    
    // Auto hide header khi cuộn xuống, hiện lại khi cuộn lên
    if (currentScrollTop > this.lastScrollTop && currentScrollTop > 150) {
      // Cuộn xuống
      this.isHeaderHidden = true;
    } else {
      // Cuộn lên
      this.isHeaderHidden = false;
    }
    
    this.lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Đóng user menu khi click ra ngoài
    const userMenu = document.querySelector('.user-menu');
    if (this.isUserMenuOpen && userMenu && !userMenu.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }
    
    // Đóng notification khi click ra ngoài
    const notification = document.querySelector('.notification');
    if (this.showNotifications && notification && !notification.contains(event.target as Node)) {
      this.showNotifications = false;
    }
    
    // Đóng mobile menu khi click ra ngoài
    const mobileMenu = document.querySelector('.mobile-nav');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    if (this.isMobileMenuOpen && mobileMenu && mobileMenuToggle && 
        !mobileMenu.contains(event.target as Node) && 
        !mobileMenuToggle.contains(event.target as Node)) {
      this.isMobileMenuOpen = false;
    }
  }

  ngOnInit(): void {
    this.checkAuthStatus();
    this.checkAuthStatusPeriodically();
    
    // Subscribe để lắng nghe thay đổi thông tin user
    this.auth.userInfo$.subscribe(user => {
      if (user) {
        // Format URL avatar bằng getImageUrl() để đảm bảo URL đúng
        const avatarPath = user.profileImage || user.anhDaiDien;
        this.userAvatar = avatarPath ? getImageUrl(avatarPath) : null;
        this.username = user.hoTen || this.username;
      }
    });
    
    this.loadNotifications();
    
    // Đăng ký theo dõi thông báo
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications.slice(0, 5); // Chỉ hiển thị 5 thông báo mới nhất
    });
    
    // Đăng ký theo dõi số lượng thông báo chưa đọc
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(count => {
      this.notificationCount = count;
    });
  }
  
  ngOnDestroy(): void {
    // Hủy đăng ký để tránh memory leak
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
    
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
  
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      this.showNotifications = false; // Đóng notifications nếu đang mở
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  private checkAuthStatusPeriodically(): void {
    // Kiểm tra trạng thái mỗi 30 giây
    setInterval(() => {
      this.checkAuthStatus();
    }, 30000);
  }

  private checkAuthStatus(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      
      // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
      const user = this.auth.getUser();
      if (user) {
        // Format URL avatar bằng getImageUrl() để đảm bảo URL đúng
        const avatarPath = user.profileImage || user.anhDaiDien;
        this.userAvatar = avatarPath ? getImageUrl(avatarPath) : null;
        
        // Ensure username is displayed correctly
        if (user.hoTen && !this.username) {
          this.username = user.hoTen;
        }
        
        // Load avatar from API based on role
        if (user.maTaiKhoan) {
          if (this.role === 'Organization') {
            this.loadOrganizationAvatar(user.maTaiKhoan);
          } else if (this.role === 'User') {
            this.loadVolunteerAvatar(user.maTaiKhoan);
          }
        }
      }
    }
  }
  
  private loadOrganizationAvatar(accountId: number): void {
    this.toChucService.getOrganizationByAccountId(accountId).subscribe({
      next: (response: any) => {
        const org = response.data || response;
        if (org?.anhDaiDien) {
          this.userAvatar = getImageUrl(org.anhDaiDien);
          // Update user info (sử dụng authService để tự động lưu vào đúng nơi)
          const user = this.auth.getUser();
          if (user) {
            user.anhDaiDien = org.anhDaiDien;
            this.auth.updateUserInfo(user);
          }
        }
        // Load verification status
        if (org?.trangThaiXacMinh !== undefined) {
          this.verificationStatus = org.trangThaiXacMinh;
        }
      },
      error: (err) => {
        console.error('Lỗi tải avatar tổ chức:', err);
      }
    });
  }
  
  private loadVolunteerAvatar(accountId: number): void {
    this.volunteerService.getVolunteerByAccountId(accountId).subscribe({
      next: (response: any) => {
        const volunteer = response.data || response;
        if (volunteer?.anhDaiDien) {
          this.userAvatar = getImageUrl(volunteer.anhDaiDien);
          // Update user info (sử dụng authService để tự động lưu vào đúng nơi)
          const user = this.auth.getUser();
          if (user) {
            user.anhDaiDien = volunteer.anhDaiDien;
            this.auth.updateUserInfo(user);
          }
        }
      },
      error: (err) => {
        console.error('Lỗi tải avatar tình nguyện viên:', err);
      }
    });
  }

  logout(): void {
    // Hiển thị loading hoặc thông báo nếu cần
    this.auth.logout();
    this.router.navigate(['/login']);
    this.isUserMenuOpen = false;
    this.isMobileMenuOpen = false;
  }
  
  navigateToProfile(): void {
    this.isUserMenuOpen = false;
    
    // Chuyển hướng dựa trên vai trò
    if (this.role === 'Organization') {
      this.router.navigate(['/org-profile']);
    } else if (this.role === 'Admin') {
      this.router.navigate(['/admin']);
    } else {
      // Clear localStorage để đảm bảo vào tab profile mặc định
      localStorage.removeItem('volunteerProfileActiveTab');
      this.router.navigate(['/profile']);
    }
  }

  navigateToManageOrg(event?: Event): void {
    // Ngăn chặn default behavior của routerLink nếu có
    if (event) {
      event.preventDefault();
    }
    // Clear localStorage để reset về tab mặc định khi điều hướng từ header
    localStorage.removeItem('eventManagementActiveTab');
    sessionStorage.removeItem('manageOrgWasRefreshing');
    this.router.navigate(['/manage-org']);
  }

  navigateToRegistrationList(event?: Event): void {
    // Ngăn chặn default behavior của routerLink nếu có
    if (event) {
      event.preventDefault();
    }
    // Clear localStorage để reset về tab mặc định khi điều hướng từ header
    localStorage.removeItem('registrationListActiveTab');
    sessionStorage.removeItem('registrationListWasRefreshing');
    this.router.navigate(['/dang-ky']);
  }

  // Phương thức cho thông báo
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.isUserMenuOpen = false;
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
  
  loadNotifications(): void {
    if (this.isLoggedIn) {
      this.notificationService.loadNotifications();
    }
  }
  
  formatTime(date: Date | string): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: vi });
  }
  
  markAsRead(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (notification.daDoc) {
      console.log('Thông báo đã được đánh dấu đã đọc rồi');
      return;
    }
    
    console.log('Đang đánh dấu thông báo đã đọc:', notification.maThongBao);
    
    // Cập nhật trạng thái ngay lập tức để UI phản hồi nhanh
    notification.daDoc = true;
    
    this.notificationService.markAsRead(notification.maThongBao).subscribe({
      next: (response) => {
        console.log('Đánh dấu đã đọc thành công:', response);
        
        // Cập nhật số lượng chưa đọc
        const newUnreadCount = this.notifications.filter(n => !n.daDoc).length;
        this.notificationService.updateUnreadCount(newUnreadCount);
        
        // Reload lại danh sách thông báo để đảm bảo đồng bộ với server
        setTimeout(() => {
          this.notificationService.loadNotifications();
        }, 500);
      },
      error: (err) => {
        console.error('Lỗi đánh dấu đã đọc:', err);
        console.error('Chi tiết lỗi:', JSON.stringify(err));
        
        // Revert lại trạng thái nếu có lỗi
        notification.daDoc = false;
        
        // Hiển thị thông báo lỗi cho người dùng
        // Sử dụng normalizedMessage từ error interceptor (đã được chuẩn hóa)
        if ((err as any).normalizedMessage) {
          this.toast.error((err as any).normalizedMessage);
        } else if (err.error?.message) {
          this.toast.error(err.error.message);
        } else if (err.status === 401) {
          this.toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          this.toast.error('Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại.');
        }
      }
    });
  }
  
  viewAllNotifications(): void {
    this.showNotifications = false;
    this.router.navigate(['/notifications']);
  }

  // Extract event ID from notification content (format: [EVENT_ID:id] or URL)
  extractEventId(notification: Notification): number | null {
    // Kiểm tra nếu là thông báo sự kiện (phanLoai = 1 hoặc 2 - tùy backend)
    // Hoặc nếu nội dung có chứa "sự kiện" hoặc "su-kien"
    const isEventNotification = notification.phanLoai === 1 || // NotificationType.Event = 1
                                notification.phanLoai === 2 || // Cá nhân có thể là sự kiện
                                notification.noiDung.toLowerCase().includes('sự kiện') ||
                                notification.noiDung.toLowerCase().includes('su-kien');
    
    if (!isEventNotification) {
      return null;
    }
    
    // Tìm event ID trong nội dung thông báo theo format [EVENT_ID:id]
    const eventIdMatch = notification.noiDung.match(/\[EVENT_ID:(\d+)\]/);
    if (eventIdMatch && eventIdMatch[1]) {
      return parseInt(eventIdMatch[1], 10);
    }
    
    // Tìm event ID từ URL trong nội dung (format cũ: http://.../su-kien/10 hoặc /su-kien/10)
    const urlMatch = notification.noiDung.match(/\/su-kien\/(\d+)/);
    if (urlMatch && urlMatch[1]) {
      return parseInt(urlMatch[1], 10);
    }
    
    return null;
  }

  // Get clean notification content without event ID marker and URLs
  getCleanNotificationContent(notification: Notification): string {
    let content = notification.noiDung;
    
    // Loại bỏ marker [EVENT_ID:id] (có thể có khoảng trắng trước/sau)
    content = content.replace(/\s*\[EVENT_ID:\d+\]\s*/g, ' ');
    
    // Loại bỏ URL (http://.../su-kien/10 hoặc /su-kien/10)
    content = content.replace(/https?:\/\/[^\s]+\/su-kien\/\d+/g, '');
    content = content.replace(/\/su-kien\/\d+/g, '');
    
    // Loại bỏ các cụm từ liên quan đến link
    content = content.replace(/Xem chi tiết tại:\s*/gi, '');
    content = content.replace(/tại:\s*/gi, '');
    
    // Loại bỏ khoảng trắng thừa và trim
    content = content.replace(/\s+/g, ' ').trim();
    
    // Loại bỏ dấu chấm hoặc dấu phẩy thừa ở cuối (nhưng giữ lại nếu là phần của câu)
    // Chỉ xóa nếu có dấu chấm/phẩy đơn lẻ ở cuối
    content = content.replace(/[.,;]\s*$/, '');
    
    return content;
  }

  // Handle click on "Xem chi tiết" button
  viewEventDetails(notification: Notification, event: Event): void {
    event.stopPropagation(); // Ngăn chặn event bubbling
    
    const eventId = this.extractEventId(notification);
    if (eventId) {
      // Đánh dấu đã đọc nếu chưa đọc
      if (!notification.daDoc) {
        this.markAsRead(notification);
      }
      
      // Nếu là thông báo đăng ký mới và user là tổ chức, điều hướng đến trang quản lý sự kiện
      if (this.role === 'Organization' && notification.noiDung?.includes('đã đăng ký tham gia sự kiện')) {
        this.showNotifications = false;
        // Clear localStorage để reset về tab mặc định (sẽ được override bởi queryParams)
        localStorage.removeItem('eventManagementActiveTab');
        sessionStorage.removeItem('manageOrgWasRefreshing');
        this.router.navigate(['/manage-org'], { queryParams: { tab: 'event-detail', eventId: eventId } });
        return;
      }
      
      // Đóng dropdown và điều hướng tới trang chi tiết sự kiện
      this.showNotifications = false;
      this.router.navigate(['/su-kien', eventId]);
    }
  }
}