import { Component, ViewChild } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { AuthService, LoginRequest } from '../../services/auth';
import { GlobeAnimationComponent } from '../globe-animation/globe-animation';

@Component({
  imports: [
    CommonModule, 
    FormsModule,  
    RouterModule,
    GlobeAnimationComponent
  ],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  @ViewChild(GlobeAnimationComponent) globeAnimation!: GlobeAnimationComponent;

  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  rememberMe: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  private loginResponse?: {
    userInfo?: { role?: string };
  }; // Lưu response để dùng sau khi animation complete

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  // Method để xử lý khi animation hoàn thành
  onAnimationComplete(): void {
    if (this.loginResponse) {
      this.navigateAfterLogin(this.loginResponse.userInfo?.role);
      this.loginResponse = undefined;
    }
  }

  // Helper method để tránh code duplication
  private navigateAfterLogin(role?: string): void {
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  onSubmit(showAnimation: boolean = false): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    // Chỉ hiển thị animation nếu được yêu cầu (từ nút globe)
    if (showAnimation && this.globeAnimation) {
      this.globeAnimation.showFullscreenAnimation();
    }

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success) {
          this.successMessage = response.message;

          this.authService.saveToken(response.token!, this.rememberMe);
          this.authService.saveUser(response.userInfo, this.rememberMe);
          
          // Lưu rememberMe flag
          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('rememberMe');
          }

          // Đợi animation chạy hết trước khi chuyển trang (nếu có)
          if (showAnimation) {
            // Lưu response để dùng sau khi animation complete
            this.loginResponse = response;
            // Animation sẽ tự đóng và emit event khi hoàn thành
            // Chúng ta sẽ lắng nghe event đó để chuyển trang
          } else {
            // Không có animation thì chuyển trang ngay
            this.navigateAfterLogin(response.userInfo?.role);
          }
        } else {
          this.errorMessage = response.message;
          // Đóng animation nếu đăng nhập thất bại
          if (showAnimation && this.globeAnimation) {
            this.globeAnimation.closeFullGlobe();
          }
        }
      },
      error: (error) => {
        // Error interceptor đã chuẩn hóa message vào normalizedMessage
        this.errorMessage = error.normalizedMessage || 'Lỗi kết nối đến server';
        this.isLoading = false;
        // Đóng animation nếu có lỗi
        if (showAnimation && this.globeAnimation) {
          this.globeAnimation.closeFullGlobe();
        }
      }
    });
  }

  // Method để trigger đăng nhập từ nút globe
  onGlobeClick(): void {
    // Validate form trước
    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage = 'Vui lòng nhập email và mật khẩu';
      return;
    }
    
    // Trigger đăng nhập với animation
    this.onSubmit(true);
  }
}
