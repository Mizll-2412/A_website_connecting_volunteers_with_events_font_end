import { Component, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToChucService } from '../../../services/organization';
import { EventService } from '../../../services/event';
import { HttpErrorResponse } from '@angular/common/http';
import { getImageUrl } from '../../../utils/image-url.util';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '../../../services/confirm.service';

enum TrangThaiXacMinh {
  ChoDuyet = 0,
  DaDuyet = 1,
  TuChoi = 2,
  ThuHoi = 3
}

@Component({
  selector: 'app-to-chuc',
  imports: [CommonModule, FormsModule, PaginationComponent, TableComponent],
  templateUrl: './organization.html',
  styleUrls: ['./organization.css'],
  standalone: true
})
export class ToChucComponent implements OnInit, AfterViewInit {
  TrangThaiXacMinh = TrangThaiXacMinh;
  danhSachHienThi: any[] = [];
  danhSachToChuc: any[] = [];
  paginatedOrganizations: any[] = [];
  tuKhoaTimKiem: string = '';
  filterStatus: string = 'all';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  eventTableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('giaoDienTemplate') giaoDienTemplate!: TemplateRef<any>;
  @ViewChild('trangThaiTemplate') trangThaiTemplate!: TemplateRef<any>;
  @ViewChild('ngayTaoTemplate') ngayTaoTemplate!: TemplateRef<any>;
  @ViewChild('soDienThoaiTemplate') soDienThoaiTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  @ViewChild('eventStatusTemplate') eventStatusTemplate!: TemplateRef<any>;
  @ViewChild('eventDateTemplate') eventDateTemplate!: TemplateRef<any>;
  @ViewChild('eventImageTemplate') eventImageTemplate!: TemplateRef<any>;
  hoSoDangXem: any = null;
  toChucDangSua: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  private pendingOrganizationId: number | null = null;

  // Pagination for events inside detail modal
  eventsCurrentPage: number = 1;
  eventsItemsPerPage: number = 5;

  constructor(
    private toChucService: ToChucService,
    private eventService: EventService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private confirm: ConfirmService
  ) {}

  ngOnInit() {
    this.initializeTableColumns();
    this.initializeEventTableColumns();
    this.route.queryParams.subscribe(params => {
      const idParam = params['id'];
      const parsedId = Number(idParam);
      if (idParam && !isNaN(parsedId)) {
        this.pendingOrganizationId = parsedId;
        this.tryOpenPendingOrganization();
      }
    });
    this.taiLaiDuLieu();
  }

  initializeEventTableColumns(): void {
    this.eventTableColumns = [
      { key: 'tenSuKien', title: 'Tên sự kiện', resizable: true },
      { key: 'trangThaiHienThi', title: 'Trạng thái', width: '140px', resizable: true },
      { key: 'diaChi', title: 'Địa chỉ', width: '200px', resizable: true },
      { key: 'soLuong', title: 'Số lượng tuyển', width: '130px', resizable: true, align: 'right' },
      { key: 'soLuongDaDangKy', title: 'Đã đăng ký', width: '120px', resizable: true, align: 'right' },
      // Ngày diễn ra sự kiện
      { key: 'ngayBatDau', title: 'Ngày bắt đầu', width: '140px', sortable: true, resizable: true },
      { key: 'ngayKetThuc', title: 'Ngày kết thúc', width: '140px', sortable: true, resizable: true },
      // Thời gian tuyển tình nguyện viên
      { key: 'tuyenBatDau', title: 'Bắt đầu tuyển', width: '150px', sortable: true, resizable: true },
      { key: 'tuyenKetThuc', title: 'Kết thúc tuyển', width: '150px', sortable: true, resizable: true },
      
    ];
  }

