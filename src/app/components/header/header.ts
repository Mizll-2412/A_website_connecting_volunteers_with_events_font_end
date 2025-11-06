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
    private http: HttpClient
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
        this.userAvatar = user.profileImage || user.anhDaiDien || null;
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
      
      const userInfo = localStorage.getItem('user');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        this.userAvatar = user.profileImage || user.anhDaiDien || null;
        
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
          this.userAvatar = `http://localhost:5000${org.anhDaiDien}`;
          // Update localStorage
          const userInfo = localStorage.getItem('user');
          if (userInfo) {
            const user = JSON.parse(userInfo);
            user.anhDaiDien = org.anhDaiDien;
            localStorage.setItem('user', JSON.stringify(user));
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
          this.userAvatar = `http://localhost:5000${volunteer.anhDaiDien}`;
          // Update localStorage
          const userInfo = localStorage.getItem('user');
          if (userInfo) {
            const user = JSON.parse(userInfo);
            user.anhDaiDien = volunteer.anhDaiDien;
            localStorage.setItem('user', JSON.stringify(user));
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
      this.router.navigate(['/profile']);
    }
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
  
  markAsRead(notification: Notification): void {
    if (notification.daDoc) return;
    
    this.notificationService.markAsRead(notification.maThongBao).subscribe({
      next: () => {
        // Cập nhật trạng thái trong danh sách cục bộ
        notification.daDoc = true;
        
        // Cập nhật số lượng chưa đọc
        const newUnreadCount = this.notifications.filter(n => !n.daDoc).length;
        this.notificationService.updateUnreadCount(newUnreadCount);
      },
      error: (err) => {
        console.error('Lỗi đánh dấu đã đọc:', err);
      }
    });
  }
  
  viewAllNotifications(): void {
    this.showNotifications = false;
    this.router.navigate(['/notifications']);
  }
}