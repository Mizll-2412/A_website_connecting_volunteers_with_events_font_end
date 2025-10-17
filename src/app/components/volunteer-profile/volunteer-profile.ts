import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TinhNguyenVien, TinhNguyenVienResponeDTos } from '../../models/volunteer';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';
import { LocalDataService, Volunteer as LocalVolunteer, Skill, Field } from '../../services/local-data';

interface ThamGiaSuKien {
  maSuKien: number;
  tenSuKien: string;
  ngayDangKy: string;
  vaiTro: string;
  trangThai: string;
  daDanhGia: boolean;
  diemDanhGia?: number;
}

interface GiayChungNhan {
  maGCN: number;
  tenSuKien: string;
  ngayCap: string;
  noiDung: string;
  linkDownload: string;
}

interface DanhGia {
  maDanhGia: number;
  tenToChuc: string;
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

interface KyNang {
  maKyNang: number;
  tenKyNang: string;
}

interface LinhVuc {
  maLinhVuc: number;
  tenLinhVuc: string;
}

@Component({
  selector: 'app-volunteer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
  
  // Dữ liệu từ LocalStorage
  localVolunteer?: LocalVolunteer;
  localSkills: Skill[] = [];
  localFields: Field[] = [];
  
  // Dữ liệu cho các tab mới
  thamGiaSuKiens: ThamGiaSuKien[] = [];
  giayChungNhans: GiayChungNhan[] = [];
  danhGias: DanhGia[] = [];
  thongBaos: ThongBao[] = [];

  apiUrl = 'http://localhost:5000/api/tinhnguyenvien';
  apiKyNangUrl = 'http://localhost:5000/api/kynang';
  apiLinhVucUrl = 'http://localhost:5000/api/linhvuc';
  apiSuKienUrl = 'http://localhost:5000/api/sukien';
  apiDanhGiaUrl = 'http://localhost:5000/api/danhgia';
  apiGiayChungNhanUrl = 'http://localhost:5000/api/giaychungnhan';
  apiThongBaoUrl = 'http://localhost:5000/api/thongbao';

  isLoggedIn = false;
  username = '';
  role = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService,
    private localDataService: LocalDataService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      
      // Lấy dữ liệu từ LocalStorage trước
      this.loadLocalSkillsAndFields();
      this.loadLocalVolunteerInfo();
      
      // Sau đó mới load thông tin từ API (nếu có)
      this.loadUserInfo();
      this.loadKyNangs();
      this.loadLinhVucs();
    }
    
    // Hiển thị form với dữ liệu đã có
    this.populateForm();
  }
  
  loadLocalSkillsAndFields(): void {
    this.localSkills = this.localDataService.getSkills();
    this.localFields = this.localDataService.getFields();
  }
  
