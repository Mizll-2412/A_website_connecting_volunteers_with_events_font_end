import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var bootstrap: any;

@Component({
  selector: 'app-organization-verification',
  templateUrl: './organization-verification.html',
  styleUrls: ['./organization-verification.css'],
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class OrganizationVerification implements OnInit {
  organizations: any[] = [];
  filteredOrganizations: any[] = [];
  selectedOrganization: any = null;
  searchTerm: string = '';
  filterStatus: string = 'all';
  
  // Modal
  orgDetailsModal: any;

  constructor(
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.loadPendingOrganizations();
  }

  ngAfterViewInit(): void {
    this.orgDetailsModal = new bootstrap.Modal(document.getElementById('orgDetailsModal'));
  }

  loadPendingOrganizations(): void {
    this.adminService.getAllOrganizations().subscribe({
      next: (response) => {
        this.organizations = response.data || [];
        this.filteredOrganizations = [...this.organizations];
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách tổ chức:', error);
        this.showToast('Không thể tải danh sách tổ chức', 'Lỗi');
        // Dữ liệu mẫu nếu API lỗi
        this.organizations = [
          {
            maToChuc: 1,
            tenToChuc: 'Hội Chữ thập đỏ Việt Nam',
            email: 'chuthapdo@example.com',
            soDienThoai: '0123456789',
            diaChi: 'Hà Nội',
            ngayTao: new Date(2025, 9, 15),
            trangThaiXacMinh: 0
          },
          {
            maToChuc: 2,
            tenToChuc: 'Quỹ Bảo trợ trẻ em Việt Nam',
            email: 'baotrotreem@example.com',
            soDienThoai: '0987654321',
            diaChi: 'Hồ Chí Minh',
            ngayTao: new Date(2025, 9, 20),
            trangThaiXacMinh: 1
          },
          {
            maToChuc: 3,
            tenToChuc: 'Tổ chức Tình nguyện vì Môi trường',
            email: 'moitruong@example.com',
            soDienThoai: '0369852147',
            diaChi: 'Đà Nẵng',
            ngayTao: new Date(2025, 9, 25),
            trangThaiXacMinh: 2,
            lyDoTuChoi: 'Thông tin không đầy đủ'
          }
        ];
        this.filteredOrganizations = [...this.organizations];
      }
    });
  }

  filterOrganizations(): void {
    // Đầu tiên lọc theo trạng thái
    let statusFiltered = [...this.organizations];
    
    if (this.filterStatus !== 'all') {
      const statusValue = parseInt(this.filterStatus);
      statusFiltered = this.organizations.filter(org => 
        org.trangThaiXacMinh === statusValue
      );
    }
    
    // Sau đó lọc theo từ khóa tìm kiếm
    if (!this.searchTerm) {
      this.filteredOrganizations = statusFiltered;
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.filteredOrganizations = statusFiltered.filter(org => 
      (org.tenToChuc && org.tenToChuc.toLowerCase().includes(term)) || 
      org.email.toLowerCase().includes(term) ||
      (org.soDienThoai && org.soDienThoai.includes(term))
    );
  }
  
  // Phương thức đếm số lượng tổ chức theo trạng thái
  getPendingCount(): number {
    return this.organizations.filter(org => 
      org.trangThaiXacMinh === 0 || org.trangThaiXacMinh === null
    ).length;
  }
  
  getVerifiedCount(): number {
    return this.organizations.filter(org => org.trangThaiXacMinh === 1).length;
  }
  
  getRejectedCount(): number {
    return this.organizations.filter(org => org.trangThaiXacMinh === 2).length;
  }

  viewOrganizationDetails(org: any): void {
    this.selectedOrganization = org;
    this.orgDetailsModal.show();
  }

  verifyOrganization(org: any, isVerified: boolean): void {
    let lyDoTuChoi = '';
    
    if (!isVerified) {
      lyDoTuChoi = prompt('Nhập lý do từ chối xác minh:') || '';
      if (lyDoTuChoi === null) return; // Người dùng đã hủy
    }
    
    this.adminService.verifyOrganization(org.maToChuc, isVerified, lyDoTuChoi).subscribe({
      next: (response) => {
        org.trangThaiXacMinh = isVerified ? 1 : 2;
        if (!isVerified) {
          org.lyDoTuChoi = lyDoTuChoi;
        }
        
        this.showToast(
          isVerified ? 'Tổ chức đã được xác minh' : 'Tổ chức đã bị từ chối', 
          'Thành công'
        );
        
        if (this.orgDetailsModal) {
          this.orgDetailsModal.hide();
        }
      },
      error: (error) => {
        console.error('Lỗi khi xác minh tổ chức:', error);
        this.showToast('Không thể cập nhật trạng thái xác minh', 'Lỗi');
      }
    });
  }

  getVerificationStatus(status: number | null): string {
    if (status === null || status === 0) return 'Chờ xác minh';
    if (status === 1) return 'Đã xác minh';
    if (status === 2) return 'Đã từ chối';
    return 'Không xác định';
  }

  // Thay thế toastr bằng phương thức hiển thị thông báo đơn giản
  showToast(message: string, type: string): void {
    alert(`${type}: ${message}`);
  }
}