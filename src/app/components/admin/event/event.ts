import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuKien, TrangThaiSuKien } from '../../../models/event';
import { EventService } from '../../../services/event';
import { SkillService } from '../../../services/skill';
import { FieldService } from '../../../services/field';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { getImageUrl } from '../../../utils/image-url.util';

@Component({
  selector: 'app-su-kien',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event.html',
  styleUrls: ['./event.css']
})
export class SuKienComponent implements OnInit {
  tuKhoaTimKiem: string = '';
  dangThemMoi: boolean = false;
  suKienDangChinhSua: SuKien | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  danhSachSuKien: SuKien[] = [];
  danhSachHienThi: SuKien[] = [];
  suKienMoi: SuKien = this.khoiTaoSuKienRong();
  
  // Statistics
  tongSoSuKien: number = 0;
  suKienDangDienRa: number = 0;
  suKienSapDienRa: number = 0;
  
  // File upload
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  // Skills and Fields
  linhVucs: any[] = [];
  kyNangs: any[] = [];
  selectedLinhVucs: number[] = [];
  selectedKyNangs: number[] = [];
  
  // Organizations
  organizations: any[] = [];
  
  // Chi tiết sự kiện đang xem
  suKienDangXem: SuKien | null = null;
  suKienDangXemLinhVucs: any[] = [];
  suKienDangXemKyNangs: any[] = [];