  loadLocalVolunteerInfo(): void {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      if (user?.maTaiKhoan) {
        this.localVolunteer = this.localDataService.getVolunteerByUserId(user.maTaiKhoan);
        console.log('Tìm thấy thông tin TNV trong localStorage:', this.localVolunteer);
        
        // Nếu đã có thông tin TNV, cập nhật các trường chọn
        if (this.localVolunteer) {
          // Cập nhật các kỹ năng và lĩnh vực đã chọn
          this.selectedKyNangs = [null, null, null, null];
          this.localVolunteer.skills.forEach((skillId, index) => {
            if (index < 4) this.selectedKyNangs[index] = skillId;
          });
          
          this.selectedLinhVucs = [null, null, null, null];
          this.localVolunteer.fields.forEach((fieldId, index) => {
            if (index < 4) this.selectedLinhVucs[index] = fieldId;
          });
        } else {
          console.log('Chưa có thông tin TNV trong localStorage, sẽ tạo mới sau khi submit form');
        }
      }
    }
  }

  initForm(): void {
    this.registrationForm = this.fb.group({
      hoTen: ['', Validators.required],
      cccd: [''],
      phoneNumber: [''],
      email: ['', [Validators.required, Validators.email]],
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
        this.volunteer = response.data || response;
        this.populateForm();
        
        if (this.volunteer?.anhDaiDien) {
          this.previewUrl = `http://localhost:5000${this.volunteer.anhDaiDien}`;
        }
        
        if (this.volunteer?.kyNangIds) {
          this.volunteer.kyNangIds.forEach((id, index) => {
            if (index < 4) this.selectedKyNangs[index] = id;
          });
        }
        
        if (this.volunteer?.linhVucIds) {
          this.volunteer.linhVucIds.forEach((id, index) => {
            if (index < 4) this.selectedLinhVucs[index] = id;
          });
        }

        // Sau khi lấy thông tin TNV thành công, load các thông tin khác
        if (this.volunteer?.maTNV) {
          this.loadThamGiaSuKien();
          this.loadGiayChungNhan();
          this.loadDanhGia();
          this.loadThongBao();
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
    // Ưu tiên sử dụng dữ liệu từ localStorage nếu có
    if (this.localVolunteer) {
      this.registrationForm.patchValue({
        hoTen: this.localVolunteer.name,
        cccd: '',  // Không có trường cccd trong LocalVolunteer
        phoneNumber: this.localVolunteer.phone,
        email: this.localVolunteer.email,
        ngaySinh: this.localVolunteer.birthDate,
        gioiTinh: this.localVolunteer.gender,
        diaChi: this.localVolunteer.address,
        gioiThieu: this.localVolunteer.introduction
      });
      
      // Cập nhật các kỹ năng và lĩnh vực đã chọn
      this.selectedKyNangs = [null, null, null, null];
      this.localVolunteer.skills.forEach((skillId, index) => {
        if (index < 4) this.selectedKyNangs[index] = skillId;
      });
      
      this.selectedLinhVucs = [null, null, null, null];
      this.localVolunteer.fields.forEach((fieldId, index) => {
        if (index < 4) this.selectedLinhVucs[index] = fieldId;
      });
      
      // Hiển thị ảnh đại diện nếu có
      if (this.localVolunteer.avatarUrl) {
        this.previewUrl = this.localVolunteer.avatarUrl;
      }
    } 
    // Nếu không có dữ liệu trong localStorage, sử dụng dữ liệu từ API
    else if (this.volunteer) {
      this.registrationForm.patchValue({
        hoTen: this.volunteer.hoTen,
        cccd: this.volunteer.cccd,
        email: this.volunteer.email,
        ngaySinh: this.volunteer.ngaySinh,
        gioiTinh: this.volunteer.gioiTinh,
        diaChi: this.volunteer.diaChi,
        gioiThieu: this.volunteer.gioiThieu
      });
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
  }

  // Xử lý khi chọn lĩnh vực
  onLinhVucChange(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLinhVucs[index] = value ? Number(value) : null;
  }
  
  // Phương thức mới sử dụng dữ liệu từ LocalStorage
  getSkillName(skillId: number): string {
    const skill = this.localSkills.find(s => s.id === skillId);
    return skill ? skill.name : '';
  }
  
  getFieldName(fieldId: number): string {
    const field = this.localFields.find(f => f.id === fieldId);
    return field ? field.name : '';
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
    if (this.registrationForm.invalid) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      // Chỉ lưu vào LocalStorage, không gọi API
      await this.saveToLocalStorage();
      alert('Lưu thông tin thành công!');
    } catch (error) {
      console.error('Lỗi khi lưu thông tin:', error);
      alert('Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.');
    }
  }
  
  async saveToLocalStorage(): Promise<void> {
    const formData = this.registrationForm.value;
    const userInfo = localStorage.getItem('user');
    
    if (!userInfo) {
      alert('Không tìm thấy thông tin người dùng');
      return;
    }
    
    const user = JSON.parse(userInfo);
    const userId = user.maTaiKhoan;
    
    if (!userId) {
      alert('Không tìm thấy ID người dùng');
      return;
    }
    
    // Lọc các kỹ năng và lĩnh vực đã chọn
    const selectedSkills = this.selectedKyNangs.filter(id => id !== null) as number[];
    const selectedFields = this.selectedLinhVucs.filter(id => id !== null) as number[];
    
    if (this.localVolunteer) {
      // Cập nhật thông tin TNV hiện có
      const updatedVolunteer = this.localDataService.updateVolunteer(this.localVolunteer.id, {
        name: formData.hoTen,
        email: formData.email,
        phone: formData.phoneNumber,
        birthDate: formData.ngaySinh,
        gender: formData.gioiTinh,
        address: formData.diaChi,
        introduction: formData.gioiThieu,
        skills: selectedSkills,
        fields: selectedFields
      });
      
      // Cập nhật biến localVolunteer
      if (updatedVolunteer) {
        this.localVolunteer = updatedVolunteer;
      }
    } else {
      // Tạo mới TNV
      const volunteers = this.localDataService.getVolunteers();
      const newId = volunteers.length > 0 ? Math.max(...volunteers.map(v => v.id)) + 1 : 1;
      
      const newVolunteer: LocalVolunteer = {
        id: newId,
        userId: userId,
        name: formData.hoTen,
        email: formData.email,
        phone: formData.phoneNumber,
        birthDate: formData.ngaySinh,
        gender: formData.gioiTinh,
        address: formData.diaChi,
        introduction: formData.gioiThieu,
        skills: selectedSkills,
        fields: selectedFields,
        rating: 0,
        eventsCompleted: 0,
        status: 'active'
      };
      
      // Thêm vào localStorage
      const updatedVolunteers = [...volunteers, newVolunteer];
      localStorage.setItem('volunteers', JSON.stringify(updatedVolunteers));
      
      // Cập nhật biến localVolunteer
      this.localVolunteer = newVolunteer;
    }
    
    // Cập nhật lại giao diện
    this.populateForm();
  }

  async createVolunteer(): Promise<void> {
    const formData = this.registrationForm.value;
    
    const createDto = {
      maTaiKhoan: this.user?.maTaiKhoan,
      hoTen: formData.hoTen,
      email: formData.email,
      cccd: formData.cccd,
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
    
    // Tải dữ liệu tương ứng khi chọn tab
    if (item === 'events' && this.volunteer?.maTNV) {
      this.loadThamGiaSuKien();
    } else if (item === 'certificates' && this.volunteer?.maTNV) {
      this.loadGiayChungNhan();
    } else if (item === 'ratings' && this.volunteer?.maTNV) {
      this.loadDanhGia();
    } else if (item === 'notifications' && this.volunteer?.maTNV) {
      this.loadThongBao();
    }
  }

  // Phương thức tải dữ liệu cho các tab
  loadThamGiaSuKien(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${this.apiUrl}/${this.volunteer.maTNV}/events`).subscribe({
      next: (response) => {
        this.thamGiaSuKiens = response.data || [];
      },
      error: (err) => console.error('Lỗi tải sự kiện tham gia:', err)
    });
  }

  loadGiayChungNhan(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${this.apiGiayChungNhanUrl}/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.giayChungNhans = response.data || [];
      },
      error: (err) => console.error('Lỗi tải giấy chứng nhận:', err)
    });
  }

  loadDanhGia(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${this.apiDanhGiaUrl}/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.danhGias = response.data || [];
      },
      error: (err) => console.error('Lỗi tải đánh giá:', err)
    });
  }

  loadThongBao(): void {
    if (!this.volunteer?.maTNV) return;
    
    this.http.get<any>(`${this.apiThongBaoUrl}/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.thongBaos = response.data || [];
      },
      error: (err) => console.error('Lỗi tải thông báo:', err)
    });
  }

  danhGiaSuKien(maSuKien: number): void {
    // Mở modal đánh giá sự kiện
    console.log('Đánh giá sự kiện:', maSuKien);
    // Thêm logic mở modal đánh giá ở đây
  }

  docThongBao(maThongBao: number): void {
    // Đánh dấu thông báo đã đọc
    if (!this.volunteer?.maTNV) return;
    
    this.http.put<any>(`${this.apiThongBaoUrl}/${maThongBao}/read`, {}).subscribe({
      next: () => {
        // Cập nhật trạng thái đã đọc
        const thongBao = this.thongBaos.find(tb => tb.maThongBao === maThongBao);
        if (thongBao) thongBao.daDoc = true;
      },
      error: (err) => console.error('Lỗi đánh dấu đã đọc:', err)
    });
  }
}