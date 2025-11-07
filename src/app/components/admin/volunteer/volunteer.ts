import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TinhNguyenVien } from '../../../models/volunteer';
import { TinhNguyenVienService } from '../../../services/volunteer';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { getImageUrl as getImageUrlUtil } from '../../../utils/image-url.util';

@Component({
  selector: 'app-tinh-nguyen-vien',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volunteer.html',
  styleUrls: ['./volunteer.css']
})
export class TinhNguyenVienComponent implements OnInit {
  TinhNguyenVien?: TinhNguyenVien;
  tuKhoaTimKiem: string = '';
  danhSachTNV: TinhNguyenVien[] = [];
  danhSachHienThi: TinhNguyenVien[] = [];
  tnvmoi: TinhNguyenVien = this.khoiTaoTNV();
  dangSua: boolean = false;
  dangThem: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Statistics
  tongSoTNV: number = 0;
  tnvHoatDong: number = 0;
  diemTrungBinh: string = '0.0';
  // Chi tiết TNV
  tnvdangxem: any = null;
  tnvdangxemSkills: any[] = [];
  tnvdangxemFields: any[] = [];
  tnvdangxemHistory: any[] = [];
  tnvdangxemLatestReview: any = null;
  
  // Cache for skills and fields
  volunteerSkillsCache: Map<number, any[]> = new Map();
  volunteerFieldsCache: Map<number, any[]> = new Map();
  
  // Master data for skills and fields
  allSkills: any[] = [];
  allFields: any[] = [];

  constructor(
    private tnvService: TinhNguyenVienService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadMasterData();
    this.taiLaiDuLieu();
  }
  
  loadMasterData(): void {
    // Load all skills
    this.http.get<any>(`${environment.apiUrl}/kynang`).subscribe({
      next: (response) => {
        this.allSkills = response.data || response || [];
      },
      error: (error) => {
        console.error('Lỗi khi tải kỹ năng:', error);
        this.allSkills = [];
      }
    });
    
    // Load all fields
    this.http.get<any>(`${environment.apiUrl}/linhvuc`).subscribe({
      next: (response) => {
        this.allFields = response.data || response || [];
      },
      error: (error) => {
        console.error('Lỗi khi tải lĩnh vực:', error);
        this.allFields = [];
      }
    });
  }

  khoiTaoTNV(): TinhNguyenVien {
    return {
      maTNV: 0,
      hoTen: '',
      email: '',
      gioiTinh: '',
      ngaySinh: '',
      cccd: '',
      diaChi: '',
      gioiThieu: '',
      anhDaiDien: '',
      diemTrungBinh: 0
    };
  }

