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
    vaiTro: ''
  };

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  
  // Lỗi cho từng trường riêng biệt
  fieldErrors: {
    hoTen?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    vaiTro?: string;
  } = {};

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  // Validation cho từng trường
  validateHoTen(): void {
    if (!this.registerData.hoTen || this.registerData.hoTen.trim() === '') {
      this.fieldErrors.hoTen = 'Họ tên là bắt buộc';
    } else {
      this.fieldErrors.hoTen = undefined;
    }
  }

  validateEmail(): void {
    if (!this.registerData.email || this.registerData.email.trim() === '') {
      this.fieldErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.registerData.email)) {
      this.fieldErrors.email = 'Email không hợp lệ';
    } else {
      this.fieldErrors.email = undefined;
    }
  }

  validatePassword(): void {
    // Chỉ validate khi đã có giá trị (không validate khi rỗng để tránh hiển thị lỗi ngay khi focus)
    if (!this.registerData.password || this.registerData.password.trim() === '') {
      // Chỉ hiển thị lỗi "bắt buộc" khi đã blur hoặc submit
      // Khi đang nhập, không hiển thị lỗi nếu trường rỗng
      return;
    }
    
    const password = this.registerData.password;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password); // Ký tự đặc biệt: không phải chữ cái và số
    const hasMinLength = password.length >= 8;

    // Kiểm tra từng điều kiện để đưa ra thông báo lỗi cụ thể
    if (!hasMinLength) {
      this.fieldErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!hasLowerCase) {
      this.fieldErrors.password = 'Mật khẩu phải có ít nhất một chữ cái thường';
    } else if (!hasUpperCase) {
      this.fieldErrors.password = 'Mật khẩu phải có ít nhất một chữ cái hoa';
    } else if (!hasNumber) {
      this.fieldErrors.password = 'Mật khẩu phải có ít nhất một chữ số';
    } else if (!hasSpecialChar) {
      this.fieldErrors.password = 'Mật khẩu phải có ít nhất một ký tự đặc biệt';
    } else {
      // Mật khẩu hợp lệ
      this.fieldErrors.password = undefined;
    }
    
    // Validate lại confirmPassword khi password thay đổi
    if (this.registerData.confirmPassword) {
      this.validateConfirmPassword();
    }
  }

  validateConfirmPassword(): void {
    // Chỉ validate khi đã có giá trị
    if (!this.registerData.confirmPassword || this.registerData.confirmPassword.trim() === '') {
      // Chỉ hiển thị lỗi "bắt buộc" khi đã blur hoặc submit
      return;
    }
    
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.fieldErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    } else {
      this.fieldErrors.confirmPassword = undefined;
    }
  }

  validateVaiTro(): void {
    if (!this.registerData.vaiTro || this.registerData.vaiTro.trim() === '') {
      this.fieldErrors.vaiTro = 'Vui lòng chọn vai trò';
    } else {
      this.fieldErrors.vaiTro = undefined;
    }
  }

  // Kiểm tra tất cả các trường trước khi submit
  validateAll(): boolean {
    this.validateHoTen();
    this.validateEmail();
    
    // Validate password - kiểm tra cả trường hợp rỗng khi submit
    if (!this.registerData.password || this.registerData.password.trim() === '') {
      this.fieldErrors.password = 'Mật khẩu là bắt buộc';
    } else {
      this.validatePassword();
    }
    
    // Validate confirmPassword - kiểm tra cả trường hợp rỗng khi submit
    if (!this.registerData.confirmPassword || this.registerData.confirmPassword.trim() === '') {
      this.fieldErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else {
      this.validateConfirmPassword();
    }
    
    this.validateVaiTro();

    return !this.fieldErrors.hoTen && 
           !this.fieldErrors.email && 
           !this.fieldErrors.password && 
           !this.fieldErrors.confirmPassword && 
           !this.fieldErrors.vaiTro;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.fieldErrors = {};

    // Validate tất cả các trường
    if (!this.validateAll()) {
      this.errorMessage = 'Vui lòng kiểm tra lại các trường bị lỗi';
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
        // Error interceptor đã chuẩn hóa message vào normalizedMessage
        this.errorMessage = error.normalizedMessage || 'Lỗi kết nối đến server';
        this.isLoading = false;
      }
    });
  }
}