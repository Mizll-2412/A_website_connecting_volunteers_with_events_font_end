import { Component, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { AdminService } from '../../../services/admin';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getImageUrl } from '../../../utils/image-url.util';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';

declare var bootstrap: any;

@Component({
  selector: 'app-organization-verification',
  templateUrl: './organization-verification.html',
  styleUrls: ['./organization-verification.css'],
  imports: [CommonModule, FormsModule, PaginationComponent, TableComponent],
  standalone: true
})
export class OrganizationVerification implements OnInit, AfterViewInit {
  organizations: any[] = [];
  filteredOrganizations: any[] = [];
  paginatedOrganizations: any[] = [];
  selectedOrganization: any = null;
  searchTerm: string = '';
  filterStatus: string = 'all';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('tenToChucTemplate') tenToChucTemplate!: TemplateRef<any>;
  @ViewChild('soDienThoaiTemplate') soDienThoaiTemplate!: TemplateRef<any>;
  @ViewChild('ngayTaoTemplate') ngayTaoTemplate!: TemplateRef<any>;
  @ViewChild('trangThaiTemplate') trangThaiTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  
  // Modal
  orgDetailsModal: any;
  reasonModal: any;
  reasonText: string = '';
  reasonMode: 'reject' | 'revoke' | null = null;
  reasonTargetOrg: any = null;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.initializeTableColumns();
    this.loadPendingOrganizations();
  }

  initializeTableColumns(): void {
    this.tableColumns = [
      { key: 'maToChuc', title: 'ID', width: '80px', sortable: true, resizable: true },
      { key: 'tenToChuc', title: 'Tên tổ chức', sortable: true, resizable: true },
      { key: 'email', title: 'Email', sortable: true, resizable: true },
      { key: 'soDienThoai', title: 'Số điện thoại', width: '120px', resizable: true },
      { key: 'ngayTao', title: 'Ngày đăng ký', width: '150px', sortable: true, resizable: true },
      { key: 'trangThaiXacMinh', title: 'Trạng thái', width: '150px', resizable: true },
      { key: 'actions', title: 'Thao tác', width: '300px', align: 'center', resizable: true }
    ];
  }

  ngAfterViewInit(): void {
    // Gán template vào columns sau khi view được khởi tạo
    this.tableColumns[1].template = this.tenToChucTemplate;
    this.tableColumns[3].template = this.soDienThoaiTemplate;
    this.tableColumns[4].template = this.ngayTaoTemplate;
    this.tableColumns[5].template = this.trangThaiTemplate;
    this.tableColumns[6].template = this.actionsTemplate;
    
    // Khởi tạo modal
    this.orgDetailsModal = new bootstrap.Modal(document.getElementById('orgDetailsModal'));
    this.reasonModal = new bootstrap.Modal(document.getElementById('reasonModal'));
  }

  loadPendingOrganizations(): void {
    this.adminService.getAllOrganizations().subscribe({
      next: (response) => {
        this.organizations = response.data || [];
        this.filteredOrganizations = [...this.organizations];
      },
      error: (error) => {
        console.error('Lỗi khi lấy danh sách tổ chức:', error);
        this.toastService.error('Không thể tải danh sách tổ chức');
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
        this.updatePaginatedOrganizations();
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
    } else {
    const term = this.searchTerm.toLowerCase();
    this.filteredOrganizations = statusFiltered.filter(org => 
      (org.tenToChuc && org.tenToChuc.toLowerCase().includes(term)) || 
      org.email.toLowerCase().includes(term) ||
      (org.soDienThoai && org.soDienThoai.includes(term))
    );
    }
    
    this.currentPage = 1; // Reset về trang đầu khi filter
    this.updatePaginatedOrganizations();
  }

  get paginatedOrganizationsList(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredOrganizations.slice(startIndex, endIndex);
  }

  updatePaginatedOrganizations(): void {
    // Getter sẽ tự động tính toán
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
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

  getRevokedCount(): number {
    return this.organizations.filter(org => org.trangThaiXacMinh === 3).length;
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
      const fileUrl = getImageUrl(filePath);
      
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
      link.href = getImageUrl(filePath);
      link.download = doc.tenGiayTo || 'giay-to-phap-ly';
      link.click();
    }
  }

  verifyOrganization(org: any, action: 'approve' | 'reject'): void {
    if (action === 'reject') {
      this.reasonMode = 'reject';
      this.reasonTargetOrg = org;
      this.reasonText = '';
      if (this.orgDetailsModal) {
        this.orgDetailsModal.hide();
      }
      this.reasonModal.show();
      return;
    }
    
    this.adminService.verifyOrganization(org.maToChuc, 'approve').subscribe({
      next: (response) => {
        // Cập nhật trong danh sách gốc
        const idxAll = this.organizations.findIndex(o => o.maToChuc === org.maToChuc);
        if (idxAll !== -1) {
          this.organizations[idxAll] = { ...this.organizations[idxAll], trangThaiXacMinh: 1, lyDoTuChoi: null };
        }
        // Cập nhật trong danh sách đã lọc (đang hiển thị)
        const idxFiltered = this.filteredOrganizations.findIndex(o => o.maToChuc === org.maToChuc);
        if (idxFiltered !== -1) {
          this.filteredOrganizations[idxFiltered] = { ...this.filteredOrganizations[idxFiltered], trangThaiXacMinh: 1, lyDoTuChoi: null };
        }
        // Đồng bộ đối tượng đang chọn (nếu có)
        if (this.selectedOrganization && this.selectedOrganization.maToChuc === org.maToChuc) {
          this.selectedOrganization = { ...this.selectedOrganization, trangThaiXacMinh: 1, lyDoTuChoi: null };
        }
        
        this.toastService.success('Tổ chức đã được xác minh thành công');
        this.filterOrganizations(); // Reload để cập nhật danh sách
        
        if (this.orgDetailsModal) {
          this.orgDetailsModal.hide();
        }
      },
      error: (error) => {
        console.error('Lỗi khi xác minh tổ chức:', error);
        this.toastService.error('Không thể cập nhật trạng thái xác minh');
      }
    });
  }

  revokeVerification(org: any): void {
    // Mở modal nhập lý do thu hồi
    this.reasonMode = 'revoke';
    this.reasonTargetOrg = org;
    this.reasonText = '';
    // Đảm bảo modal lý do hiển thị trên cùng
    if (this.orgDetailsModal) {
      this.orgDetailsModal.hide();
    }
    this.reasonModal.show();
  }

  submitReason(): void {
    const text = (this.reasonText || '').trim();
    if (!text) {
      this.toastService.warning('Vui lòng nhập lý do');
      return;
    }
    if (!this.reasonTargetOrg || !this.reasonMode) {
      this.reasonModal.hide();
      return;
    }
    const applyPatchToLists = (orgId: number, patch: Partial<any>) => {
      // Cập nhật trong danh sách gốc
      const idxAll = this.organizations.findIndex(o => o.maToChuc === orgId);
      if (idxAll !== -1) {
        this.organizations[idxAll] = { ...this.organizations[idxAll], ...patch };
      }
      // Cập nhật trong danh sách đã lọc (đang hiển thị)
      const idxFiltered = this.filteredOrganizations.findIndex(o => o.maToChuc === orgId);
      if (idxFiltered !== -1) {
        this.filteredOrganizations[idxFiltered] = { ...this.filteredOrganizations[idxFiltered], ...patch };
      }
      // Đồng bộ đối tượng đang chọn (nếu có)
      if (this.selectedOrganization && this.selectedOrganization.maToChuc === orgId) {
        this.selectedOrganization = { ...this.selectedOrganization, ...patch };
      }
    };
    if (this.reasonMode === 'reject') {
      this.adminService.verifyOrganization(this.reasonTargetOrg.maToChuc, 'reject', text).subscribe({
        next: () => {
          applyPatchToLists(this.reasonTargetOrg.maToChuc, { trangThaiXacMinh: 2, lyDoTuChoi: text });
          this.toastService.success('Đã từ chối tổ chức');
          this.filterOrganizations();
          this.reasonModal.hide();
          if (this.orgDetailsModal) this.orgDetailsModal.hide();
        },
        error: (error) => {
          console.error('Lỗi khi từ chối tổ chức:', error);
          this.toastService.error('Không thể từ chối tổ chức');
        }
      });
    } else {
      // revoke
      this.adminService.verifyOrganization(this.reasonTargetOrg.maToChuc, 'revoke', text).subscribe({
        next: () => {
          applyPatchToLists(this.reasonTargetOrg.maToChuc, { trangThaiXacMinh: 3, lyDoTuChoi: text });
          this.toastService.success('Đã thu hồi xác minh tổ chức');
          this.filterOrganizations();
          this.reasonModal.hide();
          if (this.orgDetailsModal) this.orgDetailsModal.hide();
      },
      error: (error) => {
        console.error('Lỗi khi thu hồi xác minh:', error);
          this.toastService.error('Không thể thu hồi xác minh');
      }
    });
    }
  }

  getVerificationStatus(status: number | null): string {
    if (status === null) return 'Chưa xác minh';
    if (status === 0) return 'Chờ xác minh';
    if (status === 1) return 'Đã xác minh';
    if (status === 2) return 'Đã từ chối';
    if (status === 3) return 'Đã thu hồi';
    return 'Không xác định';
  }


  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }
}