  formatNgay(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  timKiem() {
    const keyword = this.tuKhoaTimKiem.toLowerCase();
    this.danhSachHienThi = this.danhSachTNV.filter(tnv =>
      (tnv.hoTen && tnv.hoTen.toLowerCase().includes(keyword)) ||
      (tnv.email && tnv.email.toLowerCase().includes(keyword)) ||
      (tnv.diaChi && tnv.diaChi.toLowerCase().includes(keyword))
    );
  }

  suaTNV(tnv: TinhNguyenVien) {
    // Load đầy đủ thông tin TNV từ API
    this.tnvService.getVolunteerById(tnv.maTNV).subscribe({
      next: (response: any) => {
        const fullTNV = response.data || response || tnv;
        this.tnvmoi = { ...fullTNV };
        this.dangSua = true;
        this.dangThem = false;
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
        
        // Load preview avatar nếu có
        if (fullTNV.anhDaiDien) {
          // Preview sẽ được hiển thị tự động qua binding
        }
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết TNV:', error);
        // Fallback: dùng dữ liệu hiện có
        this.tnvmoi = { ...tnv };
        this.dangSua = true;
        this.dangThem = false;
        
        // Trigger change detection
        this.cdr.detectChanges();
      }
    });
  }

  xoaTNV(tnv: TinhNguyenVien) {
    if (confirm(`Bạn có chắc muốn xóa tình nguyện viên "${tnv.hoTen}"?`)) {
      // Thử gọi API xóa
      // this.tnvService.deleteVolunteer(tnv.maTNV).subscribe(...);

      // Trong trường hợp chưa có API xóa, chỉ xóa khỏi mảng local
      this.danhSachTNV = this.danhSachTNV.filter(t => t.maTNV !== tnv.maTNV);
      this.timKiem();
    }
  }

  luuTNV() {
    if (!this.tnvmoi.hoTen || !this.tnvmoi.email) {
      alert('Vui lòng nhập đầy đủ họ tên và email.');
      return;
    }

    if (this.dangSua) {
      this.tnvService.updateVolunteer(this.tnvmoi.maTNV, this.tnvmoi).subscribe({
        next: (response) => {
          console.log('Cập nhật TNV thành công:', response);
          const index = this.danhSachTNV.findIndex(t => t.maTNV === this.tnvmoi.maTNV);
          if (index !== -1) {
            this.danhSachTNV[index] = { ...this.tnvmoi };
          }
          this.dangSua = false;
          this.dangThem = false;
          this.tnvmoi = this.khoiTaoTNV();
          this.timKiem();
          this.calculateStatistics();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi cập nhật TNV:', error);
          alert('Không thể cập nhật tình nguyện viên. Vui lòng thử lại sau.');
        }
      });
    } else {
      // Thêm mới TNV (không có trong requirement, giữ nguyên xử lý local)
      this.tnvmoi.maTNV = this.danhSachTNV.length + 1;
      this.danhSachTNV.push({ ...this.tnvmoi });
      this.dangThem = false;
      this.tnvmoi = this.khoiTaoTNV();
      this.timKiem();
      this.calculateStatistics();
    }
  }

  huyChinhSua() {
    this.dangSua = false;
    this.dangThem = false;
    this.tnvmoi = this.khoiTaoTNV();
  }
  
  batDauThemMoi() {
    this.dangThem = true;
    this.dangSua = false;
    this.tnvmoi = this.khoiTaoTNV();
  }

  taiLaiDuLieu() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.tnvService.getAllVolunteers().subscribe({
      next: (response: any) => {
        console.log('API response:', response);
        
        // Xử lý cấu trúc dữ liệu khác nhau
        if (response && response.data && Array.isArray(response.data)) {
          this.danhSachTNV = response.data;
        } else if (Array.isArray(response)) {
          this.danhSachTNV = response;
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          // Sử dụng dữ liệu mẫu
          this.danhSachTNV = this.getMockData();
        }
        
        this.danhSachHienThi = [...this.danhSachTNV];
        this.tuKhoaTimKiem = '';
        this.calculateStatistics();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách tình nguyện viên:', error);
        this.errorMessage = 'Không thể tải danh sách tình nguyện viên. Vui lòng thử lại sau.';
        // Sử dụng dữ liệu mẫu
        this.danhSachTNV = this.getMockData();
        this.danhSachHienThi = [...this.danhSachTNV];
        this.calculateStatistics();
        this.isLoading = false;
      }
    });
  }

  xemChiTietTNV(tnv: TinhNguyenVien): void {
    // Lấy chi tiết từ API - endpoint đúng là /tinhnguyenvien/{maTNV}
    this.tnvService.getVolunteerById(tnv.maTNV).subscribe({
      next: (res: any) => {
        this.tnvdangxem = res?.data || res;
        
        // Nếu response đã có skills và fields, dùng luôn
        if (this.tnvdangxem.kyNangs && Array.isArray(this.tnvdangxem.kyNangs) && this.tnvdangxem.kyNangs.length > 0) {
          this.tnvdangxemSkills = this.tnvdangxem.kyNangs;
        } else {
          this.tnvdangxemSkills = [];
        }
        
        if (this.tnvdangxem.linhVucs && Array.isArray(this.tnvdangxem.linhVucs) && this.tnvdangxem.linhVucs.length > 0) {
          this.tnvdangxemFields = this.tnvdangxem.linhVucs;
        } else {
          this.tnvdangxemFields = [];
        }
        
        // Chỉ gọi API nếu không có skills hoặc fields trong response
        if ((!this.tnvdangxemSkills || this.tnvdangxemSkills.length === 0) || 
            (!this.tnvdangxemFields || this.tnvdangxemFields.length === 0)) {
          this.taiSkillsFields(tnv.maTNV);
        }
        
        this.taiLichSuSuKien(tnv.maTNV);
        // Lấy đánh giá gần nhất theo MaTaiKhoan (nếu có)
        const maUser = this.tnvdangxem?.maTaiKhoan || tnv.maTaiKhoan;
        if (maUser) {
          this.taiDanhGiaGanNhat(maUser as number);
        } else {
          this.tnvdangxemLatestReview = null;
        }
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      },
      error: () => {
        this.tnvdangxem = tnv;
        this.taiSkillsFields(tnv.maTNV);
        this.taiLichSuSuKien(tnv.maTNV);
        const maUser = tnv.maTaiKhoan;
        if (maUser) this.taiDanhGiaGanNhat(maUser);
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      }
    });
  }

