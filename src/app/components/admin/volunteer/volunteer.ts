import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CertificateViewerModalComponent } from '../../certificate-viewer-modal/certificate-viewer-modal';
import { CertificateService } from '../../../services/certificate.service';
import { TinhNguyenVien } from '../../../models/volunteer';
import { TinhNguyenVienService } from '../../../services/volunteer';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { getImageUrl as getImageUrlUtil } from '../../../utils/image-url.util';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-tinh-nguyen-vien',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, CertificateViewerModalComponent, PaginationComponent, TableComponent],
  templateUrl: './volunteer.html',
  styleUrls: ['./volunteer.css']
})
export class TinhNguyenVienComponent implements OnInit, AfterViewInit {
  TinhNguyenVien?: TinhNguyenVien;
  tuKhoaTimKiem: string = '';
  danhSachTNV: TinhNguyenVien[] = [];
  danhSachHienThi: TinhNguyenVien[] = [];
  paginatedTNV: TinhNguyenVien[] = [];
  tnvmoi: TinhNguyenVien = this.khoiTaoTNV();
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('anhDaiDienTemplate') anhDaiDienTemplate!: TemplateRef<any>;
  @ViewChild('soDienThoaiTemplate') soDienThoaiTemplate!: TemplateRef<any>;
  @ViewChild('kyNangTemplate') kyNangTemplate!: TemplateRef<any>;
  @ViewChild('linhVucTemplate') linhVucTemplate!: TemplateRef<any>;
  @ViewChild('diemTrungBinhTemplate') diemTrungBinhTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  dangSua: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Statistics
  tongSoTNV: number = 0;
  tnvHoatDong: number = 0;
  diemTrungBinh: string = '0.0';
  // Chi tiết TNV
  tnvdangxem: any = null;
  tnvdangxemSkills: any[] = [];
  tnvdangxemFields: any[] = [];
  tnvdangxemHistory: any[] = [];
  tnvdangxemCertificates: any[] = [];
  tnvdangxemLatestReview: any = null;
  tnvdangxemRecentReviews: any[] = [];
  // Certificate viewer modal state
  showCertificateViewer = false;
  certificateIdToView: number | null = null;
  
  // Xác nhận xóa
  tnvCanXoa: TinhNguyenVien | null = null;
  isDeleting: boolean = false;
  
  // Cache for skills and fields
  volunteerSkillsCache: Map<number, any[]> = new Map();
  volunteerFieldsCache: Map<number, any[]> = new Map();
  
  // Master data for skills and fields
  allSkills: any[] = [];
  allFields: any[] = [];

  private pendingVolunteerId: number | null = null;

  constructor(
    private tnvService: TinhNguyenVienService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private certificateService: CertificateService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.initializeTableColumns();
    this.loadMasterData();
    this.route.queryParams.subscribe(params => {
      const idParam = params['id'];
      const parsedId = Number(idParam);
      if (idParam && !isNaN(parsedId)) {
        this.pendingVolunteerId = parsedId;
        this.tryOpenPendingVolunteer();
      }
    });
    this.taiLaiDuLieu();
  }

  initializeTableColumns(): void {
    this.tableColumns = [
      { key: 'anhDaiDien', title: 'Ảnh', width: '80px', resizable: true },
      { key: 'hoTen', title: 'Họ tên', sortable: true, resizable: true },
      { key: 'email', title: 'Email', sortable: true, resizable: true },
      { key: 'soDienThoai', title: 'Số điện thoại', width: '140px', resizable: true },
      { key: 'kyNang', title: 'Kỹ năng', width: '150px', resizable: true },
      { key: 'linhVuc', title: 'Lĩnh vực', width: '150px', resizable: true },
      { key: 'diemTrungBinh', title: 'Điểm đánh giá', width: '120px', sortable: true, resizable: true },
      { key: 'actions', title: 'Thao tác', width: '150px', align: 'center', resizable: true }
    ];
  }

  ngAfterViewInit(): void {
    // Gán template theo key để tránh phụ thuộc thứ tự cột
    this.tableColumns = this.tableColumns.map(column => {
      switch (column.key) {
        case 'anhDaiDien':
          return { ...column, template: this.anhDaiDienTemplate };
        case 'soDienThoai':
          return { ...column, template: this.soDienThoaiTemplate };
        case 'kyNang':
          return { ...column, template: this.kyNangTemplate };
        case 'linhVuc':
          return { ...column, template: this.linhVucTemplate };
        case 'diemTrungBinh':
          return { ...column, template: this.diemTrungBinhTemplate };
        case 'actions':
          return { ...column, template: this.actionsTemplate };
        default:
          return column;
      }
    });
  }
  
