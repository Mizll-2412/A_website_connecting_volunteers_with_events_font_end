import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuKien, TrangThaiSuKien } from '../../../models/event';
import { EventService } from '../../../services/event';
import { SkillService } from '../../../services/skill';
import { FieldService } from '../../../services/field';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';

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

  constructor(
    private eventService: EventService,
    private skillService: SkillService,
    private fieldService: FieldService,
    private http: HttpClient
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
    this.http.get<any>('http://localhost:5000/api/organization').subscribe({
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
    // Navigate to event detail page or show modal
    console.log('Xem chi tiết sự kiện:', suKien);
    // You can implement a detail modal or navigation here
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
    this.suKienMoi = { ...suKien };
    this.dangThemMoi = true;
    this.suKienDangChinhSua = suKien;
    this.selectedFile = null;
    this.previewUrl = null;
    
    // Load selected skills and fields for this event
    // Note: You may need to fetch these from the API if they're not in the event object
    if (suKien.linhVucIds) {
      this.selectedLinhVucs = [...suKien.linhVucIds];
    } else {
      this.selectedLinhVucs = [];
    }
    if (suKien.kyNangIds) {
      this.selectedKyNangs = [...suKien.kyNangIds];
    } else {
      this.selectedKyNangs = [];
    }
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
}