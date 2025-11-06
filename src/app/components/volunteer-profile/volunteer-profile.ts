import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TinhNguyenVien, TinhNguyenVienResponeDTos, KyNang, LinhVuc } from '../../models/volunteer';
import { User } from '../../models/user';
import { AuthService, ChangeEmailRequest } from '../../services/auth';

// Sử dụng interface từ models/volunteer.ts

@Component({
  selector: 'app-volunteer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './volunteer-profile.html',
  styleUrls: ['./volunteer-profile.css']
})
export class VolunteerProfileComponent implements OnInit {
  registrationForm!: FormGroup;
  user?: User;
  volunteer?: TinhNguyenVienResponeDTos;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  selectedMenuItem: string = 'profile';
  activeTab: string = 'profile'; // Tab hiện tại
  newEmail: string = '';
  
  allKyNangs: KyNang[] = [];
  allLinhVucs: LinhVuc[] = [];
  
  selectedKyNangs: (number | null)[] = [];
  
  selectedLinhVucs: (number | null)[] = [];

  apiUrl = 'http://localhost:5000/api/tinhnguyenvien';
  apiKyNangUrl = 'http://localhost:5000/api/kynang';
  apiLinhVucUrl = 'http://localhost:5000/api/linhvuc';

  isLoggedIn = false;
  username = '';
  role = '';
  
