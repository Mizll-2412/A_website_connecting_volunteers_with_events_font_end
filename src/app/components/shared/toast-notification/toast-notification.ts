import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-notification.html',
  styleUrls: ['./toast-notification.css'],
  encapsulation: ViewEncapsulation.None
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private toastSubscription?: Subscription;
  private removeSubscription?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    // Lắng nghe toast mới
    this.toastSubscription = this.toastService.toast$.subscribe((toast) => {
      this.toasts.push(toast);
      
      // Tự động xóa sau duration
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          this.removeToast(toast.id);
        }, toast.duration);
      }
    });

    // Lắng nghe yêu cầu xóa toast
    this.removeSubscription = this.toastService.remove$.subscribe((id) => {
      this.removeToast(id);
    });
  }

  ngOnDestroy(): void {
    this.toastSubscription?.unsubscribe();
    this.removeSubscription?.unsubscribe();
  }

  removeToast(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  getToastClass(type: string): string {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-info';
    }
  }
}

