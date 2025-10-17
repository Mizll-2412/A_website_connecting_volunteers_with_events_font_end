import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

interface Admin {
  maAdmin: number;
  maTaiKhoan: number;
  hoTen: string;
  email: string;
  soDienThoai?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  diaChi?: string;
  cccd?: string;
  chucVu?: string;
  phongBan?: string;
  anhDaiDien?: string;
}

interface ThongBao {
  maThongBao: number;
  tieuDe: string;
  noiDung: string;
  ngayGui: string;
  loaiNguoiNhan: string;
  soNguoiDoc: number;
  tongSoNguoiNhan: number;
}

interface ToChucDangKy {
  maToChuc: number;
  tenToChuc: string;
  email: string;
  ngayTao: string;
}

interface SuKienDangKy {
  maSuKien: number;
  tenSuKien: string;
  tenToChuc: string;
  thoiGianBatDau: string;
}

interface ThongKe {
  totalVolunteers: number;
  totalOrganizations: number;
  totalEvents: number;
  totalRegistrations: number;
}

interface TopOrganization {
  maToChuc: number;
  tenToChuc: string;
  soSuKien: number;
}

interface TopVolunteer {
  maTNV: number;
  hoTen: string;
  soSuKienThamGia: number;
}

interface SearchUser {
  id: number;
  name: string;
  role: string;
}

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-profile.html',
  styleUrls: ['./admin-profile.css']
})
export class AdminProfileComponent implements OnInit {
  profileForm!: FormGroup;
  notificationForm!: FormGroup;
  user?: User;
  admin?: Admin;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  selectedMenuItem: string = 'profile';
  approvalTab: string = 'organizations';
  showNewNotificationForm: boolean = false;
  
  // Dữ liệu cho các tab
  sentNotifications: ThongBao[] = [];
  pendingOrganizations: ToChucDangKy[] = [];
  pendingEvents: SuKienDangKy[] = [];
  stats?: ThongKe;
  topOrganizations: TopOrganization[] = [];
  topVolunteers: TopVolunteer[] = [];
  searchedUsers: SearchUser[] = [];

  apiUrl = 'http://localhost:5000/api/admin';
  apiThongBaoUrl = 'http://localhost:5000/api/thongbao';
  apiToChucUrl = 'http://localhost:5000/api/tochuc';
  apiSuKienUrl = 'http://localhost:5000/api/sukien';
  apiStatUrl = 'http://localhost:5000/api/statistics';

