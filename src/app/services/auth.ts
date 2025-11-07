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
    const user = localStorage.getItem('user');
    return !!user;
  }

  getUsername(): string {
    const user = localStorage.getItem('user');
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
    const user = localStorage.getItem('user');
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

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  saveUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userInfoChanged.next(user);
  }
  
  // Cập nhật thông tin user và trigger notification
  updateUserInfo(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userInfoChanged.next(user);
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
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

  // Xóa dữ liệu đăng nhập khỏi localStorage
  private clearLocalStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}