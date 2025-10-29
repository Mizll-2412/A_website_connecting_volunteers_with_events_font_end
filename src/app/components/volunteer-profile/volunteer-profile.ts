import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TinhNguyenVien, TinhNguyenVienResponeDTos, KyNang, LinhVuc } from '../../models/volunteer';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

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
  
  allKyNangs: KyNang[] = [];
  allLinhVucs: LinhVuc[] = [];
  
  selectedKyNangs: (number | null)[] = [null, null, null, null];
  
  selectedLinhVucs: (number | null)[] = [null, null, null, null];

  apiUrl = 'http://localhost:5000/api/tinhnguyenvien';
  apiKyNangUrl = 'http://localhost:5000/api/kynang';
  apiLinhVucUrl = 'http://localhost:5000/api/linhvuc';

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
      next: (response) => {
        console.log('API response:', response);
        this.volunteer = response.data || response;
        console.log('Volunteer data:', this.volunteer);
        this.populateForm();
        
        if (this.volunteer?.anhDaiDien) {
          this.previewUrl = `http://localhost:5000${this.volunteer.anhDaiDien}`;
        }
        
        if (this.volunteer?.kyNangIds) {
          // Reset selected values
          this.selectedKyNangs = [null, null, null, null];
          
          this.volunteer.kyNangIds.forEach((id, index) => {
            if (index < 4) this.selectedKyNangs[index] = id;
          });
        }
        
        if (this.volunteer?.linhVucIds) {
          // Reset selected values
          this.selectedLinhVucs = [null, null, null, null];
          
          this.volunteer.linhVucIds.forEach((id, index) => {
            if (index < 4) this.selectedLinhVucs[index] = id;
          });
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

  // Xử lý khi chọn lĩnh vực
  onLinhVucChange(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLinhVucs[index] = value ? Number(value) : null;
    console.log(`Lĩnh vực ${index + 1} changed to:`, this.selectedLinhVucs[index]);
    console.log('Current selectedLinhVucs:', this.selectedLinhVucs);
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
}