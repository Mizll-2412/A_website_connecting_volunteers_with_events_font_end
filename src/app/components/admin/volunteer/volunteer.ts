import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TinhNguyenVien } from '../../../models/volunteer';

// export interface TinhNguyenVien {
//   maTNV: number;
//   maTaiKhoan?: number;
//   hoTen: string;
//   ngaySinh?: string;
//   gioiTinh?: string;
//   email: string;
//   cccd?: string;
//   diaChi?: string;
//   gioiThieu?: string;
//   anhDaiDien?: string;
//   diemTrungBinh?: number;
//   linhVucIds?: number[];
//   kyNangIds?: number[];
// }

@Component({
  selector: 'app-tinh-nguyen-vien',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volunteer.html',
  styleUrls: ['./volunteer.css']
})
export class TinhNguyenVienComponent {
  TinhNguyenVien?: TinhNguyenVien;
  tuKhoaTimKiem: string = '';
  danhSachTNV: TinhNguyenVien[] = [
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

  danhSachHienThi: TinhNguyenVien[] = [...this.danhSachTNV];
  tnvmoi: TinhNguyenVien = this.khoiTaoTNV();
  dangSua: boolean = false;

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
      tnv.hoTen.toLowerCase().includes(keyword) ||
      tnv.email.toLowerCase().includes(keyword) ||
      (tnv.diaChi && tnv.diaChi.toLowerCase().includes(keyword))
    );
  }

  suaTNV(tnv: TinhNguyenVien) {
    this.tnvmoi = { ...tnv };
    this.dangSua = true;
  }

  xoaTNV(tnv: TinhNguyenVien) {
    if (confirm(`Bạn có chắc muốn xóa tình nguyện viên "${tnv.hoTen}"?`)) {
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
      const index = this.danhSachTNV.findIndex(t => t.maTNV === this.tnvmoi.maTNV);
      if (index !== -1) {
        this.danhSachTNV[index] = { ...this.tnvmoi };
      }
      this.dangSua = false;
    } else {
      this.tnvmoi.maTNV = this.danhSachTNV.length + 1;
      this.danhSachTNV.push({ ...this.tnvmoi });
    }

    this.tnvmoi = this.khoiTaoTNV();
    this.timKiem();
  }

  huyChinhSua() {
    this.dangSua = false;
    this.tnvmoi = this.khoiTaoTNV();
  }

  taiLaiDuLieu() {
    this.tuKhoaTimKiem = '';
    this.danhSachHienThi = [...this.danhSachTNV];
  }
}
