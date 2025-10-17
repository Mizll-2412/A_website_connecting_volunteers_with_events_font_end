import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

interface Notification {
  id: number;
  content: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit {
  isLoggedIn = false;
  username = '';
  role = '';
  userAvatar: string | null = null;
  isUserMenuOpen = false;
  isMobileMenuOpen = false;
  isScrolled = false;
  isHeaderHidden = false;
  lastScrollTop = 0;
  
  // Thông báo
  showNotifications = false;
  notificationCount = 0;
  notifications: Notification[] = [];

  constructor(private router: Router, private auth: AuthService) { }

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
    this.loadDummyNotifications();
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
        this.userAvatar = user.profileImage || null;
      }
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
    this.isUserMenuOpen = false;
    this.isMobileMenuOpen = false;
  }
  
  navigateToProfile(): void {
    this.isUserMenuOpen = false;
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
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      read: true
    }));
    this.notificationCount = 0;
  }
  
  // Tạo dữ liệu thông báo mẫu
  loadDummyNotifications(): void {
    if (this.isLoggedIn) {
      this.notifications = [
        {
          id: 1,
          content: 'Bạn vừa được phê duyệt tham gia sự kiện "Hỗ trợ trẻ em vùng cao 2025"',
          time: '1 giờ trước',
          read: false
        },
        {
          id: 2,
          content: 'Sự kiện "Hiến máu tình nguyện" sẽ diễn ra vào ngày mai',
          time: '3 giờ trước',
          read: false
        },
        {
          id: 3,
          content: 'Bạn nhận được chứng nhận từ sự kiện "Dọn dẹp bãi biển"',
          time: '1 ngày trước',
          read: true
        }
      ];
      
      // Đếm số thông báo chưa đọc
      this.notificationCount = this.notifications.filter(n => !n.read).length;
    }
  }
}