  loadMasterData(): void {
    // Load all skills
    this.http.get<any>(`${environment.apiUrl}/kynang`).subscribe({
      next: (response) => {
        this.allSkills = response.data || response || [];
      },
      error: (error) => {
        console.error('Lỗi khi tải kỹ năng:', error);
        this.allSkills = [];
      }
    });
    
    // Load all fields
    this.http.get<any>(`${environment.apiUrl}/linhvuc`).subscribe({
      next: (response) => {
        this.allFields = response.data || response || [];
      },
      error: (error) => {
        console.error('Lỗi khi tải lĩnh vực:', error);
        this.allFields = [];
      }
    });
  }

  khoiTaoTNV(): TinhNguyenVien {
    return {
      maTNV: 0,
      hoTen: '',
      email: '',
      gioiTinh: '',
      ngaySinh: '',
      cccd: '',
      soDienThoai: '',
      diaChi: '',
      gioiThieu: '',
      anhDaiDien: '',
      diemTrungBinh: 0,
      // Dùng để binding multi-select
      kyNangIds: [] as any,
      linhVucIds: [] as any
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
      (tnv.soDienThoai && tnv.soDienThoai.toLowerCase().includes(keyword)) ||
      (tnv.diaChi && tnv.diaChi.toLowerCase().includes(keyword))
    );
    this.currentPage = 1; // Reset về trang đầu khi tìm kiếm
    this.updatePaginatedTNV();
  }

  get paginatedTNVList(): TinhNguyenVien[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.danhSachHienThi.slice(startIndex, endIndex);
  }

  updatePaginatedTNV(): void {
    // Getter sẽ tự động tính toán
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
  }

  suaTNV(tnv: TinhNguyenVien) {
    // Load đầy đủ thông tin TNV từ API
    this.tnvService.getVolunteerById(tnv.maTNV).subscribe({
      next: (response: any) => {
        const fullTNV = response.data || response || tnv;
        const kyNangIdsFromObj = Array.isArray((fullTNV as any).kyNangIds)
          ? (fullTNV as any).kyNangIds
          : (Array.isArray((fullTNV as any).kyNangs) ? (fullTNV as any).kyNangs.map((x: any) => x.maKyNang || x.id) : []);
        const linhVucIdsFromObj = Array.isArray((fullTNV as any).linhVucIds)
          ? (fullTNV as any).linhVucIds
          : (Array.isArray((fullTNV as any).linhVucs) ? (fullTNV as any).linhVucs.map((x: any) => x.maLinhVuc || x.id) : []);
        this.tnvmoi = { ...fullTNV, kyNangIds: kyNangIdsFromObj, linhVucIds: linhVucIdsFromObj };
        this.dangSua = true;
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
        
        // Load preview avatar nếu có
        if (fullTNV.anhDaiDien) {
          // Preview sẽ được hiển thị tự động qua binding
        }
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết TNV:', error);
        // Fallback: dùng dữ liệu hiện có
        this.tnvmoi = { ...tnv };
        this.dangSua = true;
        
        // Trigger change detection
        this.cdr.detectChanges();
      }
    });
  }

  xoaTNV(tnv: TinhNguyenVien) {
    this.tnvCanXoa = tnv;
  }