  initializeTableColumns(): void {
    this.tableColumns = [
      { key: 'maToChuc', title: 'Mã TC', width: '80px', sortable: true, resizable: true },
      { key: 'giaoDien', title: 'Giao diện', width: '90px', resizable: false },
      { key: 'tenToChuc', title: 'Tên tổ chức', sortable: true, resizable: true },
      { key: 'email', title: 'Email', sortable: true, resizable: true },
      { key: 'soDienThoai', title: 'Số điện thoại', width: '120px', resizable: true },
      { key: 'diaChi', title: 'Địa chỉ', resizable: true },
      { key: 'trangThaiXacMinh', title: 'Trạng thái', width: '150px', resizable: true },
      { key: 'ngayTao', title: 'Ngày tạo', width: '150px', sortable: true, resizable: true },
      { key: 'actions', title: 'Thao tác', width: '150px', align: 'center', resizable: true }
    ];
  }

  ngAfterViewInit(): void {
    // Gán template vào columns sau khi view được khởi tạo
    // index: 0-ma,1-giaoDien,2-ten,3-email,4-sdt,5-diaChi,6-trangThai,7-ngayTao,8-actions
    this.tableColumns[1].template = this.giaoDienTemplate;
    this.tableColumns[4].template = this.soDienThoaiTemplate;
    this.tableColumns[6].template = this.trangThaiTemplate;
    this.tableColumns[7].template = this.ngayTaoTemplate;
    this.tableColumns[8].template = this.actionsTemplate;

    // Gán template cho bảng sự kiện trong modal theo key
    this.eventTableColumns = this.eventTableColumns.map(col => {
      if (['ngayBatDau', 'ngayKetThuc', 'tuyenBatDau', 'tuyenKetThuc'].includes(col.key)) {
        return { ...col, template: this.eventDateTemplate };
      }
      if (col.key === 'trangThaiHienThi') {
        return { ...col, template: this.eventStatusTemplate };
      }
      return col;
    });
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
        this.currentPage = 1;
        this.updatePaginatedOrganizations();
        this.applyFilters();
        this.tryOpenPendingOrganization();
        this.isLoading = false;
      },
      (error) => {
        console.error('Lỗi khi lấy danh sách tổ chức:', error);
        this.errorMessage = 'Không thể tải danh sách tổ chức. Vui lòng thử lại sau.';
        this.isLoading = false;
        
        // Sử dụng dữ liệu mẫu nếu API lỗi
        this.danhSachToChuc = this.getMockData();
        this.danhSachHienThi = this.danhSachToChuc;
        this.currentPage = 1;
        this.updatePaginatedOrganizations();
        this.applyFilters();
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
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.danhSachToChuc];

    // Lọc theo trạng thái
    if (this.filterStatus !== 'all') {
      const statusVal = parseInt(this.filterStatus);
      list = list.filter(tc => tc.trangThaiXacMinh === statusVal);
    }

    // Lọc theo từ khóa
    const keyword = (this.tuKhoaTimKiem || '').toLowerCase().trim();
    if (keyword) {
      list = list.filter(tc =>
        (tc.tenToChuc && tc.tenToChuc.toLowerCase().includes(keyword)) ||
        (tc.email && tc.email.toLowerCase().includes(keyword)) ||
        (tc.soDienThoai && tc.soDienThoai.toLowerCase().includes(keyword)) ||
        (tc.diaChi && tc.diaChi.toLowerCase().includes(keyword))
      );
    }

