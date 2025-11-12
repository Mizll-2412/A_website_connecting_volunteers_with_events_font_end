import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { ReactiveFormsModule } from '@angular/forms';

import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  hoTen: string;
  email: string;
  password: string;
  confirmPassword: string;
  vaiTro: string
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  userInfo?: any;
}

export interface ChangeEmailRequest {
  newEmail: string;
}

export interface ConfirmChangeEmailRequest {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  
  // BehaviorSubject để thông báo thay đổi thông tin user
  private userInfoChanged = new BehaviorSubject<any>(null);
  public userInfo$ = this.userInfoChanged.asObservable();

  constructor(private http: HttpClient) { }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, data);
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data);
  }

  // Gửi yêu cầu đăng xuất đến server
  logoutFromServer(): Observable<AuthResponse> {
    // Sử dụng token trong header để xác thực
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/logout`, {}, { headers });
  }

  // Quên mật khẩu - gửi email
  forgotPassword(data: ForgotPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/forgot-password`, data);
  }

  // Đặt lại mật khẩu với token
  resetPassword(data: ResetPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/reset-password`, data);
  }

  requestChangeEmail(data: ChangeEmailRequest): Observable<AuthResponse> {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.getToken()}` });
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/change-email/request`, data, { headers });
  }

  confirmChangeEmail(data: ConfirmChangeEmailRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/change-email/confirm`, data);
  }

  isAuthenticated(): boolean {
    // Kiểm tra cả localStorage và sessionStorage
    const localUser = localStorage.getItem('user');
    const sessionUser = sessionStorage.getItem('user');
    return !!(localUser || sessionUser);
  }

  getUsername(): string {
    // Kiểm tra localStorage trước
    let user = localStorage.getItem('user');
    if (!user) {
      // Nếu không có trong localStorage, kiểm tra sessionStorage
      user = sessionStorage.getItem('user');
    }
    
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.hoTen) {
          return userData.hoTen;
        } else if (userData.maTaiKhoan) {
          return 'Người dùng';
        } else {
          return 'Người dùng';
        }
      } catch {
        return 'Người dùng';
      }
    }
    return 'Người dùng';
  }

  getRole(): string {
    // Kiểm tra localStorage trước
    let user = localStorage.getItem('user');
    if (!user) {
      // Nếu không có trong localStorage, kiểm tra sessionStorage
      user = sessionStorage.getItem('user');
    }
    
    if (user) {
      try {
        const data = JSON.parse(user);
        return data.vaiTro || ''; 
      } catch {
        return '';
      }
    }
    return '';
  }

  saveToken(token: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      // Lưu vào localStorage khi chọn "Ghi nhớ đăng nhập"
      localStorage.setItem('token', token);
      localStorage.setItem('tokenSavedAt', Date.now().toString());
      // Xóa token khỏi sessionStorage nếu có
      sessionStorage.removeItem('token');
    } else {
      // Lưu vào sessionStorage khi không chọn "Ghi nhớ đăng nhập"
      sessionStorage.setItem('token', token);
      // Xóa token khỏi localStorage nếu có
      localStorage.removeItem('token');
      localStorage.removeItem('tokenSavedAt');
    }
  }

  getToken(): string | null {
    // Kiểm tra localStorage trước (cho rememberMe = true)
    const localToken = localStorage.getItem('token');
    if (localToken) {
      return localToken;
    }
    // Nếu không có trong localStorage, kiểm tra sessionStorage
    return sessionStorage.getItem('token');
  }

  saveUser(user: any, rememberMe: boolean = false): void {
    if (rememberMe) {
      // Lưu vào localStorage khi chọn "Ghi nhớ đăng nhập"
      localStorage.setItem('user', JSON.stringify(user));
      // Xóa user khỏi sessionStorage nếu có
      sessionStorage.removeItem('user');
    } else {
      // Lưu vào sessionStorage khi không chọn "Ghi nhớ đăng nhập"
      sessionStorage.setItem('user', JSON.stringify(user));
      // Xóa user khỏi localStorage nếu có
      localStorage.removeItem('user');
    }
    this.userInfoChanged.next(user);
  }
  
  // Cập nhật thông tin user và trigger notification
  updateUserInfo(user: any): void {
    // Giữ nguyên nơi lưu trữ hiện tại (localStorage hoặc sessionStorage)
    const localUser = localStorage.getItem('user');
    if (localUser) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.setItem('user', JSON.stringify(user));
    }
    this.userInfoChanged.next(user);
  }

  getUser(): any {
    // Kiểm tra localStorage trước
    const localUser = localStorage.getItem('user');
    if (localUser) {
      return JSON.parse(localUser);
    }
    // Nếu không có trong localStorage, kiểm tra sessionStorage
    const sessionUser = sessionStorage.getItem('user');
    return sessionUser ? JSON.parse(sessionUser) : null;
  }

  // Đăng xuất cả ở client và server
  logout(): void {
    // Gọi API đăng xuất nếu đang đăng nhập
    if (this.isLoggedIn()) {
      this.logoutFromServer().subscribe({
        next: () => {
          this.clearLocalStorage();
        },
        error: () => {
          // Vẫn xóa dữ liệu local ngay cả khi API thất bại
          this.clearLocalStorage();
        }
      });
    } else {
      this.clearLocalStorage();
    }
  }

  // Xóa dữ liệu đăng nhập khỏi cả localStorage và sessionStorage
  private clearLocalStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenSavedAt');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}