  xacNhanXoaTNV() {
    if (!this.tnvCanXoa || this.isDeleting) return;
    
    const tnv = this.tnvCanXoa;
    this.isDeleting = true;
    console.log('Đang xóa tình nguyện viên:', tnv.maTNV);
    
    // Gọi API xóa
    this.tnvService.deleteVolunteer(tnv.maTNV).subscribe({
      next: (response) => {
        console.log('Xóa thành công:', response);
        this.toastService.success('Xóa tình nguyện viên thành công!');
        this.tnvCanXoa = null;
        this.isDeleting = false;
        this.taiLaiDuLieu();
      },
      error: (error: any) => {
        console.error('Lỗi khi xóa tình nguyện viên:', error);
        console.error('Status:', error.status);
        console.error('Error body:', error.error);
        
        // Lấy message từ error interceptor hoặc từ API
        let errorMessage = 'Không thể xóa tình nguyện viên. Vui lòng thử lại sau.';
        
        if (error.normalizedMessage) {
          errorMessage = error.normalizedMessage;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.Message) {
          errorMessage = error.error.Message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (error.status === 403) {
          errorMessage = 'Bạn không có quyền xóa tình nguyện viên.';
        } else if (error.status === 404) {
          errorMessage = 'Không tìm thấy tình nguyện viên cần xóa.';
        }
        
        this.toastService.error(errorMessage);
        this.isDeleting = false;
        // Không đóng modal nếu có lỗi để user có thể thử lại
      }
    });
  }

  huyXoaTNV() {
    if (this.isDeleting) return; // Không cho phép đóng modal khi đang xóa
    this.tnvCanXoa = null;
    this.isDeleting = false;
  }

  luuTNV() {
    if (!this.tnvmoi.hoTen || !this.tnvmoi.email) {
      this.toastService.warning('Vui lòng nhập đầy đủ họ tên và email.');
      return;
    }

    // Gửi dạng FormData để tương thích API (tránh 415)
    const formData = new FormData();
    formData.append('hoTen', this.tnvmoi.hoTen || '');
    formData.append('email', this.tnvmoi.email || '');
    if (this.tnvmoi.cccd !== undefined) formData.append('cccd', this.tnvmoi.cccd || '');
    if (this.tnvmoi.soDienThoai !== undefined) formData.append('soDienThoai', this.tnvmoi.soDienThoai || '');
    if (this.tnvmoi.gioiTinh !== undefined) formData.append('gioiTinh', this.tnvmoi.gioiTinh || '');
    if (this.tnvmoi.diaChi !== undefined) formData.append('diaChi', this.tnvmoi.diaChi || '');
    if (this.tnvmoi.gioiThieu !== undefined) formData.append('gioiThieu', this.tnvmoi.gioiThieu || '');
    if (this.tnvmoi.ngaySinh) {
      try {
        const d = new Date(this.tnvmoi.ngaySinh as any);
        if (!isNaN(d.getTime())) {
          // yyyy-MM-dd để backend bind tốt, hoặc ISO nếu backend yêu cầu
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          formData.append('ngaySinh', `${y}-${m}-${day}`);
        }
      } catch {}
    }

    // Mảng kỹ năng/lĩnh vực nếu có
    const kyNangIds = (this.tnvmoi as any).kyNangIds as number[] | undefined;
    if (kyNangIds && Array.isArray(kyNangIds)) {
      kyNangIds.forEach(id => formData.append('kyNangIds', String(id)));
    }
    const linhVucIds = (this.tnvmoi as any).linhVucIds as number[] | undefined;
    if (linhVucIds && Array.isArray(linhVucIds)) {
      linhVucIds.forEach(id => formData.append('linhVucIds', String(id)));
    }

    // Cập nhật TNV
    this.tnvService.updateVolunteerForm(this.tnvmoi.maTNV, formData).subscribe({
      next: (response) => {
        console.log('Cập nhật TNV thành công:', response);
        this.toastService.success('Cập nhật tình nguyện viên thành công!');
        const index = this.danhSachTNV.findIndex(t => t.maTNV === this.tnvmoi.maTNV);
        if (index !== -1) {
          this.danhSachTNV[index] = { ...this.tnvmoi };
        }
        this.dangSua = false;
        this.tnvmoi = this.khoiTaoTNV();
        this.timKiem();
        this.calculateStatistics();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi cập nhật TNV:', error);
        this.toastService.error('Không thể cập nhật tình nguyện viên. Vui lòng thử lại sau.');
      }
    });
  }

  // Helpers cho form chọn kỹ năng/lĩnh vực
  isSkillSelected(id: number): boolean {
    const ids = (this.tnvmoi as any).kyNangIds as number[] | undefined;
    return !!ids && ids.includes(id);
  }

  toggleSkill(id: number): void {
    let ids = (this.tnvmoi as any).kyNangIds as number[] | undefined;
    if (!ids) ids = (this.tnvmoi as any).kyNangIds = [];
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
  }

  isFieldSelected(id: number): boolean {
    const ids = (this.tnvmoi as any).linhVucIds as number[] | undefined;
    return !!ids && ids.includes(id);
  }

  toggleField(id: number): void {
    let ids = (this.tnvmoi as any).linhVucIds as number[] | undefined;
    if (!ids) ids = (this.tnvmoi as any).linhVucIds = [];
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
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
        this.calculateStatistics();
        this.currentPage = 1;
        this.updatePaginatedTNV();
        this.tryOpenPendingVolunteer();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách tình nguyện viên:', error);
        this.errorMessage = 'Không thể tải danh sách tình nguyện viên. Vui lòng thử lại sau.';
        // Sử dụng dữ liệu mẫu
        this.danhSachTNV = this.getMockData();
        this.danhSachHienThi = [...this.danhSachTNV];
        this.calculateStatistics();
        this.updatePaginatedTNV();
        this.isLoading = false;
      }
    });
  }

  xemChiTietTNV(tnv: TinhNguyenVien): void {
    // Lấy chi tiết từ API - endpoint đúng là /tinhnguyenvien/{maTNV}
    this.tnvService.getVolunteerById(tnv.maTNV).subscribe({
      next: (res: any) => {
        this.tnvdangxem = res?.data || res;
        
        // Nếu response đã có skills và fields, dùng luôn
        if (this.tnvdangxem.kyNangs && Array.isArray(this.tnvdangxem.kyNangs) && this.tnvdangxem.kyNangs.length > 0) {
          this.tnvdangxemSkills = this.tnvdangxem.kyNangs;
        } else {
          this.tnvdangxemSkills = [];
        }
        
        if (this.tnvdangxem.linhVucs && Array.isArray(this.tnvdangxem.linhVucs) && this.tnvdangxem.linhVucs.length > 0) {
          this.tnvdangxemFields = this.tnvdangxem.linhVucs;
        } else {
          this.tnvdangxemFields = [];
        }
        
        // Chỉ gọi API nếu không có skills hoặc fields trong response
        if ((!this.tnvdangxemSkills || this.tnvdangxemSkills.length === 0) || 
            (!this.tnvdangxemFields || this.tnvdangxemFields.length === 0)) {
          this.taiSkillsFields(tnv.maTNV);
        }
        
        this.taiLichSuSuKien(tnv.maTNV);
        this.loadVolunteerCertificates(tnv.maTNV);
        // Lấy đánh giá gần nhất theo MaTaiKhoan (nếu có)
        const maUser = this.tnvdangxem?.maTaiKhoan || tnv.maTaiKhoan;
        if (maUser) {
          this.taiDanhGiaGanNhat(maUser as number);
        } else {
          this.tnvdangxemLatestReview = null;
        }
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      },
      error: () => {
        this.tnvdangxem = tnv;
        this.taiSkillsFields(tnv.maTNV);
        this.taiLichSuSuKien(tnv.maTNV);
        this.loadVolunteerCertificates(tnv.maTNV);
        const maUser = tnv.maTaiKhoan;
        if (maUser) this.taiDanhGiaGanNhat(maUser);
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      }
    });
  }

  dongChiTietTNV(): void {
    this.tnvdangxem = null;
    this.tnvdangxemSkills = [];
    this.tnvdangxemFields = [];
    this.tnvdangxemHistory = [];
    this.tnvdangxemLatestReview = null;
  }

  private tryOpenPendingVolunteer(): void {
    if (!this.pendingVolunteerId) return;

    const existing = this.danhSachTNV.find(t => t.maTNV === this.pendingVolunteerId);
    if (existing) {
      this.xemChiTietTNV(existing);
      this.clearPendingVolunteerQuery();
      return;
    }

    // Nếu không tìm thấy trong danh sách hiện tại, vẫn mở modal bằng cách gọi API
    const placeholder = { maTNV: this.pendingVolunteerId } as TinhNguyenVien;
    this.xemChiTietTNV(placeholder);
    this.clearPendingVolunteerQuery();
  }

  private clearPendingVolunteerQuery(): void {
    this.pendingVolunteerId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  private taiSkillsFields(maTNV: number): void {
    // Sử dụng endpoint đúng: /tinhnguyenvien/{maTNV}/skill-fields
    this.http.get<any>(`${environment.apiUrl}/tinhnguyenvien/${maTNV}/skill-fields`).subscribe({
      next: (res) => {
        const data = res?.data || res || {};
        this.tnvdangxemSkills = data.skills || [];
        this.tnvdangxemFields = data.fields || [];
      },
      error: () => {
        this.tnvdangxemSkills = [];
        this.tnvdangxemFields = [];
      }
    });
  }

  private taiLichSuSuKien(maTNV: number): void {
    this.http.get<any>(`${environment.apiUrl}/dondangky/history/${maTNV}`).subscribe({
      next: (res) => { this.tnvdangxemHistory = res?.data || res || []; },
      error: () => { this.tnvdangxemHistory = []; }
    });
  }

  private loadVolunteerCertificates(maTNV: number): void {
    this.certificateService.getCertificatesByVolunteer(maTNV).subscribe({
      next: (res) => { this.tnvdangxemCertificates = res?.data || res || []; },
      error: () => { this.tnvdangxemCertificates = []; }
    });
  }

  private taiDanhGiaGanNhat(maUser: number): void {
    // Sử dụng authService.getToken() để lấy token từ cả localStorage và sessionStorage
    const token = this.auth.getToken() || '';
    this.http.get<any>(`${environment.apiUrl}/danhgia/user/${maUser}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const list = res?.data || res || [];
        this.tnvdangxemRecentReviews = Array.isArray(list) ? list.slice(0, 3) : [];
        this.tnvdangxemLatestReview = this.tnvdangxemRecentReviews.length ? this.tnvdangxemRecentReviews[0] : null;
      },
      error: () => { this.tnvdangxemLatestReview = null; }
    });
  }
  
  getVolunteerSkills(maTNV: number): any[] {
    // Find volunteer by ID
    const volunteer = this.danhSachTNV.find(v => v.maTNV === maTNV);
    if (!volunteer || !volunteer.kyNangIds || volunteer.kyNangIds.length === 0) {
      return [];
    }
    
    // Map skill IDs to skill names
    return volunteer.kyNangIds
      .map((id: number) => this.allSkills.find(s => s.maKyNang === id))
      .filter((skill: any) => skill != null);
  }

  openCertificateById(certId?: number): void {
    // Resolve id từ nhiều trường khác nhau để tăng tính tương thích dữ liệu
    const idResolved = certId
      || (this as any)?.tnvdangxem?.certificateId
      || (this as any)?.tnvdangxem?.maChungNhan;
    if (!idResolved) return;
    this.certificateIdToView = idResolved;
    this.showCertificateViewer = true;
  }

  onCloseCertificateViewer(): void {
    this.showCertificateViewer = false;
    this.certificateIdToView = null;
  }

  hasCertificateId(row: any): boolean {
    if (!row) return false;
    return !!(row.certificateId || row.maChungNhan || row.chungNhanId || row?.chungNhan?.maChungNhan);
  }

  hasCertificates(): boolean {
    return Array.isArray(this.tnvdangxemCertificates) && this.tnvdangxemCertificates.length > 0;
  }

  getVolunteerFields(maTNV: number): any[] {
    // Find volunteer by ID
    const volunteer = this.danhSachTNV.find(v => v.maTNV === maTNV);
    if (!volunteer || !volunteer.linhVucIds || volunteer.linhVucIds.length === 0) {
      return [];
    }
    
    // Map field IDs to field names
    return volunteer.linhVucIds
      .map((id: number) => this.allFields.find(f => f.maLinhVuc === id))
      .filter((field: any) => field != null);
  }
  
  calculateStatistics(): void {
    this.tongSoTNV = this.danhSachTNV.length;
    // Tính số TNV đang hoạt động (có điểm đánh giá > 0 hoặc đã tham gia sự kiện)
    this.tnvHoatDong = this.danhSachTNV.filter(tnv => 
      (tnv.diemTrungBinh && tnv.diemTrungBinh > 0) || tnv.anhDaiDien
    ).length;
    // Tính điểm trung bình
    const totalRating = this.danhSachTNV
      .filter(tnv => tnv.diemTrungBinh && tnv.diemTrungBinh > 0)
      .reduce((sum, tnv) => sum + (tnv.diemTrungBinh || 0), 0);
    const countWithRating = this.danhSachTNV.filter(tnv => tnv.diemTrungBinh && tnv.diemTrungBinh > 0).length;
    this.diemTrungBinh = countWithRating > 0 ? (totalRating / countWithRating).toFixed(1) : '0.0';
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

  getImageUrl(path: string | null | undefined): string {
    return getImageUrlUtil(path);
  }
}