import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

enum TrangThaiXacMinh {
  ChoDuyet = 0,
  DaDuyet = 1,
  TuChoi = 2
}

@Component({
  selector: 'app-to-chuc',
  imports: [CommonModule, FormsModule],
  templateUrl: './organization.html',
  styleUrls: ['./organization.css']
})
export class ToChucComponent implements OnInit {
  TrangThaiXacMinh = TrangThaiXacMinh;
  danhSachHienThi: any[] = [];
  danhSachToChuc: any[] = [];
  tuKhoaTimKiem: string = '';
  hoSoDangXem: any = null;

  ngOnInit() {
    this.taiLaiDuLieu();
  }

  taiLaiDuLieu() {
    // Giả lập dữ liệu
    this.danhSachToChuc = [
      { maToChuc: 1, tenToChuc: 'Green Future', email: 'green@org.com', diaChi: 'Hà Nội', ngayTao: '2024-05-20', trangThaiXacMinh: TrangThaiXacMinh.ChoDuyet },
      { maToChuc: 2, tenToChuc: 'Hope Foundation', email: 'hope@org.com', diaChi: 'Đà Nẵng', ngayTao: '2024-04-10', trangThaiXacMinh: TrangThaiXacMinh.DaDuyet }
    ];
    this.danhSachHienThi = this.danhSachToChuc;
  }

  timKiem() {
    const keyword = this.tuKhoaTimKiem.toLowerCase();
    this.danhSachHienThi = this.danhSachToChuc.filter(tc =>
      tc.tenToChuc.toLowerCase().includes(keyword) ||
      tc.email.toLowerCase().includes(keyword) ||
      (tc.diaChi && tc.diaChi.toLowerCase().includes(keyword))
    );
  }

  demToChuc(trangThai: TrangThaiXacMinh): number {
    return this.danhSachToChuc.filter(tc => tc.trangThaiXacMinh === trangThai).length;
  }

  formatNgayTao(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }

  getTrangThaiClass(trangThai: TrangThaiXacMinh): string {
    return {
      0: 'badge-pending',
      1: 'badge-success',
      2: 'badge-danger'
    }[trangThai]!;
  }

  getTrangThaiText(trangThai: TrangThaiXacMinh): string {
    return {
      0: 'Chờ duyệt',
      1: 'Đã duyệt',
      2: 'Từ chối'
    }[trangThai]!;
  }

  xemChiTiet(toChuc: any) {
    this.hoSoDangXem = toChuc;
  }

  dongModal() {
    this.hoSoDangXem = null;
  }

  duyetToChuc(toChuc: any) {
    toChuc.trangThaiXacMinh = TrangThaiXacMinh.DaDuyet;
  }

  tuChoiToChuc(toChuc: any) {
    toChuc.trangThaiXacMinh = TrangThaiXacMinh.TuChoi;
  }

  xoaToChuc(toChuc: any) {
    this.danhSachToChuc = this.danhSachToChuc.filter(x => x !== toChuc);
    this.timKiem();
  }
}
