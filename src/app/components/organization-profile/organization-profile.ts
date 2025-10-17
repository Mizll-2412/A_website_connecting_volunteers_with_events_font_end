import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

interface ToChuc {
  maToChuc: number;
  maTaiKhoan: number;
  tenToChuc: string;
  email: string;
  maSoThue?: string;
  soDienThoai?: string;
  nguoiDaiDien?: string;
  sdtNguoiDaiDien?: string;
  diaChi?: string;
  gioiThieu?: string;
  anhDaiDien?: string;
  diemTrungBinh?: number;
  tongLuotDanhGia?: number;
  trangThaiXacMinh: number;
  lyDoTuChoi?: string;
  ngayTao?: string;
}

interface SuKien {
  maSuKien: number;
  tenSuKien: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  trangThai: number;
  soLuongTNV: number;
  soLuongDangKy: number;
}

interface TinhNguyenVien {
  maTNV: number;
  maDangKy?: number;
  hoTen: string;
  email: string;
  vaiTro?: string;
  trangThai: number;
}

interface DanhGia {
  maDanhGia: number;
  tenTNV: string;
  diem: number;
  noiDung: string;
  ngayDanhGia: string;
}

interface ThongBao {
  maThongBao: number;
  tieuDe: string;
  noiDung: string;
  nguoiGui: string;
  ngayGui: string;
  daDoc: boolean;
}

interface GiayToPhapLy {
  maGiayTo: number;
  tenGiayTo: string;
  loaiGiayTo: string;
  moTa?: string;
  duongDanFile: string;
  trangThai: number;
  ngayTao: string;
}

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './organization-profile.html',
  styleUrls: ['./organization-profile.css']
})
export class OrganizationProfileComponent implements OnInit {
  organizationForm!: FormGroup;
  documentForm!: FormGroup;
  user?: User;
  organization?: ToChuc;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  selectedDocumentFile: File | null = null;
  selectedMenuItem: string = 'profile';
  eventsTab: string = 'all';
  
  // Dữ liệu cho các tab
  events: SuKien[] = [];
  allEvents: SuKien[] = [];
  volunteers: TinhNguyenVien[] = [];
  evaluations: DanhGia[] = [];
  notifications: ThongBao[] = [];
  legalDocuments: GiayToPhapLy[] = [];

  // Biến tạm
  selectedEvent: string = '';
  searchVolunteerTerm: string = '';
  showUploadForm: boolean = false;

  apiUrl = 'http://localhost:5000/api/tochuc';
  apiSuKienUrl = 'http://localhost:5000/api/sukien';
  apiTNVUrl = 'http://localhost:5000/api/tinhnguyenvien';
  apiDanhGiaUrl = 'http://localhost:5000/api/danhgia';
  apiThongBaoUrl = 'http://localhost:5000/api/thongbao';
  apiGiayToUrl = 'http://localhost:5000/api/giaytophaply';

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
      
