import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-settings.html',
  styleUrls: ['./account-settings.css']
})
export class AccountSettingsComponent implements OnInit {
  user: any = null;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  
  // Profile data
  profileData = {
    hoTen: '',
    email: '',
    soDienThoai: '',
    diaChi: '',
    gioiThieu: ''
  };
  
  // Password change data
  passwordData = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // Avatar upload
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  currentAvatar: string = '';
  
  private apiUrl = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadUserProfile();
  }
  
  loadUserProfile(): void {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    
    this.http.get<any>(`${this.apiUrl}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.user = response.data || response;
        this.profileData = {
          hoTen: this.user.hoTen || '',
          email: this.user.email || '',
          soDienThoai: this.user.soDienThoai || '',
          diaChi: this.user.diaChi || '',
          gioiThieu: this.user.gioiThieu || ''
        };
        
        // Get avatar from nested volunteer or organization object
        if (this.user.volunteer?.anhDaiDien) {
          this.currentAvatar = getImageUrl(this.user.volunteer.anhDaiDien);
        } else if (this.user.organization?.anhDaiDien) {
          this.currentAvatar = getImageUrl(this.user.organization.anhDaiDien);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.errorMessage = 'Không thể tải thông tin tài khoản';
        this.isLoading = false;
      }
    });
  }
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  
  updateProfile(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    const formData = new FormData();
    formData.append('hoTen', this.profileData.hoTen);
    formData.append('soDienThoai', this.profileData.soDienThoai || '');
    formData.append('diaChi', this.profileData.diaChi || '');
    formData.append('gioiThieu', this.profileData.gioiThieu || '');
    
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }
    
    const token = localStorage.getItem('token');
    
    this.http.put(`${this.apiUrl}/auth/profile`, formData, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.successMessage = 'Cập nhật thông tin thành công!';
        this.selectedFile = null;
        this.previewUrl = null;
        this.loadUserProfile();
        this.isLoading = false;
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = 'Không thể cập nhật thông tin. Vui lòng thử lại.';
        this.isLoading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  changePassword(): void {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.errorMessage = 'Mật khẩu mới không khớp!';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (this.passwordData.newPassword.length < 6) {
      this.errorMessage = 'Mật khẩu mới phải có ít nhất 6 ký tự!';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    const token = localStorage.getItem('token');
    
    this.http.post(`${this.apiUrl}/auth/change-password`, {
      oldPassword: this.passwordData.oldPassword,
      newPassword: this.passwordData.newPassword
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.successMessage = 'Đổi mật khẩu thành công!';
        this.passwordData = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        this.isLoading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.errorMessage = error.error?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra mật khẩu cũ.';
        this.isLoading = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  cancelAvatarUpload(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }
}

