import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ToChucService } from '../../services/organization';
import { HttpErrorResponse } from '@angular/common/http';

export enum TrangThaiXacMinh {
  ChoDuyet = 0,
  DaDuyet = 1,
  TuChoi = 2
}

export interface ToChuc {
  maToChuc: number;
  maTaiKhoan: number;
  tenToChuc: string;
  email: string;
  soDienThoai?: string;
  diaChi?: string;
  ngayTao?: Date;
  gioiThieu?: string;
  anhDaiDien?: string;
  trangThaiXacMinh: TrangThaiXacMinh;
  lyDoTuChoi?: string;
  diemTrungBinh?: number;
}

@Component({
  selector: 'app-tochuc-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './organization.html',
  styleUrls: ['./organization.css']
})
export class ToChucListComponent implements OnInit {
  danhSachToChuc: ToChuc[] = [];
  user?: User;
  isLoggedIn = false;
  username = '';
  role = '';
  isLoading = false;
  errorMessage = '';
  
  constructor(
    private router: Router, 
    private auth: AuthService,
    private toChucService: ToChucService
  ) {}


  ngOnDestroy(): void {
  }
  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
    }
    
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
    } else {
      this.router.navigate(['/login']);
      return;
    }
    
    // Gọi API lấy danh sách tổ chức
    this.loadOrganizations();
  }
  
  loadOrganizations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.toChucService.getAllOrganizations().subscribe({
      next: (response: any) => {
        console.log('Dữ liệu tổ chức từ API:', response);
        
        // Xử lý dữ liệu trả về
        if (response && response.data && Array.isArray(response.data)) {
          this.danhSachToChuc = this.mapToChucData(response.data);
        } else if (Array.isArray(response)) {
          this.danhSachToChuc = this.mapToChucData(response);
        } else {
          this.errorMessage = 'Không thể đọc dữ liệu tổ chức';
          this.useMockData(); // Sử dụng dữ liệu mẫu nếu API trả về dữ liệu không đúng định dạng
        }
        
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách tổ chức:', err);
        this.errorMessage = 'Không thể tải danh sách tổ chức. Vui lòng thử lại sau.';
        this.useMockData(); // Sử dụng dữ liệu mẫu khi gặp lỗi
        this.isLoading = false;
      }
    });
  }
  
  mapToChucData(data: any[]): ToChuc[] {
    return data.map(item => ({
      maToChuc: item.maToChuc,
      maTaiKhoan: item.maTaiKhoan,
      tenToChuc: item.tenToChuc || 'Không có tên',
      email: item.email || '',
      soDienThoai: item.soDienThoai,
      diaChi: item.diaChi,
      ngayTao: item.ngayTao ? new Date(item.ngayTao) : undefined,
      gioiThieu: item.gioiThieu || 'Chưa có thông tin giới thiệu',
      anhDaiDien: item.anhDaiDien,
      trangThaiXacMinh: item.trangThaiXacMinh !== undefined ? item.trangThaiXacMinh : TrangThaiXacMinh.ChoDuyet,
      lyDoTuChoi: item.lyDoTuChoi,
      diemTrungBinh: item.diemTrungBinh
    }));
  }
  
  useMockData(): void {
    // Dữ liệu mẫu khi API gặp lỗi
    this.danhSachToChuc = [
      {
        maToChuc: 1,
        maTaiKhoan: 11,
        tenToChuc: 'Tổ chức Xanh Sạch',
        email: 'info@xanhsach.vn',
        soDienThoai: '0909123456',
        diaChi: 'Hà Nội',
        ngayTao: new Date('2024-02-15'),
        gioiThieu: 'Tổ chức bảo vệ môi trường, trồng cây xanh khắp Việt Nam.',
        anhDaiDien: 'https://via.placeholder.com/100',
        trangThaiXacMinh: TrangThaiXacMinh.DaDuyet,
        diemTrungBinh: 4.8
      },
      {
        maToChuc: 2,
        maTaiKhoan: 12,
        tenToChuc: 'Cộng đồng Nhân Ái',
        email: 'contact@nhanai.org',
        diaChi: 'TP. Hồ Chí Minh',
        ngayTao: new Date('2024-04-20'),
        gioiThieu: 'Hỗ trợ trẻ em có hoàn cảnh khó khăn.',
        anhDaiDien: 'https://via.placeholder.com/100',
        trangThaiXacMinh: TrangThaiXacMinh.ChoDuyet,
        diemTrungBinh: 4.3
      },
      {
        maToChuc: 3,
        maTaiKhoan: 13,
        tenToChuc: 'Hội Yêu Động Vật',
        email: 'hello@yeudongvat.vn',
        diaChi: 'Đà Nẵng',
        ngayTao: new Date('2024-06-10'),
        gioiThieu: 'Cứu trợ động vật bị bỏ rơi, tuyên truyền bảo vệ thú cưng.',
        anhDaiDien: 'https://via.placeholder.com/100',
        trangThaiXacMinh: TrangThaiXacMinh.TuChoi,
        lyDoTuChoi: 'Thiếu giấy tờ xác minh.',
        diemTrungBinh: 3.9
      }
    ];
  }

  getTrangThaiText(trangThai: TrangThaiXacMinh): string {
    switch (trangThai) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'Chờ duyệt';
      case TrangThaiXacMinh.DaDuyet:
        return 'Đã duyệt';
      case TrangThaiXacMinh.TuChoi:
        return 'Từ chối';
      default:
        return '';
    }
  }

  getTrangThaiClass(trangThai: TrangThaiXacMinh): string {
    switch (trangThai) {
      case TrangThaiXacMinh.ChoDuyet:
        return 'pending';
      case TrangThaiXacMinh.DaDuyet:
        return 'approved';
      case TrangThaiXacMinh.TuChoi:
        return 'rejected';
      default:
        return '';
    }
  }
}