  dongChiTietTNV(): void {
    this.tnvdangxem = null;
    this.tnvdangxemSkills = [];
    this.tnvdangxemFields = [];
    this.tnvdangxemHistory = [];
  }

  private taiSkillsFields(maTNV: number): void {
    // Sử dụng endpoint đúng: /tinhnguyenvien/{maTNV}/skill-fields
    this.http.get<any>(`${environment.apiUrl}/tinhnguyenvien/${maTNV}/skill-fields`).subscribe({
      next: (res) => {
        const data = res?.data || res || {};
        this.tnvdangxemSkills = data.skills || [];
        this.tnvdangxemFields = data.fields || [];
      },
      error: () => {
        this.tnvdangxemSkills = [];
        this.tnvdangxemFields = [];
      }
    });
  }

  private taiLichSuSuKien(maTNV: number): void {
    this.http.get<any>(`${environment.apiUrl}/dondangky/history/${maTNV}`).subscribe({
      next: (res) => { this.tnvdangxemHistory = res?.data || res || []; },
      error: () => { this.tnvdangxemHistory = []; }
    });
  }

  private taiDanhGiaGanNhat(maUser: number): void {
    this.http.get<any>(`${environment.apiUrl}/danhgia/user/${maUser}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
    }).subscribe({
      next: (res) => {
        const list = res?.data || res || [];
        this.tnvdangxemLatestReview = list && list.length ? list[0] : null;
      },
      error: () => { this.tnvdangxemLatestReview = null; }
    });
  }
  
  getVolunteerSkills(maTNV: number): any[] {
    // Find volunteer by ID
    const volunteer = this.danhSachTNV.find(v => v.maTNV === maTNV);
    if (!volunteer || !volunteer.kyNangIds || volunteer.kyNangIds.length === 0) {
      return [];
    }
    
    // Map skill IDs to skill names
    return volunteer.kyNangIds
      .map((id: number) => this.allSkills.find(s => s.maKyNang === id))
      .filter((skill: any) => skill != null);
  }

  getVolunteerFields(maTNV: number): any[] {
    // Find volunteer by ID
    const volunteer = this.danhSachTNV.find(v => v.maTNV === maTNV);
    if (!volunteer || !volunteer.linhVucIds || volunteer.linhVucIds.length === 0) {
      return [];
    }
    
    // Map field IDs to field names
    return volunteer.linhVucIds
      .map((id: number) => this.allFields.find(f => f.maLinhVuc === id))
      .filter((field: any) => field != null);
  }
  
  calculateStatistics(): void {
    this.tongSoTNV = this.danhSachTNV.length;
    // Tính số TNV đang hoạt động (có điểm đánh giá > 0 hoặc đã tham gia sự kiện)
    this.tnvHoatDong = this.danhSachTNV.filter(tnv => 
      (tnv.diemTrungBinh && tnv.diemTrungBinh > 0) || tnv.anhDaiDien
    ).length;
    // Tính điểm trung bình
    const totalRating = this.danhSachTNV
      .filter(tnv => tnv.diemTrungBinh && tnv.diemTrungBinh > 0)
      .reduce((sum, tnv) => sum + (tnv.diemTrungBinh || 0), 0);
    const countWithRating = this.danhSachTNV.filter(tnv => tnv.diemTrungBinh && tnv.diemTrungBinh > 0).length;
    this.diemTrungBinh = countWithRating > 0 ? (totalRating / countWithRating).toFixed(1) : '0.0';
  }

  getMockData(): TinhNguyenVien[] {
    return [
      {
        maTNV: 1,
        hoTen: 'Nguyễn Văn A',
        email: 'a@gmail.com',
        gioiTinh: 'Nam',
        ngaySinh: '2000-01-01',
        cccd: '123456789',
        diaChi: 'Hà Nội',
        gioiThieu: 'Tình nguyện viên năng động',
        anhDaiDien: 'assets/default-avatar.png',
        diemTrungBinh: 4.8
      },
      {
        maTNV: 2,
        hoTen: 'Trần Thị B',
        email: 'b@gmail.com',
        gioiTinh: 'Nữ',
        ngaySinh: '2001-05-12',
        cccd: '987654321',
        diaChi: 'Đà Nẵng',
        gioiThieu: 'Thích tham gia các hoạt động xã hội',
        anhDaiDien: 'assets/default-avatar.png',
        diemTrungBinh: 4.5
      }
    ];
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrlUtil(path);
  }
}