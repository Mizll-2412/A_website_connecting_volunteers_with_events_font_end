import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Notification, CreateNotificationDto } from '../models/notification';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notification`;
  
  // BehaviorSubject để theo dõi số lượng thông báo chưa đọc
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();
  
  // BehaviorSubject để theo dõi danh sách thông báo
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  
  // Thời gian tải thông báo gần nhất
  private lastLoadTime: Date | null = null;
  
  constructor(private http: HttpClient, private authService: AuthService) {
    // Tải thông báo ban đầu nếu người dùng đã đăng nhập
    if (this.authService.isLoggedIn()) {
      this.loadNotifications();
    }
    
    // Thiết lập interval để tải thông báo định kỳ (mỗi 30 giây)
    setInterval(() => {
      if (this.authService.isLoggedIn()) {
        this.loadNotifications(true);
      }
    }, 30000);
  }
  
  // Tải thông báo từ server
  loadNotifications(silent: boolean = false): void {
    // Chỉ tải lại nếu đã quá 10 giây kể từ lần tải cuối cùng
    const now = new Date();
    if (this.lastLoadTime && now.getTime() - this.lastLoadTime.getTime() < 10000 && silent) {
      return;
    }
    
    this.lastLoadTime = now;
    
    // Lấy tất cả thông báo
    this.http.get<any>(this.apiUrl).subscribe({
      next: (response) => {
        const rawNotifications = response.data || response;
        
        // Map dữ liệu từ backend sang frontend model
        // Backend trả về trangThai (0 = chưa đọc, 1 = đã đọc)
        // Frontend cần daDoc (boolean)
        const notifications: Notification[] = rawNotifications.map((n: any) => ({
          maThongBao: n.maThongBao,
          maNguoiTao: n.maNguoiTao,
          tenNguoiTao: n.tenNguoiTao,
          phanLoai: n.phanLoai,
          phanLoaiText: n.phanLoaiText,
          noiDung: n.noiDung,
          ngayGui: new Date(n.ngayGui),
          daDoc: n.trangThai === 1 || n.daDoc === true // Map trangThai sang daDoc
        }));
        
        this.notificationsSubject.next(notifications);
        
        // Đếm số thông báo chưa đọc
        const unreadCount = notifications.filter((n: Notification) => !n.daDoc).length;
        this.unreadCountSubject.next(unreadCount);
      },
      error: (err) => {
        console.error('Lỗi tải thông báo:', err);
      }
    });
  }
  
  // Lấy thông báo theo ID
  getNotificationById(id: number): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`);
  }
  
  // Lấy tất cả thông báo của người dùng
  getUserNotifications(daDoc?: boolean): Observable<Notification[]> {
    let url = this.apiUrl;
    if (daDoc !== undefined) {
      url += `?daDoc=${daDoc}`;
    }
    return this.http.get<Notification[]>(url);
  }
  
  // Đánh dấu thông báo đã đọc
  markAsRead(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/status`, {
      MaThongBao: id,
      TrangThai: 1 // 1 = đã đọc
    });
  }
  
  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead(): void {
    this.http.put<any>(`${this.apiUrl}/read-all`, {}).subscribe({
      next: () => {
        // Reload lại danh sách thông báo sau khi đánh dấu tất cả đã đọc
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Lỗi đánh dấu tất cả thông báo đã đọc:', err);
      }
    });
  }
  
  // Tạo thông báo mới
  createNotification(notification: CreateNotificationDto): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }
  
  // Xóa thông báo
  deleteNotification(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Xóa tất cả thông báo
  deleteAllNotifications(): void {
    this.http.delete<any>(`${this.apiUrl}/delete-all`).subscribe({
      next: () => {
        // Clear danh sách thông báo
        this.notificationsSubject.next([]);
        // Reset số lượng chưa đọc về 0
        this.unreadCountSubject.next(0);
      },
      error: (err) => {
        console.error('Lỗi xóa tất cả thông báo:', err);
      }
    });
  }
  
  // Cập nhật số lượng thông báo chưa đọc
  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }
  
  // Lấy số lượng thông báo chưa đọc hiện tại
  getUnreadCount(): number {
    return this.unreadCountSubject.getValue();
  }

  // Mời TNV tham gia sự kiện (dành cho Tổ chức)
  inviteVolunteerToEvent(volunteerId: number, eventId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invite-event`, {
      maNguoiNhan: volunteerId,
      maSuKien: eventId
    });
  }
}
