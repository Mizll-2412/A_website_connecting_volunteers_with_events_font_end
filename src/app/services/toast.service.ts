import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // Thời gian hiển thị (ms), mặc định 4000ms
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toast$: Observable<Toast> = this.toastSubject.asObservable();

  private removeSubject = new Subject<string>();
  public remove$: Observable<string> = this.removeSubject.asObservable();

  private defaultDuration = 4000; // 4 giây

  /**
   * Hiển thị toast với type tùy chỉnh
   */
  show(message: string, type: ToastType = 'info', duration?: number): void {
    const toast: Toast = {
      id: this.generateId(),
      message,
      type,
      duration: duration || this.defaultDuration
    };
    this.toastSubject.next(toast);
  }

  /**
   * Hiển thị toast thành công
   */
  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * Hiển thị toast lỗi
   */
  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  /**
   * Hiển thị toast cảnh báo
   */
  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Hiển thị toast thông tin
   */
  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /**
   * Xóa toast theo id
   */
  remove(id: string): void {
    this.removeSubject.next(id);
  }

  /**
   * Tạo ID duy nhất cho toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

