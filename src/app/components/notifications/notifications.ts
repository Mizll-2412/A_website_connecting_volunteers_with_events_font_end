import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Notification, NotificationType } from '../../models/notification';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class Notifications implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  isLoading = true;
  unreadCount = 0;
  activeFilter = 'all';
  
  private notificationsSubscription: Subscription | undefined;
  private unreadCountSubscription: Subscription | undefined;
  
  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private toast: ToastService,
    private confirm: ConfirmService
  ) {}
  
  ngOnInit(): void {
    this.loadNotifications();
    
    // Đăng ký theo dõi thay đổi thông báo
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
      this.applyFilter();
      this.isLoading = false;
    });
    
    // Đăng ký theo dõi số lượng thông báo chưa đọc
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
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
  
  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.loadNotifications();
  }
  
  filterNotifications(filter: string): void {
    this.activeFilter = filter;
    this.applyFilter();
  }
  
  applyFilter(): void {
    switch (this.activeFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.daDoc);
        break;
      case 'system':
        this.filteredNotifications = this.notifications.filter(n => n.phanLoai === NotificationType.System);
        break;
      case 'event':
        this.filteredNotifications = this.notifications.filter(n => n.phanLoai === NotificationType.Event);
        break;
      case 'personal':
        this.filteredNotifications = this.notifications.filter(n => n.phanLoai === NotificationType.Personal);
        break;
      case 'all':
      default:
        this.filteredNotifications = [...this.notifications];
        break;
    }
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
    this.applyFilter(); // Áp dụng lại filter để cập nhật UI
    
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
        this.applyFilter();
        
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
  
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
  
  deleteNotification(notification: Notification): void {
    this.confirm.confirm('Bạn có chắc chắn muốn xóa thông báo này không?', { variant: 'danger', okText: 'Xóa' }).then(confirmed => {
      if (!confirmed) return;
      this.notificationService.deleteNotification(notification.maThongBao).subscribe({
        next: () => {
          // Xóa khỏi danh sách cục bộ
          this.notifications = this.notifications.filter(n => n.maThongBao !== notification.maThongBao);
          
          // Cập nhật danh sách đã lọc
          this.applyFilter();
          
          // Cập nhật số lượng chưa đọc
          if (!notification.daDoc) {
            const newUnreadCount = this.notifications.filter(n => !n.daDoc).length;
            this.notificationService.updateUnreadCount(newUnreadCount);
          }
        },
        error: (err) => {
          console.error('Lỗi xóa thông báo:', err);
        }
      });
    });
  }

  deleteAllNotifications(): void {
    this.confirm.confirm('Bạn có chắc chắn muốn xóa TẤT CẢ thông báo không? Hành động này không thể hoàn tác!', { variant: 'danger', okText: 'Xóa tất cả' }).then(confirmed => {
      if (!confirmed) return;
      this.notificationService.deleteAllNotifications();
      // Clear local data
      this.notifications = [];
      this.filteredNotifications = [];
      this.unreadCount = 0;
    });
  }
  
  getNotificationCategoryText(notification: Notification): string {
    if (notification.phanLoaiText) {
      return notification.phanLoaiText;
    }
    
    switch (notification.phanLoai) {
      case NotificationType.System:
        return 'Hệ thống';
      case NotificationType.Event:
        return 'Sự kiện';
      case NotificationType.Personal:
        return 'Cá nhân';
      default:
        return 'Không xác định';
    }
  }
  
  formatTime(date: Date | string): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: vi });
  }

  // Extract event ID from notification content (format: [EVENT_ID:id] or URL)
  extractEventId(notification: Notification): number | null {
    // Kiểm tra nếu là thông báo sự kiện (phanLoai = 1 hoặc 2 - tùy backend)
    // Hoặc nếu nội dung có chứa "sự kiện" hoặc "su-kien"
    const isEventNotification = notification.phanLoai === NotificationType.Event || 
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
      // Điều hướng tới trang chi tiết sự kiện
      this.router.navigate(['/su-kien', eventId]);
    }
  }
}