  // Data cho các tabs
  eventHistory: any[] = [];
  certificates: any[] = [];
  evaluations: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserInfo();
    this.loadKyNangs();
    this.loadLinhVucs();
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      
      // Nếu người dùng là tổ chức, chuyển hướng đến trang quản lý tổ chức
      if (this.role === 'Organization') {
        this.router.navigate(['/manage-org']);
        return;
      } else if (this.role === 'Admin') {
        // Có thể chuyển hướng admin đến trang quản trị nếu cần
        // this.router.navigate(['/admin']);
      }
    }
  }

  initForm(): void {
    this.registrationForm = this.fb.group({
      hoTen: [''],
      cccd: [''],
      soDienThoai: [''],
      email: [''],
      ngaySinh: [''],
      gioiTinh: [''],
      diaChi: [''],
      gioiThieu: ['']
    });
  }

  loadUserInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
      this.loadVolunteerInfo();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadVolunteerInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    // Lấy thông tin tình nguyện viên theo mã tài khoản
    this.http.get<any>(`${this.apiUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: async (response) => {
        console.log('API response:', response);
        this.volunteer = response.data || response;
        console.log('Volunteer data:', this.volunteer);
        this.populateForm();
        
        if (this.volunteer?.anhDaiDien) {
          this.previewUrl = `http://localhost:5000${this.volunteer.anhDaiDien}`;
        }
        
        // Tải danh sách kỹ năng và lĩnh vực trước
        await this.loadKyNangsAndLinhVucs();
        
        if (this.volunteer?.kyNangIds) {
          this.selectedKyNangs = [...this.volunteer.kyNangIds];
        } else {
          this.selectedKyNangs = [];
        }
        
        if (this.volunteer?.linhVucIds) {
          this.selectedLinhVucs = [...this.volunteer.linhVucIds];
        } else {
          this.selectedLinhVucs = [];
        }

        // Lấy thêm thông tin chi tiết kỹ năng từ API nếu chưa có
        if (this.volunteer?.maTNV && (!this.volunteer.kyNangs || this.volunteer.kyNangs.length === 0)) {
          this.loadVolunteerSkills(this.volunteer.maTNV);
        }

        // Lấy thêm thông tin chi tiết lĩnh vực từ API nếu chưa có
        if (this.volunteer?.maTNV && (!this.volunteer.linhVucs || this.volunteer.linhVucs.length === 0)) {
          this.loadVolunteerFields(this.volunteer.maTNV);
        }
      },
      error: (err) => {
        console.error('Lỗi tải thông tin:', err);
        if (err.status === 404) {
          console.log('Chưa có hồ sơ tình nguyện viên');
        }
      }
    });
  }
  
  async loadKyNangsAndLinhVucs(): Promise<void> {
    return new Promise((resolve) => {
      // Đảm bảo cả hai danh sách đều được tải
      const loadKyNang = new Promise<void>((resolveKN) => {
        if (this.allKyNangs.length === 0) {
          this.loadKyNangs();
        }
        resolveKN();
      });
      
      const loadLinhVuc = new Promise<void>((resolveLV) => {
        if (this.allLinhVucs.length === 0) {
          this.loadLinhVucs();
        }
        resolveLV();
      });
      
      Promise.all([loadKyNang, loadLinhVuc]).then(() => resolve());
    });
  }

  loadVolunteerSkills(maTNV: number): void {
    this.http.get<any>(`${this.apiUrl}/skills/${maTNV}`).subscribe({
      next: (response) => {
        const skills = response.data || response;
        if (this.volunteer) {
          this.volunteer.kyNangs = skills;
          console.log('Loaded volunteer skills:', skills);
        }
      },
      error: (err) => console.error('Lỗi tải kỹ năng tình nguyện viên:', err)
    });
  }

  loadVolunteerFields(maTNV: number): void {
    this.http.get<any>(`${this.apiUrl}/fields/${maTNV}`).subscribe({
      next: (response) => {
        const fields = response.data || response;
        if (this.volunteer) {
          this.volunteer.linhVucs = fields;
          console.log('Loaded volunteer fields:', fields);
        }
      },
      error: (err) => console.error('Lỗi tải lĩnh vực tình nguyện viên:', err)
    });
  }

  populateForm(): void {
    if (this.volunteer) {
      console.log('Populating form with data:', this.volunteer);
      
      // Ensure all form fields are properly reset first
      this.registrationForm.reset();
      
      // Then set values from the volunteer object
      this.registrationForm.patchValue({
        hoTen: this.volunteer.hoTen || '',
        cccd: this.volunteer.cccd || '',
        soDienThoai: this.volunteer.soDienThoai || '',
        email: this.volunteer.email || '',
        ngaySinh: this.volunteer.ngaySinh || '',
        gioiTinh: this.volunteer.gioiTinh || '',
        diaChi: this.volunteer.diaChi || '',
        gioiThieu: this.volunteer.gioiThieu || ''
      });
      
      console.log('Form values after population:', this.registrationForm.value);
    }
  }

  loadKyNangs(): void {
    this.http.get<any>(this.apiKyNangUrl).subscribe({
      next: (response) => {
        this.allKyNangs = response.data || response;
      },
      error: (err) => console.error('Lỗi tải kỹ năng:', err)
    });
  }

  loadLinhVucs(): void {
    this.http.get<any>(this.apiLinhVucUrl).subscribe({
      next: (response) => {
        this.allLinhVucs = response.data || response;
      },
      error: (err) => console.error('Lỗi tải lĩnh vực:', err)
    });
  }

  getAvailableKyNangs(currentIndex: number): KyNang[] {
    const selectedIds = this.selectedKyNangs
      .filter((id, idx) => id !== null && idx !== currentIndex);
    
    return this.allKyNangs.filter(kn => !selectedIds.includes(kn.maKyNang));
  }

  getAvailableLinhVucs(currentIndex: number): LinhVuc[] {
    const selectedIds = this.selectedLinhVucs
      .filter((id, idx) => id !== null && idx !== currentIndex);
    
    return this.allLinhVucs.filter(lv => !selectedIds.includes(lv.maLinhVuc));
  }

  onKyNangChange(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedKyNangs[index] = value ? Number(value) : null;
    console.log(`Kỹ năng ${index + 1} changed to:`, this.selectedKyNangs[index]);
    console.log('Current selectedKyNangs:', this.selectedKyNangs);
  }

  addKyNang(): void {
    if (this.selectedKyNangs.length >= 10) {
      alert('Bạn chỉ có thể thêm tối đa 10 kỹ năng');
      return;
    }
    this.selectedKyNangs.push(null);
  }

  removeKyNang(idx: number): void {
    // Cho phép xóa hết kỹ năng
    this.selectedKyNangs.splice(idx, 1);
  }

  // Xử lý khi chọn lĩnh vực
  onLinhVucChange(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLinhVucs[index] = value ? Number(value) : null;
    console.log(`Lĩnh vực ${index + 1} changed to:`, this.selectedLinhVucs[index]);
    console.log('Current selectedLinhVucs:', this.selectedLinhVucs);
  }

  addLinhVuc(): void {
    if (this.selectedLinhVucs.length >= 10) {
      alert('Bạn chỉ có thể thêm tối đa 10 lĩnh vực');
      return;
    }
    this.selectedLinhVucs.push(null);
  }

  removeLinhVuc(idx: number): void {
    // Cho phép xóa hết lĩnh vực
    this.selectedLinhVucs.splice(idx, 1);
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
    // Không kiểm tra form invalid nữa
    // if (this.registrationForm.invalid) {
    //   alert('Vui lòng điền đầy đủ thông tin bắt buộc');
    //   return;
    // }

    if (!this.volunteer?.maTNV) {
      await this.createVolunteer();
    } else {
      await this.updateVolunteer();
    }
  }

  async createVolunteer(): Promise<void> {
    const formData = this.registrationForm.value;
    
    const createDto = {
      maTaiKhoan: this.user?.maTaiKhoan,
      hoTen: formData.hoTen,
      email: formData.email,
      cccd: formData.cccd,
      soDienThoai: formData.soDienThoai,
      ngaySinh: formData.ngaySinh,
      gioiTinh: formData.gioiTinh,
      diaChi: formData.diaChi,
      gioiThieu: formData.gioiThieu,
      kyNangIds: this.selectedKyNangs.filter(id => id !== null) as number[],
      linhVucIds: this.selectedLinhVucs.filter(id => id !== null) as number[]
    };

    this.http.post<any>(this.apiUrl, createDto).subscribe({
      next: async (response) => {
        this.volunteer = response.data;
        
        // Upload ảnh nếu có
        if (this.selectedFile && this.volunteer?.maTNV) {
          await this.uploadAvatar(this.volunteer.maTNV);
        }
        // Đồng bộ avatar vào localStorage để header cập nhật
        if (this.volunteer?.anhDaiDien) {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.anhDaiDien = this.volunteer.anhDaiDien;
            u.profileImage = `http://localhost:5000${this.volunteer.anhDaiDien}`;
            localStorage.setItem('user', JSON.stringify(u));
          }
        }
        
        alert('Tạo hồ sơ thành công!');
        this.loadVolunteerInfo();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi tạo hồ sơ');
        console.error('Lỗi tạo hồ sơ:', err);
      }
    });
  }

  async updateVolunteer(): Promise<void> {
    if (!this.volunteer?.maTNV) return;

    const formData = new FormData();
    const formValue = this.registrationForm.value;
    
    formData.append('hoTen', formValue.hoTen);
    formData.append('email', formValue.email);
    formData.append('cccd', formValue.cccd || '');
    formData.append('soDienThoai', formValue.soDienThoai || '');
    formData.append('ngaySinh', formValue.ngaySinh || '');
    formData.append('gioiTinh', formValue.gioiTinh || '');
    formData.append('diaChi', formValue.diaChi || '');
    formData.append('gioiThieu', formValue.gioiThieu || '');
    
    const kyNangIds = this.selectedKyNangs.filter(id => id !== null);
    kyNangIds.forEach((id, index) => {
      formData.append(`kyNangIds[${index}]`, id!.toString());
    });
    
    const linhVucIds = this.selectedLinhVucs.filter(id => id !== null);
    linhVucIds.forEach((id, index) => {
      formData.append(`linhVucIds[${index}]`, id!.toString());
    });
    
    if (this.selectedFile) {
      formData.append('anhFile', this.selectedFile);
    }

    this.http.put<any>(`${this.apiUrl}/${this.volunteer.maTNV}`, formData).subscribe({
      next: (response) => {
        alert('Cập nhật thành công!');
        this.volunteer = response.data;
        this.selectedFile = null;
        // Đồng bộ avatar vào localStorage và trigger update để header cập nhật
        if (this.volunteer?.anhDaiDien) {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.anhDaiDien = this.volunteer.anhDaiDien;
            u.profileImage = `http://localhost:5000${this.volunteer.anhDaiDien}`;
            this.auth.updateUserInfo(u);
          }
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi cập nhật');
        console.error('Lỗi cập nhật:', err);
      }
    });
  }

  async uploadAvatar(maTNV: number): Promise<void> {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('anhFile', this.selectedFile);

    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.apiUrl}/${maTNV}/upload-avatar`, formData).subscribe({
        next: (response) => {
          console.log('Upload ảnh thành công:', response);
          resolve();
        },
        error: (err) => {
          console.error('Lỗi upload ảnh:', err);
          reject(err);
        }
      });
    });
  }

  selectMenuItem(item: string): void {
    this.selectedMenuItem = item;
  }

  viewEventDetails(event: any): void {
    console.log('View event:', event);
  }

  applyForEvent(event: any): void {
    console.log('Apply for event:', event);
  }
  
  changeEmail(): void {
    // kept for backward compatibility if invoked elsewhere
    const modal = document.getElementById('changeEmailModal');
    if (modal) {
      // Bootstrap modal is triggered via data-bs attributes in template
    }
  }

  submitChangeEmail(): void {
    if (!this.newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newEmail)) {
      alert('Vui lòng nhập email hợp lệ.');
      return;
    }
    const payload: ChangeEmailRequest = { newEmail: this.newEmail };
    this.auth.requestChangeEmail(payload).subscribe({
      next: (res) => {
        alert(res.message || 'Đã gửi email xác nhận đổi email.');
        this.newEmail = '';
        const modalEl = document.getElementById('changeEmailModal');
        if ((window as any).bootstrap && modalEl) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalEl) || new (window as any).bootstrap.Modal(modalEl);
          modal.hide();
        }
      },
      error: (err) => {
        alert(err.error?.message || err.normalizedMessage || 'Không thể gửi email xác nhận.');
      }
    });
  }
  
  // Phương thức để xác định class CSS cho badge cấp bậc
  getRankBadgeClass(): string {
    if (!this.volunteer?.capBac) return 'bg-secondary';
    
    const rank = this.volunteer.capBac.toLowerCase();
    
    if (rank.includes('đồng') || rank.includes('bronze')) {
      return 'badge-bronze';
    } else if (rank.includes('bạc') || rank.includes('silver')) {
      return 'badge-silver';
    } else if (rank.includes('vàng') || rank.includes('gold')) {
      return 'badge-gold';
    } else if (rank.includes('bạch kim') || rank.includes('platinum')) {
      return 'badge-platinum';
    } else if (rank.includes('kim cương') || rank.includes('diamond')) {
      return 'badge-diamond';
    }
    
    return 'bg-success'; // Mặc định
  }

  // Chuyển tab
  switchTab(tab: string): void {
    this.activeTab = tab;
    
    // Load dữ liệu cho tab tương ứng
    if (tab === 'events' && this.eventHistory.length === 0) {
      this.loadEventHistory();
    } else if (tab === 'certificates' && this.certificates.length === 0) {
      this.loadCertificates();
    } else if (tab === 'reputation' && this.evaluations.length === 0) {
      this.loadEvaluations();
    }
  }

  // Load lịch sử sự kiện
  loadEventHistory(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`http://localhost:5000/api/dondangky/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.eventHistory = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi tải lịch sử sự kiện:', err);
      }
    });
  }

  // Load giấy chứng nhận
  loadCertificates(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`http://localhost:5000/api/certificate/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.certificates = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi tải giấy chứng nhận:', err);
        this.certificates = [];
      }
    });
  }

  // Xem chứng nhận
  viewCertificate(certificate: any): void {
    const filePath = certificate.filePath || certificate.file;
    if (filePath) {
      window.open(`http://localhost:5000${filePath}`, '_blank');
    } else {
      alert('Chứng nhận không có file đính kèm');
    }
  }

  // Tải chứng nhận
  downloadCertificate(certificate: any): void {
    const filePath = certificate.filePath || certificate.file;
    if (filePath) {
      const link = document.createElement('a');
      link.href = `http://localhost:5000${filePath}`;
      link.download = `Chung_nhan_${certificate.tenSuKien || 'su_kien'}.pdf`;
      link.click();
    } else {
      alert('Chứng nhận không có file đính kèm');
    }
  }

  // Load đánh giá
  loadEvaluations(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`http://localhost:5000/api/danhgia/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.evaluations = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá:', err);
      }
    });
  }
}