  isLoggedIn = false;
  username = '';
  role = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadUserInfo();
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      
      // Kiểm tra vai trò, chỉ admin mới có quyền truy cập
      if (this.role !== 'Admin') {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  initForms(): void {
    this.profileForm = this.fb.group({
      hoTen: ['', Validators.required],
      cccd: [''],
      soDienThoai: [''],
      email: ['', [Validators.required, Validators.email]],
      ngaySinh: [''],
      gioiTinh: [''],
      diaChi: [''],
      chucVu: [''],
      phongBan: ['']
    });
    
    this.notificationForm = this.fb.group({
      tieuDe: ['', Validators.required],
      noiDung: ['', Validators.required],
      loaiNguoiNhan: ['', Validators.required]
    });
  }

  loadUserInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
      this.loadAdminInfo();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadAdminInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    // Lấy thông tin admin theo mã tài khoản
    this.http.get<any>(`${this.apiUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: (response) => {
        this.admin = response.data || response;
        this.populateForm();
        
        if (this.admin?.anhDaiDien) {
          this.previewUrl = `http://localhost:5000${this.admin.anhDaiDien}`;
        }
      },
      error: (err) => {
        console.error('Lỗi tải thông tin:', err);
      }
    });
  }

  populateForm(): void {
    if (this.admin) {
      this.profileForm.patchValue({
        hoTen: this.admin.hoTen,
        cccd: this.admin.cccd,
        email: this.admin.email,
        soDienThoai: this.admin.soDienThoai,
        ngaySinh: this.admin.ngaySinh,
        gioiTinh: this.admin.gioiTinh,
        diaChi: this.admin.diaChi,
        chucVu: this.admin.chucVu,
        phongBan: this.admin.phongBan
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!this.admin?.maAdmin) {
      alert('Không tìm thấy thông tin admin');
      return;
    }
    
    await this.updateAdminProfile();
  }

  async updateAdminProfile(): Promise<void> {
    if (!this.admin?.maAdmin) return;

    const formData = new FormData();
    const formValue = this.profileForm.value;
    
    formData.append('hoTen', formValue.hoTen);
    formData.append('email', formValue.email);
    formData.append('cccd', formValue.cccd || '');
    formData.append('soDienThoai', formValue.soDienThoai || '');
    formData.append('ngaySinh', formValue.ngaySinh || '');
    formData.append('gioiTinh', formValue.gioiTinh || '');
    formData.append('diaChi', formValue.diaChi || '');
    formData.append('chucVu', formValue.chucVu || '');
    formData.append('phongBan', formValue.phongBan || '');
    
    if (this.selectedFile) {
      formData.append('anhFile', this.selectedFile);
    }

    this.http.put<any>(`${this.apiUrl}/${this.admin.maAdmin}`, formData).subscribe({
      next: (response) => {
        alert('Cập nhật thành công!');
        this.admin = response.data;
        this.selectedFile = null;
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi cập nhật');
        console.error('Lỗi cập nhật:', err);
      }
    });
  }

  selectMenuItem(item: string): void {
    this.selectedMenuItem = item;
    
    // Tải dữ liệu tương ứng khi chọn tab
    if (item === 'notifications') {
      this.loadSentNotifications();
    } else if (item === 'approvals') {
      this.loadPendingOrganizations();
      this.loadPendingEvents();
    } else if (item === 'stats') {
      this.loadStatistics();
    }
  }

  selectApprovalTab(tab: string): void {
    this.approvalTab = tab;
  }

  // Phương thức tải dữ liệu cho các tab
  loadSentNotifications(): void {
    this.http.get<any>(`${this.apiThongBaoUrl}/admin`).subscribe({
      next: (response) => {
        this.sentNotifications = response.data || [];
      },
      error: (err) => console.error('Lỗi tải thông báo:', err)
    });
  }

  loadPendingOrganizations(): void {
    this.http.get<any>(`${this.apiToChucUrl}/pending`).subscribe({
      next: (response) => {
        this.pendingOrganizations = response.data || [];
      },
      error: (err) => console.error('Lỗi tải tổ chức chờ duyệt:', err)
    });
  }

  loadPendingEvents(): void {
    this.http.get<any>(`${this.apiSuKienUrl}/pending`).subscribe({
      next: (response) => {
        this.pendingEvents = response.data || [];
      },
      error: (err) => console.error('Lỗi tải sự kiện chờ duyệt:', err)
    });
  }

  loadStatistics(): void {
    this.http.get<any>(`${this.apiStatUrl}/overview`).subscribe({
      next: (response) => {
        this.stats = response.data || {};
        this.loadTopOrganizations();
        this.loadTopVolunteers();
      },
      error: (err) => console.error('Lỗi tải thống kê:', err)
    });
  }

  loadTopOrganizations(): void {
    this.http.get<any>(`${this.apiStatUrl}/top-organizations`).subscribe({
      next: (response) => {
        this.topOrganizations = response.data || [];
      },
      error: (err) => console.error('Lỗi tải top tổ chức:', err)
    });
  }

  loadTopVolunteers(): void {
    this.http.get<any>(`${this.apiStatUrl}/top-volunteers`).subscribe({
      next: (response) => {
        this.topVolunteers = response.data || [];
      },
      error: (err) => console.error('Lỗi tải top tình nguyện viên:', err)
    });
  }

  // Phương thức quản lý thông báo
  openNewNotificationForm(): void {
    this.showNewNotificationForm = true;
    this.notificationForm.reset();
  }

  cancelNotificationForm(): void {
    this.showNewNotificationForm = false;
  }

  sendNotification(): void {
    if (this.notificationForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin thông báo');
      return;
    }

    const formData = this.notificationForm.value;
    
    this.http.post<any>(`${this.apiThongBaoUrl}`, formData).subscribe({
      next: (response) => {
        alert('Gửi thông báo thành công!');
        this.showNewNotificationForm = false;
        this.loadSentNotifications();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi gửi thông báo');
        console.error('Lỗi gửi thông báo:', err);
      }
    });
  }

  viewNotificationDetail(maThongBao: number): void {
    console.log('Xem chi tiết thông báo:', maThongBao);
    // Thêm logic mở modal chi tiết thông báo ở đây
  }

  deleteNotification(maThongBao: number): void {
    if (confirm('Bạn có chắc muốn xóa thông báo này?')) {
      this.http.delete<any>(`${this.apiThongBaoUrl}/${maThongBao}`).subscribe({
        next: () => {
          alert('Xóa thông báo thành công!');
          this.loadSentNotifications();
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi xóa thông báo');
          console.error('Lỗi xóa thông báo:', err);
        }
      });
    }
  }

  // Phương thức phê duyệt
  viewOrganizationDetail(maToChuc: number): void {
    console.log('Xem chi tiết tổ chức:', maToChuc);
    // Thêm logic mở modal chi tiết tổ chức ở đây
  }

  approveOrganization(maToChuc: number): void {
    this.http.put<any>(`${this.apiToChucUrl}/${maToChuc}/verify`, { trangThaiXacMinh: 1 }).subscribe({
      next: () => {
        alert('Phê duyệt tổ chức thành công!');
        this.loadPendingOrganizations();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi phê duyệt');
        console.error('Lỗi phê duyệt:', err);
      }
    });
  }

  rejectOrganization(maToChuc: number): void {
    const lyDo = prompt('Nhập lý do từ chối:');
    if (lyDo === null) return;
    
    this.http.put<any>(`${this.apiToChucUrl}/${maToChuc}/verify`, { 
      trangThaiXacMinh: 2,
      lyDoTuChoi: lyDo
    }).subscribe({
      next: () => {
        alert('Từ chối tổ chức thành công!');
        this.loadPendingOrganizations();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi từ chối');
        console.error('Lỗi từ chối:', err);
      }
    });
  }

  viewEventDetail(maSuKien: number): void {
    console.log('Xem chi tiết sự kiện:', maSuKien);
    // Thêm logic mở modal chi tiết sự kiện ở đây
  }

  approveEvent(maSuKien: number): void {
    this.http.put<any>(`${this.apiSuKienUrl}/${maSuKien}/verify`, { trangThai: 1 }).subscribe({
      next: () => {
        alert('Phê duyệt sự kiện thành công!');
        this.loadPendingEvents();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi phê duyệt');
        console.error('Lỗi phê duyệt:', err);
      }
    });
  }

  rejectEvent(maSuKien: number): void {
    const lyDo = prompt('Nhập lý do từ chối:');
    if (lyDo === null) return;
    
    this.http.put<any>(`${this.apiSuKienUrl}/${maSuKien}/verify`, { 
      trangThai: 2,
      lyDoTuChoi: lyDo
    }).subscribe({
      next: () => {
        alert('Từ chối sự kiện thành công!');
        this.loadPendingEvents();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi từ chối');
        console.error('Lỗi từ chối:', err);
      }
    });
  }
}