      // Kiểm tra vai trò, chỉ Organization mới có quyền truy cập
      if (this.role !== 'Organization') {
        this.router.navigate(['/']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  initForms(): void {
    this.organizationForm = this.fb.group({
      tenToChuc: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      maSoThue: [''],
      soDienThoai: [''],
      nguoiDaiDien: [''],
      sdtNguoiDaiDien: [''],
      diaChi: [''],
      gioiThieu: ['']
    });
    
    this.documentForm = this.fb.group({
      tenGiayTo: ['', Validators.required],
      loaiGiayTo: ['', Validators.required],
      moTa: ['']
    });
  }

  loadUserInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
      this.loadOrganizationInfo();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadOrganizationInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    // Lấy thông tin tổ chức theo mã tài khoản
    this.http.get<any>(`${this.apiUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: (response) => {
        this.organization = response.data || response;
        this.populateForm();
        
        if (this.organization?.anhDaiDien) {
          this.previewUrl = `http://localhost:5000${this.organization.anhDaiDien}`;
        }
        
        // Sau khi lấy thông tin tổ chức thành công, load các thông tin khác
        if (this.organization?.maToChuc) {
          this.loadEvents();
          this.loadAllEvents();
          this.loadEvaluations();
          this.loadNotifications();
          this.loadLegalDocuments();
        }
      },
      error: (err) => {
        console.error('Lỗi tải thông tin:', err);
      }
    });
  }

  populateForm(): void {
    if (this.organization) {
      this.organizationForm.patchValue({
        tenToChuc: this.organization.tenToChuc,
        email: this.organization.email,
        maSoThue: this.organization.maSoThue,
        soDienThoai: this.organization.soDienThoai,
        nguoiDaiDien: this.organization.nguoiDaiDien,
        sdtNguoiDaiDien: this.organization.sdtNguoiDaiDien,
        diaChi: this.organization.diaChi,
        gioiThieu: this.organization.gioiThieu
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

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedDocumentFile = input.files[0];
    }
  }

  async onSubmit(): Promise<void> {
    if (this.organizationForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!this.organization?.maToChuc) {
      await this.createOrganization();
    } else {
      await this.updateOrganization();
    }
  }

  async createOrganization(): Promise<void> {
    const formData = this.organizationForm.value;
    
    const createDto = {
      maTaiKhoan: this.user?.maTaiKhoan,
      tenToChuc: formData.tenToChuc,
      email: formData.email,
      maSoThue: formData.maSoThue,
      soDienThoai: formData.soDienThoai,
      nguoiDaiDien: formData.nguoiDaiDien,
      sdtNguoiDaiDien: formData.sdtNguoiDaiDien,
      diaChi: formData.diaChi,
      gioiThieu: formData.gioiThieu
    };

    this.http.post<any>(this.apiUrl, createDto).subscribe({
      next: async (response) => {
        this.organization = response.data;
        
        // Upload ảnh nếu có
        if (this.selectedFile && this.organization?.maToChuc) {
          await this.uploadLogo(this.organization.maToChuc);
        }
        
        alert('Đăng ký tổ chức thành công!');
        this.loadOrganizationInfo();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi đăng ký');
        console.error('Lỗi đăng ký:', err);
      }
    });
  }

  async updateOrganization(): Promise<void> {
    if (!this.organization?.maToChuc) return;

    const formData = new FormData();
    const formValue = this.organizationForm.value;
    
    formData.append('tenToChuc', formValue.tenToChuc);
    formData.append('email', formValue.email);
    formData.append('maSoThue', formValue.maSoThue || '');
    formData.append('soDienThoai', formValue.soDienThoai || '');
    formData.append('nguoiDaiDien', formValue.nguoiDaiDien || '');
    formData.append('sdtNguoiDaiDien', formValue.sdtNguoiDaiDien || '');
    formData.append('diaChi', formValue.diaChi || '');
    formData.append('gioiThieu', formValue.gioiThieu || '');
    
    if (this.selectedFile) {
      formData.append('anhFile', this.selectedFile);
    }

    this.http.put<any>(`${this.apiUrl}/${this.organization.maToChuc}`, formData).subscribe({
      next: (response) => {
        alert('Cập nhật thành công!');
        this.organization = response.data;
        this.selectedFile = null;
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi cập nhật');
        console.error('Lỗi cập nhật:', err);
      }
    });
  }

  async uploadLogo(maToChuc: number): Promise<void> {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('anhFile', this.selectedFile);

    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.apiUrl}/${maToChuc}/upload-logo`, formData).subscribe({
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
    
    // Tải dữ liệu tương ứng khi chọn tab
    if (item === 'events') {
      this.loadEvents();
    } else if (item === 'volunteers') {
      this.loadAllEvents();
      this.volunteers = []; // Reset volunteers khi chuyển tab
    } else if (item === 'evaluations') {
      this.loadEvaluations();
    } else if (item === 'notifications') {
      this.loadNotifications();
    } else if (item === 'legal') {
      this.loadLegalDocuments();
    }
  }

  selectEventsTab(tab: string): void {
    this.eventsTab = tab;
    this.loadEvents();
  }

  // Phương thức tải dữ liệu cho các tab
  loadEvents(): void {
    if (!this.organization?.maToChuc) return;
    
    let endpoint = `${this.apiSuKienUrl}/organization/${this.organization.maToChuc}`;
    
    if (this.eventsTab !== 'all') {
      endpoint += `?status=${this.eventsTab}`;
    }
    
    this.http.get<any>(endpoint).subscribe({
      next: (response) => {
        this.events = response.data || [];
      },
      error: (err) => console.error('Lỗi tải sự kiện:', err)
    });
  }

  loadAllEvents(): void {
    if (!this.organization?.maToChuc) return;
    
    this.http.get<any>(`${this.apiSuKienUrl}/organization/${this.organization.maToChuc}`).subscribe({
      next: (response) => {
        this.allEvents = response.data || [];
      },
      error: (err) => console.error('Lỗi tải sự kiện:', err)
    });
  }

  loadVolunteersByEvent(): void {
    if (!this.selectedEvent) {
      this.volunteers = [];
      return;
    }
    
    this.http.get<any>(`${this.apiSuKienUrl}/${this.selectedEvent}/volunteers`).subscribe({
      next: (response) => {
        this.volunteers = response.data || [];
      },
      error: (err) => console.error('Lỗi tải tình nguyện viên:', err)
    });
  }

  searchVolunteers(): void {
    if (!this.selectedEvent || !this.searchVolunteerTerm) {
      this.loadVolunteersByEvent();
      return;
    }
    
    this.http.get<any>(`${this.apiSuKienUrl}/${this.selectedEvent}/volunteers?search=${this.searchVolunteerTerm}`).subscribe({
      next: (response) => {
        this.volunteers = response.data || [];
      },
      error: (err) => console.error('Lỗi tìm kiếm tình nguyện viên:', err)
    });
  }

  loadEvaluations(): void {
    if (!this.organization?.maToChuc) return;
    
    this.http.get<any>(`${this.apiDanhGiaUrl}/organization/${this.organization.maToChuc}`).subscribe({
      next: (response) => {
        this.evaluations = response.data || [];
      },
      error: (err) => console.error('Lỗi tải đánh giá:', err)
    });
  }

  loadNotifications(): void {
    if (!this.organization?.maToChuc) return;
    
    this.http.get<any>(`${this.apiThongBaoUrl}/organization/${this.organization.maToChuc}`).subscribe({
      next: (response) => {
        this.notifications = response.data || [];
      },
      error: (err) => console.error('Lỗi tải thông báo:', err)
    });
  }

  loadLegalDocuments(): void {
    if (!this.organization?.maToChuc) return;
    
    this.http.get<any>(`${this.apiGiayToUrl}/organization/${this.organization.maToChuc}`).subscribe({
      next: (response) => {
        this.legalDocuments = response.data || [];
      },
      error: (err) => console.error('Lỗi tải giấy tờ pháp lý:', err)
    });
  }

  // Phương thức xử lý các action
  deleteEvent(maSuKien: number): void {
    if (confirm('Bạn có chắc muốn xóa sự kiện này?')) {
      this.http.delete<any>(`${this.apiSuKienUrl}/${maSuKien}`).subscribe({
        next: () => {
          alert('Xóa sự kiện thành công!');
          this.loadEvents();
          this.loadAllEvents();
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi xóa sự kiện');
          console.error('Lỗi xóa sự kiện:', err);
        }
      });
    }
  }

  viewVolunteerProfile(maTNV: number): void {
    // Chuyển hướng đến trang hồ sơ TNV
    this.router.navigate(['/volunteers', maTNV]);
  }

  approveVolunteer(maDangKy: number | undefined): void {
    if (!maDangKy) return;
    
    this.http.put<any>(`${this.apiSuKienUrl}/registrations/${maDangKy}/approve`, {}).subscribe({
      next: () => {
        alert('Phê duyệt tình nguyện viên thành công!');
        this.loadVolunteersByEvent();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi phê duyệt');
        console.error('Lỗi phê duyệt:', err);
      }
    });
  }

  rejectVolunteer(maDangKy: number | undefined): void {
    if (!maDangKy) return;
    
    const lyDo = prompt('Nhập lý do từ chối:');
    if (lyDo === null) return;
    
    this.http.put<any>(`${this.apiSuKienUrl}/registrations/${maDangKy}/reject`, { lyDo }).subscribe({
      next: () => {
        alert('Từ chối tình nguyện viên thành công!');
        this.loadVolunteersByEvent();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi từ chối');
        console.error('Lỗi từ chối:', err);
      }
    });
  }

  evaluateVolunteer(maTNV: number): void {
    // Mở form đánh giá
    const diem = prompt('Đánh giá điểm (1-5):', '5');
    if (!diem) return;
    
    const noiDung = prompt('Nhận xét:', '');
    if (noiDung === null) return;

    const evaluateDto = {
      maTNV: maTNV,
      maToChuc: this.organization?.maToChuc,
      diem: parseInt(diem),
      noiDung: noiDung
    };
    
    this.http.post<any>(`${this.apiDanhGiaUrl}`, evaluateDto).subscribe({
      next: () => {
        alert('Đánh giá thành công!');
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi đánh giá');
        console.error('Lỗi đánh giá:', err);
      }
    });
  }

  readNotification(maThongBao: number): void {
    this.http.put<any>(`${this.apiThongBaoUrl}/${maThongBao}/read`, {}).subscribe({
      next: () => {
        const thongBao = this.notifications.find(tb => tb.maThongBao === maThongBao);
        if (thongBao) thongBao.daDoc = true;
      },
      error: (err) => console.error('Lỗi đánh dấu đã đọc:', err)
    });
  }

  openUploadForm(): void {
    this.showUploadForm = true;
    this.documentForm.reset();
    this.selectedDocumentFile = null;
  }

  cancelUpload(): void {
    this.showUploadForm = false;
  }

  uploadDocument(): void {
    if (this.documentForm.invalid || !this.selectedDocumentFile) {
      alert('Vui lòng điền đầy đủ thông tin và chọn tệp');
      return;
    }

    if (!this.organization?.maToChuc) return;
    
    const formData = new FormData();
    const formValue = this.documentForm.value;
    
    formData.append('tenGiayTo', formValue.tenGiayTo);
    formData.append('loaiGiayTo', formValue.loaiGiayTo);
    formData.append('moTa', formValue.moTa || '');
    formData.append('maToChuc', this.organization.maToChuc.toString());
    formData.append('file', this.selectedDocumentFile);
    
    this.http.post<any>(`${this.apiGiayToUrl}`, formData).subscribe({
      next: () => {
        alert('Tải lên giấy tờ thành công!');
        this.showUploadForm = false;
        this.loadLegalDocuments();
      },
      error: (err) => {
        alert(err.error?.message || 'Có lỗi xảy ra khi tải lên');
        console.error('Lỗi tải lên:', err);
      }
    });
  }

  deleteDocument(maGiayTo: number): void {
    if (confirm('Bạn có chắc muốn xóa giấy tờ này?')) {
      this.http.delete<any>(`${this.apiGiayToUrl}/${maGiayTo}`).subscribe({
        next: () => {
          alert('Xóa giấy tờ thành công!');
          this.loadLegalDocuments();
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi xóa giấy tờ');
          console.error('Lỗi xóa giấy tờ:', err);
        }
      });
    }
  }

  // Helper methods
  getTrangThaiClass(status: number): string {
    switch (status) {
      case 0: return 'bg-warning text-dark';
      case 1: return 'bg-success';
      case 2: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getTrangThaiText(status: number): string {
    switch (status) {
      case 0: return 'Chờ xác minh';
      case 1: return 'Đã xác minh';
      case 2: return 'Bị từ chối';
      default: return 'Không xác định';
    }
  }

  getEventStatusClass(status: number): string {
    switch (status) {
      case 0: return 'bg-warning text-dark';
      case 1: return 'bg-success';
      case 2: return 'bg-danger';
      case 3: return 'bg-primary';
      case 4: return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  getEventStatusText(status: number): string {
    switch (status) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã duyệt';
      case 2: return 'Bị từ chối';
      case 3: return 'Đang diễn ra';
      case 4: return 'Đã kết thúc';
      default: return 'Không xác định';
    }
  }

  getVolunteerStatusClass(status: number): string {
    switch (status) {
      case 0: return 'bg-warning text-dark';
      case 1: return 'bg-success';
      case 2: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getVolunteerStatusText(status: number): string {
    switch (status) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã duyệt';
      case 2: return 'Bị từ chối';
      default: return 'Không xác định';
    }
  }

  getDocumentStatusClass(status: number): string {
    switch (status) {
      case 0: return 'bg-warning text-dark';
      case 1: return 'bg-success';
      case 2: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getDocumentStatusText(status: number): string {
    switch (status) {
      case 0: return 'Chờ xác minh';
      case 1: return 'Đã xác minh';
      case 2: return 'Bị từ chối';
      default: return 'Không xác định';
    }
  }

  getDocumentTypeText(type: string): string {
    switch (type) {
      case 'GiayPhepKinhDoanh': return 'Giấy phép kinh doanh';
      case 'ThanhLapToChuc': return 'Giấy phép thành lập tổ chức';
      case 'ChungNhanHoatDong': return 'Giấy chứng nhận hoạt động';
      case 'Khac': return 'Khác';
      default: return type;
    }
  }
}
