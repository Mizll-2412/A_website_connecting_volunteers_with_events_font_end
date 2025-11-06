import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService, ResetPasswordRequest } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  resetPasswordData: ResetPasswordRequest = {
    email: '',
    token: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  tokenValid = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Lấy token và email từ query params
    this.route.queryParams.subscribe(params => {
      if (params['token'] && params['email']) {
        this.resetPasswordData.token = params['token'];
        this.resetPasswordData.email = params['email'];
        this.tokenValid = true;
      } else {
        this.errorMessage = 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn';
        this.tokenValid = false;
      }
    });
  }

  onSubmit(): void {
    // Reset messages
    this.successMessage = '';
    this.errorMessage = '';
    
    // Validate form
    if (!this.resetPasswordData.email) {
      this.errorMessage = 'Vui lòng nhập email';
      return;
    }

    if (!this.resetPasswordData.token) {
      this.errorMessage = 'Token không hợp lệ';
      return;
    }

    if (!this.resetPasswordData.newPassword) {
      this.errorMessage = 'Vui lòng nhập mật khẩu mới';
      return;
    }

    if (this.resetPasswordData.newPassword.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    if (this.resetPasswordData.newPassword !== this.resetPasswordData.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp';
      return;
    }

    this.isLoading = true;

    this.authService.resetPassword(this.resetPasswordData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = 'Đặt lại mật khẩu thành công';
          // Chuyển hướng đến trang đăng nhập sau 3 giây
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Đã xảy ra lỗi, vui lòng thử lại sau';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Đã xảy ra lỗi, vui lòng thử lại sau';
      }
    });
  }
}