  constructor(
    private eventService: EventService,
    private skillService: SkillService,
    private fieldService: FieldService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.taiLaiDuLieu();
    this.loadSkills();
    this.loadFields();
    this.loadOrganizations();
  }
  
  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.kyNangs = response.data || response || [];
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải kỹ năng:', err);
        this.kyNangs = [];
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.linhVucs = response.data || response || [];
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải lĩnh vực:', err);
        this.linhVucs = [];
      }
    });
  }
  
  isLinhVucSelected(maLinhVuc: number): boolean {
    return this.selectedLinhVucs.includes(maLinhVuc);
  }
  
  toggleLinhVuc(maLinhVuc: number): void {
    const index = this.selectedLinhVucs.indexOf(maLinhVuc);
    if (index > -1) {
      this.selectedLinhVucs.splice(index, 1);
    } else {
      this.selectedLinhVucs.push(maLinhVuc);
    }
  }
  
  isKyNangSelected(maKyNang: number): boolean {
    return this.selectedKyNangs.includes(maKyNang);
  }
  
  toggleKyNang(maKyNang: number): void {
    const index = this.selectedKyNangs.indexOf(maKyNang);
    if (index > -1) {
      this.selectedKyNangs.splice(index, 1);
    } else {
      this.selectedKyNangs.push(maKyNang);
    }
  }
  
  loadOrganizations(): void {
    this.http.get<any>(`${environment.apiUrl}/organization`).subscribe({
      next: (response) => {
        this.organizations = response.data || response || [];
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách tổ chức:', error);
        this.organizations = [];
      }
    });
  }
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  
  calculateStatistics(): void {
    this.tongSoSuKien = this.danhSachSuKien.length;
    const now = new Date();
    this.suKienDangDienRa = this.danhSachSuKien.filter(sk => {
      const start = sk.ngayBatDau ? new Date(sk.ngayBatDau) : null;
      const end = sk.ngayKetThuc ? new Date(sk.ngayKetThuc) : null;
      return start && end && start <= now && now <= end && sk.trangThai !== 'Hủy bỏ';
    }).length;
    this.suKienSapDienRa = this.danhSachSuKien.filter(sk => {
      const start = sk.ngayBatDau ? new Date(sk.ngayBatDau) : null;
      return start && start > now && sk.trangThai !== 'Hủy bỏ';
    }).length;
  }
  
  xemChiTiet(suKien: SuKien): void {
    // Load đầy đủ thông tin sự kiện từ API
    this.eventService.getSuKienById(suKien.maSuKien).subscribe({
      next: (response: any) => {
        const fullEvent = response.data || response || suKien;
        this.suKienDangXem = fullEvent;
        
        // Load lĩnh vực và kỹ năng
        if (fullEvent.linhVucIds && Array.isArray(fullEvent.linhVucIds)) {
          this.suKienDangXemLinhVucs = fullEvent.linhVucIds
            .map((id: number) => this.linhVucs.find(lv => lv.maLinhVuc === id))
            .filter((lv: any) => lv != null);
        } else {
          this.suKienDangXemLinhVucs = [];
        }
        
        if (fullEvent.kyNangIds && Array.isArray(fullEvent.kyNangIds)) {
          this.suKienDangXemKyNangs = fullEvent.kyNangIds
            .map((id: number) => this.kyNangs.find(kn => kn.maKyNang === id))
            .filter((kn: any) => kn != null);
        } else {
          this.suKienDangXemKyNangs = [];
        }
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết sự kiện:', error);
        // Fallback: dùng dữ liệu hiện có
        this.suKienDangXem = suKien;
        this.suKienDangXemLinhVucs = [];
        this.suKienDangXemKyNangs = [];
      }
    });
  }

  dongChiTietSuKien(): void {
    this.suKienDangXem = null;
    this.suKienDangXemLinhVucs = [];
    this.suKienDangXemKyNangs = [];
  }

  private khoiTaoSuKienRong(): SuKien {
    return {
      maSuKien: 0,
      maToChuc: -1,  // Default to Admin (System Admin)
      tenSuKien: '',
      noiDung: '',
      trangThai: TrangThaiSuKien.DangTuyen
    };
  }

  formatNgay(date?: Date): string {
    return date ? new Date(date).toLocaleDateString('vi-VN') : '';
  }

  // Format date for input type="date" (yyyy-MM-dd)
  formatDateForInput(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      // If it's already a string in yyyy-MM-dd format
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // If it's a Date object or ISO string
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  timKiem() {
    const keyword = this.tuKhoaTimKiem.toLowerCase();
    this.danhSachHienThi = this.danhSachSuKien.filter(sk =>
      (sk.tenSuKien && sk.tenSuKien.toLowerCase().includes(keyword)) ||
      (sk.noiDung && sk.noiDung.toLowerCase().includes(keyword)) ||
      (sk.diaChi && sk.diaChi.toLowerCase().includes(keyword))
    );
  }

  taiLaiDuLieu() {
    this.isLoading = true;
    this.errorMessage = '';
    this.tuKhoaTimKiem = '';
    
    this.eventService.getAllSuKien().subscribe({
      next: (response: any) => {
        console.log('API response:', response);
        
        // Xử lý cấu trúc dữ liệu khác nhau
        if (response && response.data && Array.isArray(response.data)) {
          this.danhSachSuKien = response.data;
        } else if (Array.isArray(response)) {
          this.danhSachSuKien = response;
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          // Sử dụng dữ liệu mẫu
          this.danhSachSuKien = this.getMockData();
        }
        
        this.danhSachHienThi = [...this.danhSachSuKien];
        this.calculateStatistics();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách sự kiện:', error);
        this.errorMessage = 'Không thể tải danh sách sự kiện. Vui lòng thử lại sau.';
        // Sử dụng dữ liệu mẫu
        this.danhSachSuKien = this.getMockData();
        this.danhSachHienThi = [...this.danhSachSuKien];
        this.calculateStatistics();
        this.isLoading = false;
      }
    });
  }

  batDauThemMoi() {
    this.suKienMoi = this.khoiTaoSuKienRong();
    this.dangThemMoi = true;
    this.suKienDangChinhSua = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [];
    this.selectedKyNangs = [];
  }

  luuSuKien() {
    if (!this.suKienMoi.tenSuKien?.trim() || !this.suKienMoi.noiDung?.trim()) {
      alert('Vui lòng nhập đầy đủ tên sự kiện và nội dung!');
      return;
    }

    // Prepare event data with skills and fields
    const eventData: any = {
      ...this.suKienMoi,
      linhVucIds: this.selectedLinhVucs,
      kyNangIds: this.selectedKyNangs,
      soLuong: this.suKienMoi.soLuong
    };

    // Use EventService which handles FormData internally
    if (this.suKienMoi.maSuKien === 0) {
      // Thêm mới sự kiện
      this.eventService.createSuKien(eventData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Thêm sự kiện thành công:', response);
          this.taiLaiDuLieu();
          this.dangThemMoi = false;
          this.selectedFile = null;
          this.previewUrl = null;
          this.selectedLinhVucs = [];
          this.selectedKyNangs = [];
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi thêm sự kiện:', error);
          alert('Không thể thêm sự kiện. Vui lòng thử lại sau.');
        }
      });
    } else {
      // Cập nhật sự kiện
      this.eventService.updateSuKien(this.suKienMoi.maSuKien, eventData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Cập nhật sự kiện thành công:', response);
          this.taiLaiDuLieu();
          this.dangThemMoi = false;
          this.selectedFile = null;
          this.previewUrl = null;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi cập nhật sự kiện:', error);
          alert('Không thể cập nhật sự kiện. Vui lòng thử lại sau.');
        }
      });
    }
  }

  suaSuKien(suKien: SuKien) {
    // Load đầy đủ thông tin sự kiện từ API nếu cần
    this.eventService.getSuKienById(suKien.maSuKien).subscribe({
      next: (response: any) => {
        const fullEvent = response.data || response || suKien;
        
        // Format dates for input type="date" (use 'as any' to allow string for form input)
        this.suKienMoi = {
          ...fullEvent,
          ngayBatDau: this.formatDateForInput(fullEvent.ngayBatDau) as any,
          ngayKetThuc: this.formatDateForInput(fullEvent.ngayKetThuc) as any,
          tuyenBatDau: this.formatDateForInput(fullEvent.tuyenBatDau) as any,
          tuyenKetThuc: this.formatDateForInput(fullEvent.tuyenKetThuc) as any,
          soLuong: fullEvent.soLuong || 0,
          trangThai: fullEvent.trangThai || 'Đang tuyển',
          maToChuc: fullEvent.maToChuc || -1
        } as SuKien;
        
        this.dangThemMoi = true;
        this.suKienDangChinhSua = fullEvent;
        
        // Load preview image nếu có
        if (fullEvent.hinhAnh) {
          this.previewUrl = this.getImageUrl(fullEvent.hinhAnh);
        } else {
          this.previewUrl = null;
        }
        this.selectedFile = null;
        
        // Load selected skills and fields
        if (fullEvent.linhVucIds && Array.isArray(fullEvent.linhVucIds)) {
          this.selectedLinhVucs = [...fullEvent.linhVucIds];
        } else if (fullEvent.linhVucs && Array.isArray(fullEvent.linhVucs)) {
          // Nếu API trả về array objects, extract IDs
          this.selectedLinhVucs = fullEvent.linhVucs.map((lv: any) => lv.maLinhVuc || lv.id);
        } else {
          this.selectedLinhVucs = [];
        }
        
        if (fullEvent.kyNangIds && Array.isArray(fullEvent.kyNangIds)) {
          this.selectedKyNangs = [...fullEvent.kyNangIds];
        } else if (fullEvent.kyNangs && Array.isArray(fullEvent.kyNangs)) {
          // Nếu API trả về array objects, extract IDs
          this.selectedKyNangs = fullEvent.kyNangs.map((kn: any) => kn.maKyNang || kn.id);
        } else {
          this.selectedKyNangs = [];
        }
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết sự kiện:', error);
        // Fallback: dùng dữ liệu hiện có
        // Format dates for input type="date" (use 'as any' to allow string for form input)
        this.suKienMoi = {
          ...suKien,
          ngayBatDau: this.formatDateForInput(suKien.ngayBatDau) as any,
          ngayKetThuc: this.formatDateForInput(suKien.ngayKetThuc) as any,
          tuyenBatDau: this.formatDateForInput(suKien.tuyenBatDau) as any,
          tuyenKetThuc: this.formatDateForInput(suKien.tuyenKetThuc) as any,
          soLuong: suKien.soLuong || 0,
          trangThai: suKien.trangThai || 'Đang tuyển',
          maToChuc: suKien.maToChuc || -1
        } as SuKien;
        
        this.dangThemMoi = true;
        this.suKienDangChinhSua = suKien;
        
        // Load preview image nếu có
        if (suKien.hinhAnh) {
          this.previewUrl = this.getImageUrl(suKien.hinhAnh);
        } else {
          this.previewUrl = null;
        }
        this.selectedFile = null;
        
        // Load selected skills and fields (SuKien interface only has linhVucIds and kyNangIds)
        if (suKien.linhVucIds && Array.isArray(suKien.linhVucIds)) {
          this.selectedLinhVucs = [...suKien.linhVucIds];
        } else {
          this.selectedLinhVucs = [];
        }
        if (suKien.kyNangIds && Array.isArray(suKien.kyNangIds)) {
          this.selectedKyNangs = [...suKien.kyNangIds];
        } else {
          this.selectedKyNangs = [];
        }
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      }
    });
  }

  xoaSuKien(suKien: SuKien) {
    if (confirm(`Bạn có chắc muốn xóa sự kiện "${suKien.tenSuKien}"?`)) {
      this.eventService.deleteSuKien(suKien.maSuKien).subscribe({
        next: (response) => {
          console.log('Xóa sự kiện thành công:', response);
          // Tải lại dữ liệu
          this.taiLaiDuLieu();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi xóa sự kiện:', error);
          alert('Không thể xóa sự kiện. Vui lòng thử lại sau.');
          
          // Fallback: Xóa khỏi mảng local
          this.danhSachSuKien = this.danhSachSuKien.filter(s => s.maSuKien !== suKien.maSuKien);
          this.danhSachHienThi = [...this.danhSachSuKien];
        }
      });
    }
  }

  huyBo() {
    this.dangThemMoi = false;
    this.suKienMoi = this.khoiTaoSuKienRong();
    this.suKienDangChinhSua = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [];
    this.selectedKyNangs = [];
  }

  layUrlAnhSuKien(anh?: string): string {
    if (!anh) return 'public/event-default.png';
    if (anh.startsWith('http')) return anh;
    return anh;
  }
  
  getMockData(): SuKien[] {
    return [
      {
        maSuKien: 1,
        maToChuc: 101,
        tenSuKien: 'Hỗ trợ khắc phục sau lũ',
        noiDung: 'Dưới ảnh hướng của cơn bão số 11, chúng tôi kêu gọi mọi người chung tay giúp đỡ đồng bào tại các tỉnh thành như Thái Nguyên, Bắc Ninh.',
        soLuong: 10,
        diaChi: 'Hà Nội',
        ngayBatDau: new Date('2025-10-16'),
        ngayKetThuc: new Date('2025-10-20'),
        ngayTao: new Date('2025-06-01'),
        tuyenBatDau: new Date('2025-06-01'),
        tuyenKetThuc: new Date('2025-06-20'),
        trangThai: TrangThaiSuKien.DangTuyen,
        hinhAnh: 'public/tinhnguyen2.jpg'
      }
    ];
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }
}