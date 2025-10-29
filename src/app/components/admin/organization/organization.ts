import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToChucService } from '../../../services/organization';

enum TrangThaiXacMinh {
  ChoDuyet = 0,
  DaDuyet = 1,
  TuChoi = 2
}

@Component({
  selector: 'app-to-chuc',
  imports: [CommonModule, FormsModule],
  templateUrl: './organization.html',
  styleUrls: ['./organization.css'],
  standalone: true
})
export class ToChucComponent implements OnInit {
  TrangThaiXacMinh = TrangThaiXacMinh;
  danhSachHienThi: any[] = [];
  danhSachToChuc: any[] = [];
  tuKhoaTimKiem: string = '';
  hoSoDangXem: any = null;
  toChucDangSua: any = null;
  isThemMoi: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private toChucService: ToChucService) {}

  ngOnInit() {
    this.taiLaiDuLieu();
  }

  taiLaiDuLieu() {
    this.isLoading = true;
    this.errorMessage = '';

    this.toChucService.getAllOrganizations().subscribe(
      (response: any) => {
        console.log('API response:', response);
        
        // Kiểm tra cấu trúc dữ liệu và trích xuất mảng tổ chức
        if (response && response.data && Array.isArray(response.data)) {
          this.danhSachToChuc = response.data;
        } else if (response && response.success && response.data && Array.isArray(response.data)) {
          // Format API mới
          this.danhSachToChuc = response.data;
        } else if (Array.isArray(response)) {
          this.danhSachToChuc = response;
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          this.errorMessage = 'Định dạng dữ liệu không đúng.';
          // Fallback to mockdata
          this.danhSachToChuc = this.getMockData();
        }
        
        this.danhSachHienThi = this.danhSachToChuc;
        this.isLoading = false;
      },
      (error) => {
        console.error('Lỗi khi lấy danh sách tổ chức:', error);
        this.errorMessage = 'Không thể tải danh sách tổ chức. Vui lòng thử lại sau.';
        this.isLoading = false;
        
        // Sử dụng dữ liệu mẫu nếu API lỗi
        this.danhSachToChuc = this.getMockData();
        this.danhSachHienThi = this.danhSachToChuc;
      }
    );
  }

  getMockData() {
    return [
      { 
        maToChuc: 1, 
        maTaiKhoan: 101,
        tenToChuc: 'Green Future', 
        email: 'green@org.com', 
        soDienThoai: '0912345678',
        diaChi: 'Hà Nội', 
        ngayTao: '2024-05-20', 
        gioiThieu: 'Tổ chức bảo vệ môi trường',
        trangThaiXacMinh: TrangThaiXacMinh.ChoDuyet,
        suKiens: [
          { maSuKien: 1, tenSuKien: 'Dọn rác bãi biển', ngayBatDau: '2025-06-15', trangThai: 'Đang tuyển' }
        ]
      },
      { 
        maToChuc: 2, 
        maTaiKhoan: 102,
        tenToChuc: 'Hope Foundation', 
        email: 'hope@org.com', 
        soDienThoai: '0987654321',
        diaChi: 'Đà Nẵng', 
        ngayTao: '2024-04-10', 
        gioiThieu: 'Quỹ từ thiện giúp đỡ trẻ em nghèo',
        trangThaiXacMinh: TrangThaiXacMinh.DaDuyet,
        suKiens: [
          { maSuKien: 2, tenSuKien: 'Quyên góp sách vở', ngayBatDau: '2025-07-01', trangThai: 'Đang tuyển' },
          { maSuKien: 3, tenSuKien: 'Xây trường học', ngayBatDau: '2025-05-20', trangThai: 'Đang diễn ra' }
        ]
      },
      { 
        maToChuc: 3, 
        maTaiKhoan: 103,
        tenToChuc: 'Ánh Dương', 
        email: 'anhduong@org.com', 
        soDienThoai: '0923456789',
        diaChi: 'Hồ Chí Minh', 
        ngayTao: '2024-03-15', 
        gioiThieu: 'Hỗ trợ người già neo đơn',
        trangThaiXacMinh: TrangThaiXacMinh.TuChoi,
        lyDoTuChoi: 'Thông tin không đầy đủ, thiếu giấy phép hoạt động',
        suKiens: []
      }
    ];
  }

  timKiem() {
    const keyword = this.tuKhoaTimKiem.toLowerCase();
    this.danhSachHienThi = this.danhSachToChuc.filter(tc =>
      (tc.tenToChuc && tc.tenToChuc.toLowerCase().includes(keyword)) ||
      (tc.email && tc.email.toLowerCase().includes(keyword)) ||
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

  batDauThemMoi() {
    this.isThemMoi = true;
    this.toChucDangSua = {
      maToChuc: 0,
      maTaiKhoan: 0,
      tenToChuc: '',
      email: '',
      soDienThoai: '',
      diaChi: '',
      gioiThieu: '',
      trangThaiXacMinh: TrangThaiXacMinh.ChoDuyet,
      lyDoTuChoi: '',
      suKiens: []
    };
  }

  xemChiTiet(toChuc: any) {
    // Lấy thông tin chi tiết từ API
    this.toChucService.getOrganizationById(toChuc.maToChuc).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.hoSoDangXem = response.data;
        } else {
          this.hoSoDangXem = response;
        }
        
        // Nếu không có dữ liệu sự kiện, thêm mảng rỗng
        if (!this.hoSoDangXem.suKiens) {
          this.hoSoDangXem.suKiens = [];
        }
      },
      error: (error) => {
        console.error('Lỗi khi lấy chi tiết tổ chức:', error);
        // Sử dụng dữ liệu đã có
        this.hoSoDangXem = {...toChuc};
        if (!this.hoSoDangXem.suKiens) {
          this.hoSoDangXem.suKiens = [];
        }
      }
    });
  }

  suaToChuc(toChuc: any) {
    this.isThemMoi = false;
    this.toChucDangSua = {...toChuc};
    
    // Đóng modal xem chi tiết nếu đang mở
    this.hoSoDangXem = null;
  }

  luuToChuc() {
    if (this.isThemMoi) {
      // Thêm mới tổ chức
      this.toChucService.createOrganization(this.toChucDangSua).subscribe({
        next: (response: any) => {
          alert('Thêm tổ chức thành công!');
          this.taiLaiDuLieu();
          this.huyChinhSua();
        },
        error: (error) => {
          console.error('Lỗi khi thêm tổ chức:', error);
          alert('Không thể thêm tổ chức. Vui lòng thử lại sau.');
        }
      });
    } else {
      // Cập nhật tổ chức
      this.toChucService.updateOrganization(this.toChucDangSua.maToChuc, this.toChucDangSua).subscribe({
        next: (response: any) => {
          alert('Cập nhật tổ chức thành công!');
          
          // Cập nhật dữ liệu trong danh sách hiện tại
          const index = this.danhSachToChuc.findIndex(tc => tc.maToChuc === this.toChucDangSua.maToChuc);
          if (index !== -1) {
            this.danhSachToChuc[index] = {...this.toChucDangSua};
          }
          
          this.timKiem();
          this.huyChinhSua();
        },
        error: (error) => {
          console.error('Lỗi khi cập nhật tổ chức:', error);
          alert('Không thể cập nhật tổ chức. Vui lòng thử lại sau.');
        }
      });
    }
  }

  huyChinhSua() {
    this.toChucDangSua = null;
    this.isThemMoi = false;
  }

  dongModal() {
    this.hoSoDangXem = null;
  }

  duyetToChuc(toChuc: any) {
    this.toChucService.verifyOrganization(toChuc.maToChuc, true).subscribe({
      next: (response: any) => {
        toChuc.trangThaiXacMinh = TrangThaiXacMinh.DaDuyet;
        alert('Đã duyệt tổ chức thành công!');
      },
      error: (error: any) => {
        console.error('Lỗi khi duyệt tổ chức:', error);
        alert('Không thể duyệt tổ chức. Vui lòng thử lại sau.');
      }
    });
  }

  tuChoiToChuc(toChuc: any) {
    const lyDo = prompt('Nhập lý do từ chối:');
    if (lyDo === null) return; // Người dùng đã hủy
    
    this.toChucService.verifyOrganization(toChuc.maToChuc, false, lyDo).subscribe({
      next: (response: any) => {
        toChuc.trangThaiXacMinh = TrangThaiXacMinh.TuChoi;
        toChuc.lyDoTuChoi = lyDo;
        alert('Đã từ chối tổ chức thành công!');
      },
      error: (error: any) => {
        console.error('Lỗi khi từ chối tổ chức:', error);
        alert('Không thể từ chối tổ chức. Vui lòng thử lại sau.');
      }
    });
  }

  xoaToChuc(toChuc: any) {
    if (confirm('Bạn có chắc chắn muốn xóa tổ chức này?')) {
      this.toChucService.deleteOrganization(toChuc.maToChuc).subscribe({
        next: () => {
          this.danhSachToChuc = this.danhSachToChuc.filter(x => x.maToChuc !== toChuc.maToChuc);
          this.timKiem();
          alert('Đã xóa tổ chức thành công!');
        },
        error: (error) => {
          console.error('Lỗi khi xóa tổ chức:', error);
          alert('Không thể xóa tổ chức. Vui lòng thử lại sau.');
        }
      });
    }
  }
}