    this.danhSachHienThi = list;
    this.currentPage = 1;
    this.updatePaginatedOrganizations();
  }

  get paginatedOrganizationsList(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.danhSachHienThi.slice(startIndex, endIndex);
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

  // Pagination handlers for events
  onEventsPageChange(page: number): void {
    this.eventsCurrentPage = page;
  }

  onEventsItemsPerPageChange(itemsPerPage: number): void {
    this.eventsItemsPerPage = itemsPerPage;
    this.eventsCurrentPage = 1;
  }

  demToChuc(trangThai: TrangThaiXacMinh): number {
    return this.danhSachToChuc.filter(tc => tc.trangThaiXacMinh === trangThai).length;
  }

  formatNgayTao(date: string | Date | null | undefined): string {
    if (!date) return 'Chưa có';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Chưa có';
      return dateObj.toLocaleDateString('vi-VN');
    } catch {
      return 'Chưa có';
    }
  }

  // Màu trạng thái theo text
  getEventStatusClassFromText(text?: string | null): string {
    const t = (text || '').toLowerCase();
    if (t.includes('hủy') || t.includes('huy') || t.includes('kết thúc') && !t.includes('đã duyệt')) {
      return 'bg-danger';
    }
    if (t.includes('đang diễn ra') || t.includes('đã duyệt')) {
      return 'bg-success';
    }
    if (t.includes('sắp diễn ra') || t.includes('đang tuyển')) {
      return 'bg-warning text-dark';
    }
    if (t.includes('đã kết thúc') || t.includes('kết thúc')) {
      return 'bg-secondary';
    }
    return 'bg-secondary';
  }

  // Định dạng DD-MM-YYYY (dùng cho bảng trong modal)
  formatDateDash(date: string | Date | null | undefined): string {
    if (!date) return 'Chưa có';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return 'Chưa có';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return 'Chưa có';
    }
  }

  getTrangThaiClass(trangThai: TrangThaiXacMinh | null): string {
    // Đồng bộ cách hiển thị với trang verify-organizations (Bootstrap badges)
    if (trangThai === null) return 'bg-secondary';
    const map: Record<number, string> = {
      0: 'bg-warning',
      1: 'bg-success',
      2: 'bg-danger',
      3: 'bg-dark'
    };
    return map[trangThai] || 'bg-secondary';
  }

  getTrangThaiText(trangThai: TrangThaiXacMinh | null): string {
    if (trangThai === null) return 'Chưa xác minh';
    const map: Record<number, string> = {
      0: 'Chờ xác minh',
      1: 'Đã xác minh',
      2: 'Đã từ chối',
      3: 'Đã thu hồi'
    };
    return map[trangThai] || 'Chưa xác minh';
  }

  get eventsPaginatedList(): any[] {
    const events = this.hoSoDangXem?.suKiens || [];
    const startIndex = (this.eventsCurrentPage - 1) * this.eventsItemsPerPage;
    const endIndex = startIndex + this.eventsItemsPerPage;
    return events.slice(startIndex, endIndex);
  }

  private tryOpenPendingOrganization(): void {
    if (!this.pendingOrganizationId) return;

    const existing = this.danhSachToChuc.find(tc => tc.maToChuc === this.pendingOrganizationId);
    if (existing) {
      this.xemChiTiet(existing);
      this.clearPendingOrganizationQuery();
      return;
    }

    // Nếu không tìm thấy, vẫn gọi API để mở modal
    const placeholder = { maToChuc: this.pendingOrganizationId };
    this.xemChiTiet(placeholder);
    this.clearPendingOrganizationQuery();
  }

  private clearPendingOrganizationQuery(): void {
    this.pendingOrganizationId = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
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
        
        // Tải giấy tờ pháp lý
        this.toChucService.getLegalDocuments(toChuc.maToChuc).subscribe({
          next: (res: any) => {
            const docs = res?.data || res || [];
            this.hoSoDangXem.giayTos = docs;
          },
          error: (err: HttpErrorResponse) => {
            console.error('Lỗi tải giấy tờ pháp lý:', err);
            this.hoSoDangXem.giayTos = [];
          }
        });

        // Tải sự kiện của tổ chức từ API
        this.eventService.getEventsByOrganization(toChuc.maToChuc).subscribe({
          next: (eventsResponse: any) => {
            const eventsData = eventsResponse.data || eventsResponse || [];
            this.hoSoDangXem.suKiens = eventsData;
            this.eventsCurrentPage = 1;
          },
          error: (err: HttpErrorResponse) => {
            console.error('Lỗi khi tải sự kiện của tổ chức:', err);
            this.hoSoDangXem.suKiens = [];
          }
        });
      },
      error: (error) => {
        console.error('Lỗi khi lấy chi tiết tổ chức:', error);
        // Sử dụng dữ liệu đã có
        this.hoSoDangXem = {...toChuc};
        
        // Vẫn thử load sự kiện từ API
        this.eventService.getEventsByOrganization(toChuc.maToChuc).subscribe({
          next: (eventsResponse: any) => {
            const eventsData = eventsResponse.data || eventsResponse || [];
            this.hoSoDangXem.suKiens = eventsData;
            this.eventsCurrentPage = 1;
          },
          error: (err: HttpErrorResponse) => {
            console.error('Lỗi khi tải sự kiện của tổ chức:', err);
            this.hoSoDangXem.suKiens = [];
          }
        });
      }
    });
  }

  suaToChuc(toChuc: any) {
    this.toChucDangSua = {...toChuc};
    
    // Đóng modal xem chi tiết nếu đang mở
    this.hoSoDangXem = null;
  }

  luuToChuc() {
    // Chỉ cập nhật tổ chức (không tạo mới) - gửi dạng FormData để phù hợp API
    const formData = new FormData();
    if (this.toChucDangSua?.tenToChuc !== undefined) formData.append('tenToChuc', this.toChucDangSua.tenToChuc ?? '');
    if (this.toChucDangSua?.email !== undefined) formData.append('email', this.toChucDangSua.email ?? '');
    if (this.toChucDangSua?.soDienThoai !== undefined) formData.append('soDienThoai', this.toChucDangSua.soDienThoai ?? '');
    if (this.toChucDangSua?.diaChi !== undefined) formData.append('diaChi', this.toChucDangSua.diaChi ?? '');
    if (this.toChucDangSua?.gioiThieu !== undefined) formData.append('gioiThieu', this.toChucDangSua.gioiThieu ?? '');
    // Không gửi các field hệ thống như ngayTao, trangThaiXacMinh, lyDoTuChoi...

    this.toChucService.updateToChuc(this.toChucDangSua.maToChuc, formData).subscribe({
      next: (response: any) => {
        this.toastService.success('Cập nhật tổ chức thành công!');
        
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
        this.toastService.error('Không thể cập nhật tổ chức. Vui lòng thử lại sau.');
      }
    });
  }

  huyChinhSua() {
    this.toChucDangSua = null;
  }

  dongModal() {
    this.hoSoDangXem = null;
  }

  duyetToChuc(toChuc: any) {
    this.toChucService.verifyOrganization(toChuc.maToChuc, true).subscribe({
      next: (response: any) => {
        toChuc.trangThaiXacMinh = TrangThaiXacMinh.DaDuyet;
        this.toastService.success('Đã duyệt tổ chức thành công!');
      },
      error: (error: any) => {
        console.error('Lỗi khi duyệt tổ chức:', error);
        this.toastService.error('Không thể duyệt tổ chức. Vui lòng thử lại sau.');
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
        this.toastService.success('Đã từ chối tổ chức thành công!');
      },
      error: (error: any) => {
        console.error('Lỗi khi từ chối tổ chức:', error);
        this.toastService.error('Không thể từ chối tổ chức. Vui lòng thử lại sau.');
      }
    });
  }

  xoaToChuc(toChuc: any) {
    this.confirm.confirm(`Bạn có chắc chắn muốn xóa tổ chức "${toChuc.tenToChuc || ('#' + toChuc.maToChuc)}"?`, { variant: 'danger', okText: 'Xóa', cancelText: 'Hủy' })
      .then(confirmed => {
        if (!confirmed) return;
        this.toChucService.deleteOrganization(toChuc.maToChuc).subscribe({
          next: () => {
            this.danhSachToChuc = this.danhSachToChuc.filter(x => x.maToChuc !== toChuc.maToChuc);
            this.timKiem();
            this.toastService.success('Đã xóa tổ chức thành công!');
          },
          error: (error) => {
            console.error('Lỗi khi xóa tổ chức:', error);
            this.toastService.error('Không thể xóa tổ chức. Vui lòng thử lại sau.');
          }
        });
      });
  }

  getImageUrl(path: string | null | undefined): string {
    const resolved = getImageUrl(path);
    // Log hỗ trợ debug trường hợp ảnh không hiển thị
    console.debug('[Organization] resolve image url:', { input: path, output: resolved });
    return resolved;
  }
}