import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService, ConfirmChangeEmailRequest } from '../../services/auth';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-confirm-change-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './confirm-change-email.html',
  styleUrl: './confirm-change-email.css'
})
export class ConfirmChangeEmailComponent implements OnInit {
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  token = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Lấy token từ query params
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        // Tự động xác nhận khi có token
        this.confirmEmail();
      } else {
        this.errorMessage = 'Liên kết xác nhận đổi email không hợp lệ hoặc đã hết hạn';
      }
    });
  }

  confirmEmail(): void {
    if (!this.token) {
      this.errorMessage = 'Token không hợp lệ';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const request: ConfirmChangeEmailRequest = {
      token: this.token
    };

    this.authService.confirmChangeEmail(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message || 'Đổi email thành công!';
          this.toast.success(this.successMessage);
          
          // Cập nhật thông tin user nếu đang đăng nhập
          // User info sẽ được cập nhật khi reload trang
          
          // Chuyển hướng đến trang profile sau 2 giây
          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Đã xảy ra lỗi, vui lòng thử lại sau';
          this.toast.error(this.errorMessage);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Đã xảy ra lỗi, vui lòng thử lại sau';
        this.toast.error(this.errorMessage);
      }
    });
  }
}

