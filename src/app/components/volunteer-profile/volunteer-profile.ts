import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TinhNguyenVien, TinhNguyenVienResponeDTos, KyNang, LinhVuc } from '../../models/volunteer';
import { User } from '../../models/user';
import { AuthService, ChangeEmailRequest } from '../../services/auth';
import { FieldService } from '../../services/field';
import { SkillService } from '../../services/skill';
import { EvaluationService } from '../../services/evaluation.service';
import { CertificateService } from '../../services/certificate.service';
import { CertificateViewerModalComponent } from '../certificate-viewer-modal/certificate-viewer-modal';
import { StarRatingComponent } from '../shared/star-rating/star-rating';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';

// Sử dụng interface từ models/volunteer.ts

@Component({
  selector: 'app-volunteer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, CertificateViewerModalComponent, StarRatingComponent],
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
  
  // Text input cho lĩnh vực và kỹ năng mới
  newLinhVucText: string[] = [];
  newKyNangText: string[] = [];

  apiUrl = `${environment.apiUrl}/tinhnguyenvien`;
  apiKyNangUrl = `${environment.apiUrl}/kynang`;
  apiLinhVucUrl = `${environment.apiUrl}/linhvuc`;

  isLoggedIn = false;
  username = '';
  role = '';
  
  // Data cho các tabs
  eventHistory: any[] = [];
  certificates: any[] = [];
  evaluations: any[] = []; // Đánh giá nhận được
  myEvaluations: any[] = []; // Đánh giá đã tạo
  
  // Đánh giá theo sự kiện (để hiển thị trong card)
  eventEvaluationsMap: Map<number, { fromMe: any | null, toMe: any | null, hasRequestedEvaluation: boolean }> = new Map();
  
  // Track các sự kiện đã gửi yêu cầu đánh giá
  requestedEvaluationEvents: Set<number> = new Set();
  
  // Track các sự kiện đã gửi yêu cầu cấp chứng nhận
  requestedCertificateEvents: Set<number> = new Set();
  
  // Preview đánh giá
  selectedEvaluationForPreview: any = null;
  evaluationPreviewTitle: string = '';
  showEvaluationPreviewModal = false;
  
  // Modal xem chứng nhận
  showCertificateModal = false;
  selectedCertificateId: number | null = null;
  
  // Map chứng nhận theo sự kiện
  eventCertificatesMap: Map<number, any> = new Map();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService,
    private fieldService: FieldService,
    private skillService: SkillService,
    private evaluationService: EvaluationService,
    private certificateService: CertificateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadUserInfo();
    this.loadKyNangs();
    this.loadLinhVucs();
    this.isLoggedIn = this.auth.isAuthenticated();
    
    // Đọc tab đã lưu từ localStorage
    const savedTab = localStorage.getItem('volunteerProfileActiveTab');
    if (savedTab && ['profile', 'events', 'certificates', 'reputation'].includes(savedTab)) {
      this.activeTab = savedTab;
    }
    
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
      email: [{value: '', disabled: true}], // Disable email field vì chỉ có thể đổi qua modal
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

  // CẬP NHẬT method loadVolunteerInfo() để xử lý ngày ngay từ API response
  loadVolunteerInfo(): void {
    if (!this.user?.maTaiKhoan) return;

    this.http.get<any>(`${this.apiUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: async (response) => {
        console.log('API response:', response);
        this.volunteer = response.data || response;

        // XỬ LÝ NGÀY SINH NGAY SAU KHI NHẬN DATA TỪ API
        if (this.volunteer?.ngaySinh) {
          this.volunteer.ngaySinh = this.formatDateForInput(this.volunteer.ngaySinh);
          console.log('Processed ngaySinh:', this.volunteer.ngaySinh);
        }

        console.log('Volunteer data:', this.volunteer);
        this.populateForm();

        if (this.volunteer?.anhDaiDien) {
          this.previewUrl = getImageUrl(this.volunteer.anhDaiDien);
        }

        await this.loadKyNangsAndLinhVucs();

        if (this.volunteer?.kyNangIds) {
          this.selectedKyNangs = [...this.volunteer.kyNangIds];
        } else {
          this.selectedKyNangs = [];
        }
        this.newKyNangText = new Array(this.selectedKyNangs.length).fill('');

        if (this.volunteer?.linhVucIds) {
          this.selectedLinhVucs = [...this.volunteer.linhVucIds];
        } else {
          this.selectedLinhVucs = [];
        }
        this.newLinhVucText = new Array(this.selectedLinhVucs.length).fill('');

        if (this.volunteer?.maTNV && (!this.volunteer.kyNangs || this.volunteer.kyNangs.length === 0)) {
          this.loadVolunteerSkills(this.volunteer.maTNV);
        }

        if (this.volunteer?.maTNV && (!this.volunteer.linhVucs || this.volunteer.linhVucs.length === 0)) {
          this.loadVolunteerFields(this.volunteer.maTNV);
        }
        
        // Load dữ liệu cho tab đã lưu (nếu có)
        this.loadDataForSavedTab();
      },
      error: (err) => {
        console.error('Lỗi tải thông tin:', err);
        if (err.status === 404) {
          console.log('Chưa có hồ sơ tình nguyện viên');
        }
      }
    });
  }
  
  // Load dữ liệu cho tab đã lưu từ localStorage
  loadDataForSavedTab(): void {
    const savedTab = localStorage.getItem('volunteerProfileActiveTab');
    if (savedTab && ['profile', 'events', 'certificates', 'reputation'].includes(savedTab)) {
      // Gọi switchTab để load dữ liệu tương ứng
      // Nhưng không cần set lại activeTab vì đã set trong ngOnInit
      this.loadDataForTab(savedTab);
    }
  }
  
  // Load dữ liệu cho tab cụ thể (không thay đổi activeTab)
  loadDataForTab(tab: string): void {
    if (tab === 'events' && this.eventHistory.length === 0) {
      this.loadEventHistory();
    } else if (tab === 'certificates' && this.certificates.length === 0) {
      this.loadCertificates();
    } else if (tab === 'reputation') {
      if (this.evaluations.length === 0) {
        this.loadEvaluations();
      }
      if (this.myEvaluations.length === 0 && this.user?.maTaiKhoan) {
        this.loadMyEvaluations();
      }
    }
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

  // Thêm helper method để format ngày sinh an toàn
  private formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';

    try {
      // Nếu là Date object, convert sang string trước
      let dateStr: string;
      if (dateValue instanceof Date) {
        dateStr = dateValue.toISOString();
      } else {
        dateStr = String(dateValue).trim();
      }

      // Nếu có dạng ISO với T (2003-10-10T00:00:00 hoặc 2003-10-10T00:00:00.000Z)
      if (dateStr.includes('T')) {
        const datePart = dateStr.split('T')[0];
        // Kiểm tra lại format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart;
        }
      }

      // Nếu đã là YYYY-MM-DD (không có thời gian)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      // Thử parse bằng Date object
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return '';
    } catch (error) {
      console.error('Error formatting date:', error, 'Input value:', dateValue);
      return '';
    }
  }

  // Cập nhật method populateForm() - version đơn giản hơn
  populateForm(): void {
    if (!this.volunteer) return;

    console.log('Populating form with data:', this.volunteer);

    // Format ngày sinh - đảm bảo format đúng trước khi set
    let formattedNgaySinh = '';
    if (this.volunteer.ngaySinh) {
      // Format lại ngày sinh trong volunteer object trước
      this.volunteer.ngaySinh = this.formatDateForInput(this.volunteer.ngaySinh);
      formattedNgaySinh = this.volunteer.ngaySinh;
    }
    console.log('Formatted ngaySinh:', formattedNgaySinh);

    // Set tất cả giá trị form
    this.registrationForm.patchValue({
      hoTen: this.volunteer.hoTen || '',
      cccd: this.volunteer.cccd || '',
      soDienThoai: this.volunteer.soDienThoai || '',
      email: this.volunteer.email || '',
      ngaySinh: formattedNgaySinh,
      gioiTinh: this.volunteer.gioiTinh || '',
      diaChi: this.volunteer.diaChi || '',
      gioiThieu: this.volunteer.gioiThieu || ''
    }, { emitEvent: false });

    // Đảm bảo email vẫn bị disabled
    const emailControl = this.registrationForm.get('email');
    if (emailControl && !emailControl.disabled) {
      emailControl.disable({ emitEvent: false });
    }

    // Trigger change detection
    this.cdr.detectChanges();

    console.log('Form values after population:', this.registrationForm.value);
    console.log('ngaySinh control value:', this.registrationForm.get('ngaySinh')?.value);
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
    this.newKyNangText.push('');
  }
  
  async createNewKyNang(index: number): Promise<void> {
    const text = this.newKyNangText[index]?.trim();
    if (!text) {
      alert('Vui lòng nhập tên kỹ năng');
      return;
    }
    
    const existing = this.allKyNangs.find(kn => kn.tenKyNang?.toLowerCase() === text.toLowerCase());
    if (existing) {
      this.selectedKyNangs[index] = existing.maKyNang;
      this.newKyNangText[index] = '';
      return;
    }
    
    try {
      const response: any = await this.skillService.createSkill({ tenKyNang: text }).toPromise();
      const newSkill = response.data || response;
      this.allKyNangs.push(newSkill);
      this.selectedKyNangs[index] = newSkill.maKyNang;
      this.newKyNangText[index] = '';
    } catch (error: any) {
      console.error('Lỗi khi tạo kỹ năng mới:', error);
      alert(error.error?.message || 'Không thể tạo kỹ năng mới. Vui lòng thử lại.');
    }
  }

  removeKyNang(idx: number): void {
    // Cho phép xóa hết kỹ năng
    this.selectedKyNangs.splice(idx, 1);
    this.newKyNangText.splice(idx, 1);
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
    this.newLinhVucText.push('');
  }
  
  async createNewLinhVuc(index: number): Promise<void> {
    const text = this.newLinhVucText[index]?.trim();
    if (!text) {
      alert('Vui lòng nhập tên lĩnh vực');
      return;
    }
    
    const existing = this.allLinhVucs.find(lv => lv.tenLinhVuc?.toLowerCase() === text.toLowerCase());
    if (existing) {
      this.selectedLinhVucs[index] = existing.maLinhVuc;
      this.newLinhVucText[index] = '';
      return;
    }
    
    try {
      const response: any = await this.fieldService.createField({ tenLinhVuc: text }).toPromise();
      const newField = response.data || response;
      this.allLinhVucs.push(newField);
      this.selectedLinhVucs[index] = newField.maLinhVuc;
      this.newLinhVucText[index] = '';
    } catch (error: any) {
      console.error('Lỗi khi tạo lĩnh vực mới:', error);
      alert(error.error?.message || 'Không thể tạo lĩnh vực mới. Vui lòng thử lại.');
    }
  }

  removeLinhVuc(idx: number): void {
    // Cho phép xóa hết lĩnh vực
    this.selectedLinhVucs.splice(idx, 1);
    this.newLinhVucText.splice(idx, 1);
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
    // Dùng getRawValue() để lấy cả giá trị của disabled controls
    const formData = this.registrationForm.getRawValue();
    
    const createDto = {
      maTaiKhoan: this.user?.maTaiKhoan,
      hoTen: formData.hoTen,
      email: formData.email || this.volunteer?.email || '',
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
            u.profileImage = getImageUrl(this.volunteer.anhDaiDien);
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

  // CẬP NHẬT method updateVolunteer() để format ngày trước khi gửi
  async updateVolunteer(): Promise<void> {
    if (!this.volunteer?.maTNV) return;

    const formData = new FormData();
    // Dùng getRawValue() để lấy cả giá trị của disabled controls (email)
    const formValue = this.registrationForm.getRawValue();

    formData.append('hoTen', formValue.hoTen);
    // Lấy email từ getRawValue() hoặc từ volunteer object nếu không có
    const email = formValue.email || this.volunteer?.email || '';
    formData.append('email', email);
    formData.append('cccd', formValue.cccd || '');
    formData.append('soDienThoai', formValue.soDienThoai || '');

    // XỬ LÝ NGÀY SINH TRƯỚC KHI GỬI
    const ngaySinh = formValue.ngaySinh ? this.formatDateForInput(formValue.ngaySinh) : '';
    formData.append('ngaySinh', ngaySinh);

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

        // XỬ LÝ NGÀY SINH TỪ RESPONSE NGAY LẬP TỨC - format trước khi populate form
        if (this.volunteer?.ngaySinh) {
          this.volunteer.ngaySinh = this.formatDateForInput(this.volunteer.ngaySinh);
          console.log('Formatted ngaySinh after update:', this.volunteer.ngaySinh);
        }

        this.selectedFile = null;
        this.populateForm();

        if (this.volunteer?.anhDaiDien) {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.anhDaiDien = this.volunteer.anhDaiDien;
            u.profileImage = getImageUrl(this.volunteer.anhDaiDien);
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
    
    // Lưu tab vào localStorage
    localStorage.setItem('volunteerProfileActiveTab', tab);
    
    // Load dữ liệu cho tab tương ứng
    this.loadDataForTab(tab);
  }

  // Load lịch sử sự kiện
  loadEventHistory(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${environment.apiUrl}/dondangky/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        const allEvents = response.data || response || [];
        const now = new Date();
        
        console.log('Tất cả sự kiện từ API:', allEvents);
        
        // Lọc chỉ các sự kiện đã kết thúc và đã được duyệt
        this.eventHistory = allEvents.filter((reg: any) => {
          // Kiểm tra đã được duyệt
          if (reg.trangThai !== 1) return false;
          
          // API trả về event object, không phải suKien
          const eventData = reg.event || reg.suKien;
          if (!eventData) return false;
          
          // Kiểm tra sự kiện đã kết thúc
          if (eventData.ngayKetThuc) {
            const endDate = new Date(eventData.ngayKetThuc);
            return endDate < now;
          }
          
          // Nếu không có ngayKetThuc, kiểm tra trạng thái
          if (eventData.trangThaiHienThi === 'Đã kết thúc' || eventData.trangThai === 'Đã kết thúc') {
            return true;
          }
          
          return false;
        });
        
        console.log('Sự kiện đã tham gia (đã lọc):', this.eventHistory);
        
        // Load danh sách đã gửi yêu cầu đánh giá
        this.loadRequestedEvaluations();
        
        // Load danh sách đã gửi yêu cầu cấp chứng nhận
        this.loadRequestedCertificates();
        
        // Load thông tin tổ chức và đánh giá cho từng sự kiện
        this.loadOrganizationInfoAndEvaluations();
        
        // Load chứng nhận cho các sự kiện
        this.loadEventCertificates();
      },
      error: (err) => {
        console.error('Lỗi tải lịch sử sự kiện:', err);
      }
    });
  }
  
  // Load thông tin tổ chức và đánh giá cho các sự kiện
  loadOrganizationInfoAndEvaluations(): void {
    if (!this.user?.maTaiKhoan) return;
    
    // Load tất cả đánh giá của user
    this.evaluationService.getGivenEvaluations(this.user.maTaiKhoan).subscribe({
      next: (myEvalsResponse: any) => {
        const myEvals = myEvalsResponse?.data || myEvalsResponse || [];
        
        // Load đánh giá nhận được
        this.evaluationService.getReceivedEvaluations(this.user!.maTaiKhoan).subscribe({
          next: (receivedEvalsResponse: any) => {
            const receivedEvals = receivedEvalsResponse?.data || receivedEvalsResponse || [];
            
            // Map đánh giá theo sự kiện
            this.eventHistory.forEach(reg => {
              const eventData = reg.event || reg.suKien;
              if (!eventData?.maTaiKhoanToChuc) return;
              
              // Đánh giá của tôi cho tổ chức (tôi đánh giá sự kiện)
              const fromMe = myEvals.find((e: any) => 
                e.maSuKien === reg.maSuKien && 
                e.maNguoiDuocDanhGia === eventData.maTaiKhoanToChuc
              ) || null;
              
              // Đánh giá của tổ chức cho tôi (sự kiện đánh giá tôi)
              const toMe = receivedEvals.find((e: any) => 
                e.maSuKien === reg.maSuKien && 
                e.maNguoiDanhGia === eventData.maTaiKhoanToChuc
              ) || null;
              
              this.eventEvaluationsMap.set(reg.maSuKien, { fromMe, toMe, hasRequestedEvaluation: false });
              
              // Nếu tổ chức đã đánh giá, xóa khỏi danh sách đã gửi yêu cầu
              if (toMe) {
                this.requestedEvaluationEvents.delete(reg.maSuKien);
                this.saveRequestedEvaluations();
              }
              
              // Load thông tin tổ chức nếu chưa có
              if (!eventData.tenToChuc && eventData.maToChuc) {
                this.loadOrganizationInfo(reg, eventData.maToChuc);
              }
            });
          },
          error: (err) => {
            console.error('Lỗi load đánh giá nhận được:', err);
          }
        });
      },
      error: (err) => {
        console.error('Lỗi load đánh giá đã tạo:', err);
      }
    });
  }
  
  // Load thông tin tổ chức
  loadOrganizationInfo(reg: any, maToChuc: number): void {
    this.http.get<any>(`${environment.apiUrl}/organization/${maToChuc}`).subscribe({
      next: (response: any) => {
        const org = response?.data || response;
        const eventData = reg.event || reg.suKien;
        if (eventData) {
          eventData.tenToChuc = org?.tenToChuc || 'Tổ chức';
        }
      },
      error: (err) => {
        console.error('Lỗi load thông tin tổ chức:', err);
      }
    });
  }
  
  // Helper để lấy đánh giá cho một sự kiện
  getEvaluationForEvent(maSuKien: number): { fromMe: any | null, toMe: any | null } {
    return this.eventEvaluationsMap.get(maSuKien) || { fromMe: null, toMe: null };
  }
  
  // Xem preview đánh giá
  viewEvaluationPreview(evaluation: any, eventName: string, title: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation(); // Ngăn click vào card
    }
    
    if (!evaluation) {
      console.error('Không có đánh giá để hiển thị');
      alert('Không tìm thấy đánh giá');
      return;
    }
    
    console.log('Opening evaluation preview:', evaluation);
    this.selectedEvaluationForPreview = evaluation;
    this.evaluationPreviewTitle = title;
    this.showEvaluationPreviewModal = true;
    
    // Force change detection
    this.cdr.detectChanges();
    
    // Sử dụng setTimeout để đảm bảo DOM đã render
    setTimeout(() => {
      const modalEl = document.getElementById('evaluationPreviewModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = new (window as any).bootstrap.Modal(modalEl);
            modal.show();
      }
    }, 0);
  }
  
  closeEvaluationPreviewModal(): void {
    const modalEl = document.getElementById('evaluationPreviewModal');
    if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }
      }
    
    this.showEvaluationPreviewModal = false;
    this.selectedEvaluationForPreview = null;
  }
  
  // Đánh giá tổ chức
  selectedEventForEvaluation: any = null;
  evaluationRating = 5;
  evaluationComment = '';
  showEvaluationModal = false;
  
  openEvaluationModal(reg: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (!reg) {
      console.error('Không có registration data');
      return;
    }
    
    console.log('Opening evaluation modal for:', reg);
    this.selectedEventForEvaluation = reg;
    this.evaluationRating = 5;
    this.evaluationComment = '';
    this.showEvaluationModal = true;
    
    // Force change detection
    this.cdr.detectChanges();
    
    setTimeout(() => {
      const modalEl = document.getElementById('evaluationModal');
      if (modalEl && (window as any).bootstrap) {
        const modal = new (window as any).bootstrap.Modal(modalEl);
            modal.show();
      }
    }, 0);
  }
  
  closeEvaluationModal(): void {
    const modalEl = document.getElementById('evaluationModal');
    if (modalEl && (window as any).bootstrap) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }
      }
    
    this.showEvaluationModal = false;
    this.selectedEventForEvaluation = null;
  }
  
  submitEvaluation(): void {
    if (!this.selectedEventForEvaluation || !this.user?.maTaiKhoan) {
      alert('Không thể gửi đánh giá. Vui lòng thử lại.');
      return;
    }

    const eventData = this.selectedEventForEvaluation.event || this.selectedEventForEvaluation.suKien;
    if (!eventData?.maTaiKhoanToChuc) {
      alert('Không thể lấy thông tin tổ chức. Vui lòng thử lại sau.');
      return;
    }

    const evaluation = {
      maNguoiDanhGia: this.user.maTaiKhoan,
      maNguoiDuocDanhGia: eventData.maTaiKhoanToChuc,
      maSuKien: this.selectedEventForEvaluation.maSuKien,
      diemSo: this.evaluationRating,
      noiDung: this.evaluationComment.trim() || undefined
    };

    this.evaluationService.createEvaluation(evaluation).subscribe({
      next: () => {
        alert('Đánh giá thành công! Cảm ơn bạn đã đóng góp ý kiến.');
        this.closeEvaluationModal();
        // Reload đánh giá
        this.loadOrganizationInfoAndEvaluations();
      },
      error: (err) => {
        console.error('Lỗi đánh giá:', err);
        alert(err.error?.message || 'Không thể gửi đánh giá');
      }
    });
  }
  
  // Gửi yêu cầu được đánh giá
  requestEvaluationFromOrganization(reg: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (!this.user?.maTaiKhoan) {
      alert('Bạn cần đăng nhập để gửi yêu cầu');
      return;
    }
    
    const eventData = reg.event || reg.suKien;
    if (!eventData?.maTaiKhoanToChuc) {
      alert('Không thể lấy thông tin tổ chức');
      return;
    }
    
    // Kiểm tra đã gửi yêu cầu chưa
    if (this.requestedEvaluationEvents.has(reg.maSuKien)) {
      if (!confirm('Bạn đã gửi yêu cầu đánh giá cho sự kiện này. Bạn có muốn gửi lại yêu cầu không?')) {
        return;
      }
    } else {
      if (!confirm('Bạn có muốn gửi yêu cầu tổ chức đánh giá bạn cho sự kiện này không?')) {
        return;
      }
    }
    
    const volunteerName = this.volunteer?.hoTen || 'Tình nguyện viên';
    const requestData = {
      maTaiKhoanToChuc: eventData.maTaiKhoanToChuc,
      noiDung: `${volunteerName} yêu cầu bạn đánh giá cho sự kiện "${eventData.tenSuKien || 'Sự kiện'}"`
    };
    
    this.http.post<any>(`${environment.apiUrl}/notification/request-evaluation`, requestData).subscribe({
      next: () => {
        // Đánh dấu đã gửi yêu cầu
        this.requestedEvaluationEvents.add(reg.maSuKien);
        // Lưu vào localStorage để persist
        this.saveRequestedEvaluations();
        alert('Đã gửi yêu cầu đánh giá tới tổ chức thành công!');
      },
      error: (err) => {
        console.error('Lỗi gửi yêu cầu:', err);
        alert('Không thể gửi yêu cầu: ' + (err.error?.message || 'Đã xảy ra lỗi'));
      }
    });
  }
  
  // Kiểm tra đã gửi yêu cầu đánh giá chưa
  hasRequestedEvaluation(maSuKien: number): boolean {
    return this.requestedEvaluationEvents.has(maSuKien);
  }
  
  // Lưu danh sách đã gửi yêu cầu vào localStorage
  saveRequestedEvaluations(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_evaluations_${this.user.maTaiKhoan}`;
      const data = Array.from(this.requestedEvaluationEvents);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
  
  // Load danh sách đã gửi yêu cầu từ localStorage
  loadRequestedEvaluations(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_evaluations_${this.user.maTaiKhoan}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const array = JSON.parse(data);
          this.requestedEvaluationEvents = new Set(array);
        } catch (e) {
          console.error('Lỗi load requested evaluations:', e);
        }
      }
    }
  }
  
  // Kiểm tra đã yêu cầu cấp chứng nhận chưa
  hasRequestedCertificate(maSuKien: number): boolean {
    return this.requestedCertificateEvents.has(maSuKien);
  }
  
  // Lưu danh sách đã gửi yêu cầu cấp chứng nhận vào localStorage
  saveRequestedCertificates(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_certificates_${this.user.maTaiKhoan}`;
      const data = Array.from(this.requestedCertificateEvents);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
  
  // Load danh sách đã gửi yêu cầu cấp chứng nhận từ localStorage
  loadRequestedCertificates(): void {
    if (this.user?.maTaiKhoan) {
      const key = `requested_certificates_${this.user.maTaiKhoan}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const array = JSON.parse(data);
          this.requestedCertificateEvents = new Set(array);
        } catch (e) {
          console.error('Lỗi load requested certificates:', e);
        }
      }
    }
  }

  // Load giấy chứng nhận
  loadCertificates(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${environment.apiUrl}/certificate/volunteers/${this.volunteer.maTNV}`).subscribe({
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
    if (!certificate.maGiayChungNhan) {
      alert('Không thể xem chứng nhận này');
      return;
  }

    // Mở modal xem chứng nhận
    this.selectedCertificateId = certificate.maGiayChungNhan;
    this.showCertificateModal = true;
    }
    
  // Đóng modal chứng nhận
  closeCertificateModal(): void {
    this.showCertificateModal = false;
    this.selectedCertificateId = null;
  }

  // Load đánh giá nhận được (người khác đánh giá mình)
  loadEvaluations(): void {
    if (!this.user?.maTaiKhoan) return;
    
    this.evaluationService.getReceivedEvaluations(this.user.maTaiKhoan).subscribe({
      next: (response) => {
        this.evaluations = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá nhận được:', err);
      }
    });
  }

  // Load đánh giá đã tạo (đánh giá người khác)
  loadMyEvaluations(): void {
    if (!this.user?.maTaiKhoan) return;
    
    this.evaluationService.getGivenEvaluations(this.user.maTaiKhoan).subscribe({
      next: (response: any) => {
        this.myEvaluations = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá đã đưa ra:', err);
      }
    });
  }
  
  // Load chứng nhận cho các sự kiện
  loadEventCertificates(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${environment.apiUrl}/certificate/volunteers/${this.volunteer.maTNV}`).subscribe({
      next: (response: any) => {
        const certificates = response?.data || response || [];
        
        // Map chứng nhận theo sự kiện
        certificates.forEach((cert: any) => {
          if (cert.maSuKien) {
            this.eventCertificatesMap.set(cert.maSuKien, cert);
          }
        });
      },
      error: (err) => {
        console.error('Lỗi load chứng nhận:', err);
      }
    });
  }
  
  // Lấy chứng nhận cho sự kiện
  getCertificateForEvent(maSuKien: number): any | null {
    return this.eventCertificatesMap.get(maSuKien) || null;
  }
  
  // Xem chứng nhận từ sự kiện
  viewCertificateFromEvent(reg: any): void {
    const cert = this.getCertificateForEvent(reg.maSuKien);
    if (cert?.maGiayChungNhan) {
      this.selectedCertificateId = cert.maGiayChungNhan;
      this.showCertificateModal = true;
    } else {
      alert('Không tìm thấy chứng nhận cho sự kiện này');
    }
  }
  
  // Yêu cầu cấp chứng nhận từ sự kiện
  requestCertificateFromEvent(reg: any): void {
    if (!this.user?.maTaiKhoan) {
      alert('Bạn cần đăng nhập để gửi yêu cầu');
      return;
    }
    
    const eventData = reg.event || reg.suKien;
    if (!eventData?.maTaiKhoanToChuc) {
      alert('Không thể lấy thông tin tổ chức');
      return;
    }
    
    if (!confirm('Bạn có muốn gửi yêu cầu tổ chức cấp giấy chứng nhận cho sự kiện này không?')) {
      return;
    }
    
    const volunteerName = this.volunteer?.hoTen || 'Tình nguyện viên';
    const requestData = {
      maTaiKhoanToChuc: eventData.maTaiKhoanToChuc,
      noiDung: `${volunteerName} yêu cầu bạn cấp giấy chứng nhận cho sự kiện "${eventData.tenSuKien || 'Sự kiện'}"`
    };
    
    // Sử dụng endpoint request-evaluation tạm thời (có thể cần tạo endpoint riêng sau)
    this.http.post<any>(`${environment.apiUrl}/notification/request-evaluation`, requestData).subscribe({
      next: () => {
        // Lưu trạng thái đã gửi yêu cầu
        this.requestedCertificateEvents.add(reg.maSuKien);
        this.saveRequestedCertificates();
        alert('Đã gửi yêu cầu cấp giấy chứng nhận tới tổ chức thành công!');
      },
      error: (err) => {
        console.error('Lỗi gửi yêu cầu:', err);
        alert('Không thể gửi yêu cầu: ' + (err.error?.message || 'Đã xảy ra lỗi'));
      }
    });
  }
}