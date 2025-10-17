import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LocalDataService, Organization } from '../../services/local-data';

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
  localOrganizations: Organization[] = [];
  isLoggedIn = false;
  username = '';
  role = '';

  constructor(
    private router: Router, 
    private auth: AuthService,
    private localDataService: LocalDataService
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
    }
    
    // Lấy dữ liệu tổ chức từ LocalStorage
    this.loadOrganizationsFromLocalStorage();
    
    // Nếu không có dữ liệu trong localStorage, dùng dữ liệu mẫu
    if (this.danhSachToChuc.length === 0) {
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
  
  loadOrganizationsFromLocalStorage(): void {
    // Lấy danh sách tổ chức từ LocalStorage
    this.localOrganizations = this.localDataService.getOrganizations();
    
    if (this.localOrganizations && this.localOrganizations.length > 0) {
      // Chuyển đổi dữ liệu từ LocalStorage sang định dạng ToChuc
      this.danhSachToChuc = this.localOrganizations.map(org => {
        // Chuyển đổi trạng thái xác minh
        let trangThaiXacMinh: TrangThaiXacMinh;
        switch (org.verificationStatus) {
          case 'verified':
            trangThaiXacMinh = TrangThaiXacMinh.DaDuyet;
            break;
          case 'rejected':
            trangThaiXacMinh = TrangThaiXacMinh.TuChoi;
            break;
          default:
            trangThaiXacMinh = TrangThaiXacMinh.ChoDuyet;
            break;
        }
        
        return {
          maToChuc: org.id,
          maTaiKhoan: org.userId,
          tenToChuc: org.name,
          email: org.email,
          soDienThoai: org.phone,
          diaChi: org.address,
          ngayTao: new Date(), // Không có trường này trong LocalStorage
          gioiThieu: org.description,
          anhDaiDien: org.logoUrl || 'https://via.placeholder.com/100',
          trangThaiXacMinh: trangThaiXacMinh,
          lyDoTuChoi: org.rejectionReason,
          diemTrungBinh: org.rating
        };
      });
    }
  }
  
  viewOrganizationDetails(maToChuc: number): void {
    this.router.navigate(['/organization-detail', maToChuc]);
  }
}