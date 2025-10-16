import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuKien, TrangThaiSuKien } from '../../../models/event';

@Component({
  selector: 'app-su-kien',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event.html',
  styleUrls: ['./event.css']
})
export class SuKienComponent {
  tuKhoaTimKiem: string = '';
  dangThemMoi: boolean = false;
  suKienDangChinhSua: SuKien | null = null;

  danhSachSuKien: SuKien[] = [
    {
      maSuKien: 1,
      maToChuc: 101,
      tenSuKien: 'Chiến dịch Mùa Hè Xanh',
      noiDung: 'Tình nguyện hỗ trợ giáo dục và môi trường.',
      soLuong: 50,
      diaChi: 'Bến Tre',
      ngayBatDau: new Date('2025-07-01'),
      ngayKetThuc: new Date('2025-07-15'),
      ngayTao: new Date('2025-06-01'),
      tuyenBatDau: new Date('2025-06-01'),
      tuyenKetThuc: new Date('2025-06-20'),
      trangThai: TrangThaiSuKien.DangTuyen,
      hinhAnh: 'public/tinhnguyen2.jpg'
    }
  ];

  danhSachHienThi = [...this.danhSachSuKien];

  suKienMoi: SuKien = this.khoiTaoSuKienRong();

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
      sk.tenSuKien.toLowerCase().includes(keyword) ||
      sk.noiDung.toLowerCase().includes(keyword) ||
      (sk.diaChi?.toLowerCase().includes(keyword) ?? false)
    );
  }

  taiLaiDuLieu() {
    this.tuKhoaTimKiem = '';
    this.danhSachHienThi = [...this.danhSachSuKien];
  }

  batDauThemMoi() {
    this.suKienMoi = this.khoiTaoSuKienRong();
    this.dangThemMoi = true;
    this.suKienDangChinhSua = null;
  }

  luuSuKien() {
    if (!this.suKienMoi.tenSuKien.trim() || !this.suKienMoi.noiDung.trim()) {
      alert('Vui lòng nhập đầy đủ tên sự kiện và nội dung!');
      return;
    }

    if (this.suKienMoi.maSuKien === 0) {
      this.suKienMoi.maSuKien = Math.max(...this.danhSachSuKien.map(s => s.maSuKien), 0) + 1;
      this.suKienMoi.ngayTao = new Date();
      this.danhSachSuKien.push({ ...this.suKienMoi });
    } else {
      const index = this.danhSachSuKien.findIndex(s => s.maSuKien === this.suKienMoi.maSuKien);
      if (index !== -1) this.danhSachSuKien[index] = { ...this.suKienMoi };
    }

    this.taiLaiDuLieu();
    this.dangThemMoi = false;
  }

  suaSuKien(suKien: SuKien) {
    this.suKienMoi = { ...suKien };
    this.dangThemMoi = true;
    this.suKienDangChinhSua = suKien;
  }

  xoaSuKien(suKien: SuKien) {
    if (confirm(`Bạn có chắc muốn xóa sự kiện "${suKien.tenSuKien}"?`)) {
      this.danhSachSuKien = this.danhSachSuKien.filter(s => s.maSuKien !== suKien.maSuKien);
      this.taiLaiDuLieu();
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
}
