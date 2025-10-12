import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, RegisterRequest } from '../../services/auth';

@Component({
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule
  ],
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  registerData: RegisterRequest = {
    hoTen: '',
    email: '',
    password: '',
    confirmPassword: '',
    soDienThoai: '',
    cccd: '',
    diaChi: ''
  };

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Mật khẩu xác nhận không khớp';
      return;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    this.isLoading = true;

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = response.message;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        } else {
          this.errorMessage = response.message;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Lỗi kết nối đến server';
        this.isLoading = false;
      }
    });
  }
}