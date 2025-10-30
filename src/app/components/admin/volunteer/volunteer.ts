import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TinhNguyenVien } from '../../../models/volunteer';
import { TinhNguyenVienService } from '../../../services/volunteer';
import { HttpErrorResponse } from '@angular/common/http';

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
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private tnvService: TinhNguyenVienService) {}

  ngOnInit() {
    this.taiLaiDuLieu();
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
    this.tnvmoi = { ...tnv };
    this.dangSua = true;
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
          this.tnvmoi = this.khoiTaoTNV();
          this.timKiem();
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
      this.tnvmoi = this.khoiTaoTNV();
      this.timKiem();
    }
  }

  huyChinhSua() {
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
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách tình nguyện viên:', error);
        this.errorMessage = 'Không thể tải danh sách tình nguyện viên. Vui lòng thử lại sau.';
        // Sử dụng dữ liệu mẫu
        this.danhSachTNV = this.getMockData();
        this.danhSachHienThi = [...this.danhSachTNV];
        this.isLoading = false;
      }
    });
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
}