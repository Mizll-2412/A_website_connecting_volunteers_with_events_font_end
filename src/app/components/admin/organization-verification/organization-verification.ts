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
    // Load chi tiết đầy đủ từ API
    this.adminService.getOrganizationDetails(org.maToChuc).subscribe({
      next: (response) => {
        this.selectedOrganization = response.data || response;
        
        // Load legal documents
        this.adminService.getLegalDocuments(org.maToChuc).subscribe({
          next: (docsResponse: any) => {
            this.selectedOrganization.giayToPhapLys = docsResponse.data || docsResponse || [];
            this.orgDetailsModal.show();
          },
          error: (error: any) => {
            console.error('Lỗi khi tải giấy tờ pháp lý:', error);
            this.selectedOrganization.giayToPhapLys = [];
        this.orgDetailsModal.show();
          }
        });
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết tổ chức:', error);
        // Fallback: dùng dữ liệu hiện có
        this.selectedOrganization = org;
        this.selectedOrganization.giayToPhapLys = [];
        this.orgDetailsModal.show();
      }
    });
  }

  // Preview giấy tờ pháp lý
  previewDocument(doc: any): void {
    if (doc.duongDan || doc.file) {
      const filePath = doc.duongDan || doc.file;
      const fileUrl = `http://localhost:5000${filePath}`;
      
      // Kiểm tra loại file
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        // Mở PDF trong tab mới
        window.open(fileUrl, '_blank');
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
        // Hiển thị ảnh trong modal
        const modalEl = document.getElementById('documentPreviewModal');
        if (modalEl) {
          const imgEl = modalEl.querySelector('#previewImage') as HTMLImageElement;
          if (imgEl) {
            imgEl.src = fileUrl;
          }
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      } else {
        // Tải file về
        window.open(fileUrl, '_blank');
      }
    }
  }

  // Tải về giấy tờ
  downloadDocument(doc: any): void {
    if (doc.duongDan || doc.file) {
      const filePath = doc.duongDan || doc.file;
      const link = document.createElement('a');
      link.href = `http://localhost:5000${filePath}`;
      link.download = doc.tenGiayTo || 'giay-to-phap-ly';
      link.click();
    }
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