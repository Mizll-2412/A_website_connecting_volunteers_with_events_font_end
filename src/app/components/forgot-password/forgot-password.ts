import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService, ForgotPasswordRequest } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  forgotPasswordData: ForgotPasswordRequest = {
    email: ''
  };
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    // Reset messages
    this.successMessage = '';
    this.errorMessage = '';
    
    // Validate form
    if (!this.forgotPasswordData.email) {
      this.errorMessage = 'Vui lòng nhập email';
      return;
    }

    this.isLoading = true;

    this.authService.forgotPassword(this.forgotPasswordData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn';
          this.forgotPasswordData.email = ''; // Reset form
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
