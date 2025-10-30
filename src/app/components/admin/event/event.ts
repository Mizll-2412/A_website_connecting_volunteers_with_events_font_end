import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuKien, TrangThaiSuKien } from '../../../models/event';
import { EventService } from '../../../services/event';
import { HttpErrorResponse } from '@angular/common/http';

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

  constructor(private eventService: EventService) {}

  ngOnInit() {
    this.taiLaiDuLieu();
  }

  private khoiTaoSuKienRong(): SuKien {
    return {
      maSuKien: 0,
      maToChuc: 0,
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
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách sự kiện:', error);
        this.errorMessage = 'Không thể tải danh sách sự kiện. Vui lòng thử lại sau.';
        // Sử dụng dữ liệu mẫu
        this.danhSachSuKien = this.getMockData();
        this.danhSachHienThi = [...this.danhSachSuKien];
        this.isLoading = false;
      }
    });
  }

  batDauThemMoi() {
    this.suKienMoi = this.khoiTaoSuKienRong();
    this.dangThemMoi = true;
    this.suKienDangChinhSua = null;
  }

  luuSuKien() {
    if (!this.suKienMoi.tenSuKien?.trim() || !this.suKienMoi.noiDung?.trim()) {
      alert('Vui lòng nhập đầy đủ tên sự kiện và nội dung!');
      return;
    }

    if (this.suKienMoi.maSuKien === 0) {
      // Thêm mới sự kiện
      this.eventService.createSuKien(this.suKienMoi).subscribe({
        next: (response) => {
          console.log('Thêm sự kiện thành công:', response);
          // Tải lại dữ liệu
          this.taiLaiDuLieu();
          this.dangThemMoi = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi thêm sự kiện:', error);
          alert('Không thể thêm sự kiện. Vui lòng thử lại sau.');
          
          // Fallback: Thêm vào mảng local
          this.suKienMoi.maSuKien = Math.max(...this.danhSachSuKien.map(s => s.maSuKien || 0), 0) + 1;
          this.suKienMoi.ngayTao = new Date();
          this.danhSachSuKien.push({ ...this.suKienMoi });
          this.danhSachHienThi = [...this.danhSachSuKien];
          this.dangThemMoi = false;
        }
      });
    } else {
      // Cập nhật sự kiện
      this.eventService.updateSuKien(this.suKienMoi.maSuKien, this.suKienMoi).subscribe({
        next: (response) => {
          console.log('Cập nhật sự kiện thành công:', response);
          // Tải lại dữ liệu
          this.taiLaiDuLieu();
          this.dangThemMoi = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi cập nhật sự kiện:', error);
          alert('Không thể cập nhật sự kiện. Vui lòng thử lại sau.');
          
          // Fallback: Cập nhật trong mảng local
          const index = this.danhSachSuKien.findIndex(s => s.maSuKien === this.suKienMoi.maSuKien);
          if (index !== -1) this.danhSachSuKien[index] = { ...this.suKienMoi };
          this.danhSachHienThi = [...this.danhSachSuKien];
          this.dangThemMoi = false;
        }
      });
    }
  }

  suaSuKien(suKien: SuKien) {
    this.suKienMoi = { ...suKien };
    this.dangThemMoi = true;
    this.suKienDangChinhSua = suKien;
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