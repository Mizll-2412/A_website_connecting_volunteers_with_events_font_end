import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Notification, NotificationType } from '../../models/notification';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  
  constructor(private notificationService: NotificationService) {}
  
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
  
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
  
  deleteNotification(notification: Notification): void {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) {
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
    }
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
}
