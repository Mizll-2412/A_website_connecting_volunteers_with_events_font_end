import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SuKien, TrangThaiSuKien } from '../../../models/event';
import { EventService } from '../../../services/event';
import { SkillService } from '../../../services/skill';
import { FieldService } from '../../../services/field';
import { RegistrationService } from '../../../services/registration';
import { AuthService } from '../../../services/auth';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { getImageUrl } from '../../../utils/image-url.util';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';
import { formatDateTime, formatDateTimeForInput } from '../../../utils/date-format.util';
import { EventFormModalComponent, EventFormData } from '../../shared/event-form-modal/event-form-modal';

@Component({
  selector: 'app-su-kien',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, PaginationComponent, TableComponent, EventFormModalComponent],
  templateUrl: './event.html',
  styleUrls: ['./event.css']
})
export class SuKienComponent implements OnInit, AfterViewInit {
  tuKhoaTimKiem: string = '';
  filterStatus: string = 'all';
  dangThemMoi: boolean = false;
  suKienDangChinhSua: SuKien | null = null;
  isLoading: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';

  danhSachSuKien: SuKien[] = [];
  danhSachHienThi: SuKien[] = [];
  paginatedEvents: SuKien[] = [];
  suKienMoi: SuKien = this.khoiTaoSuKienRong();
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('hinhAnhTemplate') hinhAnhTemplate!: TemplateRef<any>;
  @ViewChild('trangThaiTemplate') trangThaiTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  
  // Statistics
  tongSoSuKien: number = 0;
  suKienDangDienRa: number = 0;
  suKienSapDienRa: number = 0;
  
  // File upload
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  // Skills and Fields
  linhVucs: any[] = [];
  kyNangs: any[] = [];
  selectedLinhVucs: number[] = [];
  selectedKyNangs: number[] = [];
  
  // Organizations
  organizations: any[] = [];
  
  // Chi tiết sự kiện đang xem
  suKienDangXem: SuKien | null = null;
  suKienDangXemLinhVucs: any[] = [];
  suKienDangXemKyNangs: any[] = [];
  suKienDangXemRegistrations: any[] = [];
  isLoadingRegistrations: boolean = false;
  
  // Xác nhận xóa
  suKienCanXoa: SuKien | null = null;

  // Role và authentication
  role: string = '';
  isLoggedIn: boolean = false;

  // Validation errors
  soLuongError: string = '';

  // Event Form Modal
  showEventModal: boolean = false;
  isEditingEvent: boolean = false;
  eventFormData: EventFormData | null = null;

  constructor(
    private eventService: EventService,
    private skillService: SkillService,
    private fieldService: FieldService,
    private registrationService: RegistrationService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Kiểm tra đăng nhập và role
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      this.role = this.authService.getRole();
      
      // Chỉ cho phép Admin truy cập trang này
      if (this.role !== 'Admin') {
        this.toastService.warning('Bạn không có quyền truy cập trang này!');
        this.router.navigate(['/home']);
        return;
      }
    } else {
      this.toastService.warning('Vui lòng đăng nhập để truy cập!');
      this.router.navigate(['/login']);
      return;
    }

    this.initializeTableColumns();
    this.taiLaiDuLieu();
    this.loadSkills();
    this.loadFields();
    this.loadOrganizations();
  }

  initializeTableColumns(): void {
    this.tableColumns = [
      { key: 'maSuKien', title: 'ID', width: '80px', sortable: true, resizable: true, align: 'right' },
      { key: 'hinhAnh', title: 'Hình ảnh', width: '100px', resizable: true },
      { key: 'tenSuKien', title: 'Tên sự kiện', sortable: true, resizable: true },
      { key: 'trangThai', title: 'Trạng thái', width: '130px', resizable: true },
      { key: 'diaChi', title: 'Địa điểm', sortable: true, resizable: true },
      { key: 'ngayBatDau', title: 'Ngày bắt đầu', width: '160px', sortable: true, resizable: true, valueGetter: (row: any) => this.formatNgay(row.ngayBatDau) },
      { key: 'ngayKetThuc', title: 'Ngày kết thúc', width: '160px', sortable: true, resizable: true, valueGetter: (row: any) => this.formatNgay(row.ngayKetThuc) },
      { key: 'tuyenBatDau', title: 'Ngày bắt đầu tuyển', width: '160px', sortable: true, resizable: true, valueGetter: (row: any) => this.formatNgay(row.tuyenBatDau) },
      { key: 'tuyenKetThuc', title: 'Ngày dừng tuyển', width: '160px', sortable: true, resizable: true, valueGetter: (row: any) => this.formatNgay(row.tuyenKetThuc) },
      { key: 'soLuong', title: 'Số lượng tuyển', width: '130px', sortable: true, resizable: true, align: 'right' },
      { key: 'soLuongDaDangKy', title: 'Số lượng đăng ký', width: '150px', sortable: false, resizable: true, align: 'right' },
      { key: 'actions', title: 'Thao tác', width: '150px', align: 'center', resizable: true }
    ];
  }

  ngAfterViewInit(): void {
    // Gán template vào columns sau khi view được khởi tạo
    // Chỉ số cột sau khi sắp xếp lại:
    // 0: maSuKien, 1: hinhAnh, 2: tenSuKien, 3: trangThai, ..., 11: actions
    this.tableColumns[1].template = this.hinhAnhTemplate;
    this.tableColumns[3].template = this.trangThaiTemplate;
    this.tableColumns[11].template = this.actionsTemplate;
  }

  getTrangThaiText(suKien: SuKien): string {
    if (!suKien.trangThai) {
      // Tính toán trạng thái dựa trên ngày tháng
      const now = new Date();
      const start = suKien.ngayBatDau ? new Date(suKien.ngayBatDau) : null;
      const end = suKien.ngayKetThuc ? new Date(suKien.ngayKetThuc) : null;
      
      if (start && end) {
        if (start > now) {
          return TrangThaiSuKien.SapDienRa;
        } else if (start <= now && now <= end) {
          return TrangThaiSuKien.DangDienRa;
        } else if (end < now) {
          return TrangThaiSuKien.KetThuc;
        }
      }
      return TrangThaiSuKien.DangTuyen;
    }
    return suKien.trangThai;
  }

  getTrangThaiClass(suKien: SuKien): string {
    const trangThai = this.getTrangThaiText(suKien);
    
    switch (trangThai) {
      case TrangThaiSuKien.DangTuyen:
      case 'Đang tuyển':
        return 'bg-warning'; // Vàng - đang tuyển
      case TrangThaiSuKien.SapDienRa:
      case 'Sắp diễn ra':
        return 'bg-info'; // Xanh dương - sắp diễn ra
      case TrangThaiSuKien.DangDienRa:
      case 'Đang diễn ra':
        return 'bg-success'; // Xanh lá - đang diễn ra
      case TrangThaiSuKien.KetThuc:
      case 'Kết thúc':
      case 'Đã kết thúc':
        return 'bg-secondary'; // Xám - đã kết thúc
      case TrangThaiSuKien.HuyBo:
      case 'Hủy bỏ':
      case 'Đã hủy':
        return 'bg-danger'; // Đỏ - đã hủy
      case 'Đã duyệt':
        return 'bg-success'; // Xanh lá - đã duyệt
      default:
        return 'bg-secondary';
    }
  }
  
  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.kyNangs = response.data || response || [];
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải kỹ năng:', err);
        this.kyNangs = [];
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.linhVucs = response.data || response || [];
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải lĩnh vực:', err);
        this.linhVucs = [];
      }
    });
  }
  
  isLinhVucSelected(maLinhVuc: number): boolean {
    return this.selectedLinhVucs.includes(maLinhVuc);
  }
  
  toggleLinhVuc(maLinhVuc: number): void {
    const index = this.selectedLinhVucs.indexOf(maLinhVuc);
    if (index > -1) {
      this.selectedLinhVucs.splice(index, 1);
    } else {
      this.selectedLinhVucs.push(maLinhVuc);
    }
  }
  
  isKyNangSelected(maKyNang: number): boolean {
    return this.selectedKyNangs.includes(maKyNang);
  }
  
  toggleKyNang(maKyNang: number): void {
    const index = this.selectedKyNangs.indexOf(maKyNang);
    if (index > -1) {
      this.selectedKyNangs.splice(index, 1);
    } else {
      this.selectedKyNangs.push(maKyNang);
    }
  }
  
  loadOrganizations(): void {
    this.http.get<any>(`${environment.apiUrl}/organization`).subscribe({
      next: (response) => {
        this.organizations = response.data || response || [];
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách tổ chức:', error);
        this.organizations = [];
      }
    });
  }
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  
  calculateStatistics(): void {
    this.tongSoSuKien = this.danhSachSuKien.length;
    const now = new Date();
    this.suKienDangDienRa = this.danhSachSuKien.filter(sk => {
      const start = sk.ngayBatDau ? new Date(sk.ngayBatDau) : null;
      const end = sk.ngayKetThuc ? new Date(sk.ngayKetThuc) : null;
      return start && end && start <= now && now <= end && sk.trangThai !== 'Hủy bỏ';
    }).length;
    this.suKienSapDienRa = this.danhSachSuKien.filter(sk => {
      const start = sk.ngayBatDau ? new Date(sk.ngayBatDau) : null;
      return start && start > now && sk.trangThai !== 'Hủy bỏ';
    }).length;
  }
  
  xemChiTiet(suKien: SuKien): void {
    // Load đầy đủ thông tin sự kiện từ API
    this.eventService.getSuKienById(suKien.maSuKien).subscribe({
      next: (response: any) => {
        const fullEvent = response.data || response || suKien;
        console.log('API Response:', response);
        console.log('Full Event:', fullEvent);
        console.log('ngayKetThuc raw:', fullEvent.ngayKetThuc, typeof fullEvent.ngayKetThuc);
        console.log('tuyenKetThuc raw:', fullEvent.tuyenKetThuc, typeof fullEvent.tuyenKetThuc);
        // Ensure dates are preserved as strings from API, not formatted
        this.suKienDangXem = { ...fullEvent };
        
        // Load lĩnh vực và kỹ năng
        if (fullEvent.linhVucIds && Array.isArray(fullEvent.linhVucIds)) {
          this.suKienDangXemLinhVucs = fullEvent.linhVucIds
            .map((id: number) => this.linhVucs.find(lv => lv.maLinhVuc === id))
            .filter((lv: any) => lv != null);
        } else {
          this.suKienDangXemLinhVucs = [];
        }
        
        if (fullEvent.kyNangIds && Array.isArray(fullEvent.kyNangIds)) {
          this.suKienDangXemKyNangs = fullEvent.kyNangIds
            .map((id: number) => this.kyNangs.find(kn => kn.maKyNang === id))
            .filter((kn: any) => kn != null);
        } else {
          this.suKienDangXemKyNangs = [];
        }
        
        // Load danh sách đơn đăng ký
        this.loadRegistrations(suKien.maSuKien);
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết sự kiện:', error);
        // Fallback: dùng dữ liệu hiện có
        this.suKienDangXem = suKien;
        this.suKienDangXemLinhVucs = [];
        this.suKienDangXemKyNangs = [];
        this.loadRegistrations(suKien.maSuKien);
      }
    });
  }

  loadRegistrations(maSuKien: number): void {
    this.isLoadingRegistrations = true;
    this.registrationService.getRegistrationsByEvent(maSuKien).subscribe({
      next: (response: any) => {
        const data = response.data || response || [];
        const registrations = Array.isArray(data) ? data : [];

        this.suKienDangXemRegistrations = registrations.map((reg: any) => {
          const tinhNguyenVien = reg.tinhNguyenVien || reg.volunteer || {};
          const hoTen = (reg.hoTen || tinhNguyenVien.hoTen || tinhNguyenVien.tenTNV || '').trim();
          const email = reg.email || tinhNguyenVien.email || '';
          const soDienThoai = reg.soDienThoai || tinhNguyenVien.soDienThoai || '';
          const anhDaiDien = reg.anhDaiDien || tinhNguyenVien.anhDaiDien || '';
          const trangThaiText = reg.trangThaiText || reg.trangThaiHienThi || reg.statusText || reg.trangThai || 'Chờ duyệt';
          const trangThaiCode = reg.trangThai ?? reg.status ?? null;
          const ngayDangKy = reg.ngayDangKy || reg.ngayTao || reg.createdAt || null;

          return {
            ...reg,
            tinhNguyenVien: {
              ...tinhNguyenVien,
              hoTen,
              email,
              soDienThoai,
              anhDaiDien
            },
            hoTen,
            email,
            soDienThoai,
            anhDaiDien,
            trangThaiText,
            trangThaiCode,
            ngayDangKy
          };
        });

        this.isLoadingRegistrations = false;
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách đơn đăng ký:', error);
        this.suKienDangXemRegistrations = [];
        this.isLoadingRegistrations = false;
      }
    });
  }

  getTrangThaiDangKyClass(trangThai: string | number | null | undefined): string {
    const value = typeof trangThai === 'number' ? trangThai : (trangThai || '').toString().toLowerCase();

    if (value === 1 || value === '1' || value === 'đã duyệt' || value === 'approved' || value === 'da duyet') {
      return 'badge-success';
    }

    if (value === 0 || value === '0' || value === 'chờ duyệt' || value === 'pending') {
      return 'badge-warning';
    }

    if (value === 2 || value === '2' || value === 'từ chối' || value === 'rejected') {
      return 'badge-danger';
    }

    if (value === 3 || value === '3' || value === 'đã hủy' || value === 'cancelled') {
      return 'badge-secondary';
    }

    return 'badge-secondary';
  }

  dongChiTietSuKien(): void {
    this.suKienDangXem = null;
    this.suKienDangXemLinhVucs = [];
    this.suKienDangXemKyNangs = [];
    this.suKienDangXemRegistrations = [];
    this.isLoadingRegistrations = false;
  }

  private khoiTaoSuKienRong(): SuKien {
    return {
      maSuKien: 0,
      maToChuc: undefined,  // Must select an organization
      tenSuKien: '',
      noiDung: '',
      trangThai: TrangThaiSuKien.DangTuyen,
      linhVucIds: [],
      kyNangIds: []
    } as unknown as SuKien;
  }

  formatNgay(date?: Date | string): string {
    // Sử dụng utility function thống nhất
    return formatDateTime(date);
  }

  // Format datetime for input type="datetime-local" (yyyy-MM-ddTHH:mm)
  formatDateForInput(dateValue: any): string {
    // Sử dụng utility function thống nhất
    return formatDateTimeForInput(dateValue);
  }
  
  formatDateForInputOld(dateValue: any): string {
    if (!dateValue) {
      console.log('formatDateForInput: empty value');
      return '';
    }
    
    try {
      // If it's already a string in yyyy-MM-dd format
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        console.log('formatDateForInput: already yyyy-MM-dd format:', dateValue);
        return dateValue;
      }
      
      // If it's a string with ISO format, extract date part first to avoid timezone issues
      if (typeof dateValue === 'string') {
        // Check if it's in dd-MM-yyyy format (e.g., "13-11-2025")
        const ddMMyyyyMatch = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (ddMMyyyyMatch) {
          const [, day, month, year] = ddMMyyyyMatch;
          const formatted = `${year}-${month}-${day}`;
          console.log('formatDateForInput: converted dd-MM-yyyy to yyyy-MM-dd:', dateValue, '->', formatted);
          return formatted;
        }
        
        // Extract date part from ISO string (e.g., "2025-11-10T23:07:48.71373" -> "2025-11-10")
        const dateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          console.log('formatDateForInput: extracted from ISO string:', dateValue, '->', dateMatch[1]);
          return dateMatch[1];
        }
      }
      
      // If it's a Date object or other format
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn('formatDateForInput: Invalid date value:', dateValue);
        return '';
      }
      
      // Use UTC methods to avoid timezone issues, or use local methods if date is already adjusted
      // For input type="date", we need local date, not UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      console.log('formatDateForInput: converted Date object:', dateValue, '->', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return '';
    }
  }

  timKiem() {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.danhSachSuKien];
    // Filter by status if selected
    if (this.filterStatus !== 'all') {
      list = list.filter(sk => this.getTrangThaiText(sk) === this.filterStatus);
    }
    // Keyword filter
    const keyword = (this.tuKhoaTimKiem || '').toLowerCase().trim();
    if (keyword) {
      list = list.filter(sk =>
        (sk.tenSuKien && sk.tenSuKien.toLowerCase().includes(keyword)) ||
        (sk.noiDung && sk.noiDung.toLowerCase().includes(keyword)) ||
        (sk.diaChi && sk.diaChi.toLowerCase().includes(keyword))
      );
    }
    this.danhSachHienThi = list;
    this.currentPage = 1;
  }

  get paginatedEventsList(): SuKien[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.danhSachHienThi.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
  }

  taiLaiDuLieu() {
    this.isLoading = true;
    this.errorMessage = '';
    this.tuKhoaTimKiem = '';
    
    this.eventService.getAllSuKien().subscribe({
      next: (response: any) => {
        console.log('API response:', response);
        
        // Xử lý cấu trúc dữ liệu khác nhau
        if (response && response.data && Array.isArray(response.data)) {
          this.danhSachSuKien = response.data;
        } else if (Array.isArray(response)) {
          this.danhSachSuKien = response;
        } else {
          console.error('Dữ liệu API không đúng định dạng:', response);
          // Sử dụng dữ liệu mẫu
          this.danhSachSuKien = this.getMockData();
        }
        
        this.danhSachHienThi = [...this.danhSachSuKien];
        this.calculateStatistics();
        this.currentPage = 1;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi lấy danh sách sự kiện:', error);
        this.errorMessage = 'Không thể tải danh sách sự kiện. Vui lòng thử lại sau.';
        // Sử dụng dữ liệu mẫu
        this.danhSachSuKien = this.getMockData();
        this.danhSachHienThi = [...this.danhSachSuKien];
        this.calculateStatistics();
        this.currentPage = 1;
        this.applyFilters();
        this.isLoading = false;
      }
    });
  }

  batDauThemMoi() {
    // Open shared modal for creating new event
    this.isEditingEvent = false;
    this.eventFormData = null;
    this.showEventModal = true;
  }
  
  batDauThemMoiOld() {
    this.suKienMoi = this.khoiTaoSuKienRong();
    this.dangThemMoi = true;
    this.suKienDangChinhSua = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [];
    this.selectedKyNangs = [];
    this.suKienMoi.linhVucIds = [];
    this.suKienMoi.kyNangIds = [];
    this.soLuongError = '';
    this.isSaving = false;
  }

  luuSuKien() {
    // Nếu đang lưu, không cho phép submit lại
    if (this.isSaving) {
      return;
    }

    // Validate các trường bắt buộc
    if (!this.suKienMoi.tenSuKien?.trim()) {
      this.toastService.warning('Vui lòng nhập tên sự kiện!');
      return;
    }

    if (!this.suKienMoi.noiDung?.trim()) {
      this.toastService.warning('Vui lòng nhập mô tả sự kiện!');
      return;
    }

    if (!this.suKienMoi.ngayBatDau) {
      this.toastService.warning('Vui lòng chọn ngày bắt đầu!');
      return;
    }

    if (!this.suKienMoi.ngayKetThuc) {
      this.toastService.warning('Vui lòng chọn ngày kết thúc!');
      return;
    }

    if (!this.suKienMoi.tuyenBatDau) {
      this.toastService.warning('Vui lòng chọn ngày bắt đầu tuyển!');
      return;
    }

    if (!this.suKienMoi.tuyenKetThuc) {
      this.toastService.warning('Vui lòng chọn ngày kết thúc tuyển!');
      return;
    }

    if (!this.suKienMoi.diaChi?.trim()) {
      this.toastService.warning('Vui lòng nhập địa điểm!');
      return;
    }

    // Validate số lượng
    this.validateSoLuong();
    if (this.soLuongError) {
      this.toastService.warning(this.soLuongError);
      return;
    }

    if (!this.selectedFile && !this.suKienMoi.hinhAnh) {
      this.toastService.warning('Vui lòng chọn hình ảnh cho sự kiện!');
      return;
    }

    if (!this.selectedLinhVucs || this.selectedLinhVucs.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất 1 lĩnh vực!');
      return;
    }

    if (!this.selectedKyNangs || this.selectedKyNangs.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất 1 kỹ năng!');
      return;
    }

    if (!this.suKienMoi.maToChuc || this.suKienMoi.maToChuc === -1) {
      this.toastService.warning('Vui lòng chọn tổ chức phụ trách!');
      return;
    }

    // Validate ngày tháng
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset giờ để so sánh chỉ ngày
    
    const ngayBatDau = new Date(this.suKienMoi.ngayBatDau);
    ngayBatDau.setHours(0, 0, 0, 0);
    
    const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);
    ngayKetThuc.setHours(0, 0, 0, 0);
    
    const tuyenBatDau = new Date(this.suKienMoi.tuyenBatDau);
    tuyenBatDau.setHours(0, 0, 0, 0);
    
    const tuyenKetThuc = new Date(this.suKienMoi.tuyenKetThuc);
    tuyenKetThuc.setHours(0, 0, 0, 0);

    // Ngày bắt đầu phải >= thời gian hiện tại (chỉ áp dụng khi thêm mới)
    // Khi chỉnh sửa, cho phép giữ nguyên ngày bắt đầu trong quá khứ
    if (this.suKienMoi.maSuKien === 0 && ngayBatDau < now) {
      this.toastService.warning('Ngày bắt đầu phải bằng hoặc lớn hơn thời gian hiện tại!');
      return;
    }

    if (ngayKetThuc < ngayBatDau) {
      this.toastService.warning('Ngày kết thúc phải sau ngày bắt đầu!');
      return;
    }

    // Ngày bắt đầu tuyển phải >= ngày bắt đầu
    if (tuyenBatDau < ngayBatDau) {
      this.toastService.warning('Ngày bắt đầu tuyển phải bằng hoặc lớn hơn ngày bắt đầu sự kiện!');
      return;
    }

    // Ngày bắt đầu tuyển phải <= ngày kết thúc
    if (tuyenBatDau > ngayKetThuc) {
      this.toastService.warning('Ngày bắt đầu tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!');
      return;
    }

    if (tuyenKetThuc < tuyenBatDau) {
      this.toastService.warning('Ngày kết thúc tuyển phải sau ngày bắt đầu tuyển!');
      return;
    }

    // Ngày kết thúc tuyển phải <= ngày kết thúc
    if (tuyenKetThuc > ngayKetThuc) {
      this.toastService.warning('Ngày kết thúc tuyển phải nhỏ hơn hoặc bằng ngày kết thúc sự kiện!');
      return;
    }

    // Validate 3 field mới: ngayDienRaBatDau, ngayDienRaKetThuc, thoiGianKhoaHuy
    if (this.suKienMoi.ngayDienRaBatDau) {
      const ngayDienRaBatDau = new Date(this.suKienMoi.ngayDienRaBatDau);
      ngayDienRaBatDau.setHours(0, 0, 0, 0);
      
      // Ngày diễn ra phải nằm trong khoảng ngày bắt đầu và ngày kết thúc
      if (ngayDienRaBatDau < ngayBatDau || ngayDienRaBatDau > ngayKetThuc) {
        this.toastService.warning('Ngày bắt đầu diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!');
        return;
      }
    }

    if (this.suKienMoi.ngayDienRaKetThuc) {
      const ngayDienRaKetThuc = new Date(this.suKienMoi.ngayDienRaKetThuc);
      ngayDienRaKetThuc.setHours(0, 0, 0, 0);
      
      // Ngày kết thúc diễn ra phải nằm trong khoảng ngày bắt đầu và ngày kết thúc
      if (ngayDienRaKetThuc < ngayBatDau || ngayDienRaKetThuc > ngayKetThuc) {
        this.toastService.warning('Ngày kết thúc diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!');
        return;
      }
      
      // Nếu có ngayDienRaBatDau, kiểm tra ngayDienRaKetThuc phải sau hoặc bằng ngayDienRaBatDau
      if (this.suKienMoi.ngayDienRaBatDau) {
        const ngayDienRaBatDau = new Date(this.suKienMoi.ngayDienRaBatDau);
        ngayDienRaBatDau.setHours(0, 0, 0, 0);
        
        if (ngayDienRaKetThuc < ngayDienRaBatDau) {
          this.toastService.warning('Ngày kết thúc diễn ra phải sau hoặc bằng ngày bắt đầu diễn ra!');
          return;
        }
      }
    }

    // Validate thời gian khóa hủy (phải >= 0)
    if (this.suKienMoi.thoiGianKhoaHuy !== null && this.suKienMoi.thoiGianKhoaHuy !== undefined) {
      if (this.suKienMoi.thoiGianKhoaHuy < 0) {
        this.toastService.warning('Thời gian khóa hủy đăng ký không được âm!');
        return;
      }
      if (this.suKienMoi.thoiGianKhoaHuy > 168) {
        this.toastService.warning('Thời gian khóa hủy đăng ký không được vượt quá 168 giờ (7 ngày)!');
        return;
      }
    }

    // Tự động tính trạng thái dựa trên ngày tháng
    const trangThaiTuDong = this.getTrangThaiTuDong();

    // Prepare event data with skills and fields
    const eventData: any = {
      ...this.suKienMoi,
      linhVucIds: this.selectedLinhVucs,
      kyNangIds: this.selectedKyNangs,
      soLuong: this.suKienMoi.soLuong,
      trangThai: trangThaiTuDong // Tự động set trạng thái
    };

    // Set trạng thái đang lưu
    this.isSaving = true;

    // Use EventService which handles FormData internally
    if (this.suKienMoi.maSuKien === 0) {
      // Thêm mới sự kiện
      this.eventService.createSuKien(eventData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Thêm sự kiện thành công:', response);
          this.toastService.success('Thêm sự kiện thành công!');
          this.taiLaiDuLieu();
          this.dangThemMoi = false;
          this.selectedFile = null;
          this.previewUrl = null;
          this.selectedLinhVucs = [];
          this.selectedKyNangs = [];
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi thêm sự kiện:', error);
          this.toastService.error('Không thể thêm sự kiện. Vui lòng thử lại sau.');
          this.isSaving = false;
        }
      });
    } else {
      // Cập nhật sự kiện
      this.eventService.updateSuKien(this.suKienMoi.maSuKien, eventData, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Cập nhật sự kiện thành công:', response);
          this.toastService.success('Cập nhật sự kiện thành công!');
          this.taiLaiDuLieu();
          this.dangThemMoi = false;
          this.selectedFile = null;
          this.previewUrl = null;
          this.isSaving = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Lỗi khi cập nhật sự kiện:', error);
          this.toastService.error('Không thể cập nhật sự kiện. Vui lòng thử lại sau.');
          this.isSaving = false;
        }
      });
    }
  }

  suaSuKien(suKien: SuKien) {
    // Load đầy đủ thông tin sự kiện từ API và mở shared modal
    this.eventService.getSuKienById(suKien.maSuKien).subscribe({
      next: (response: any) => {
        const fullEvent = response.data || response || suKien;
        
        // Chuẩn bị dữ liệu cho shared modal
        this.eventFormData = {
          maSuKien: fullEvent.maSuKien,
          tenSuKien: fullEvent.tenSuKien,
          noiDung: fullEvent.noiDung,
          ngayBatDau: fullEvent.ngayBatDau,
          ngayKetThuc: fullEvent.ngayKetThuc,
          tuyenBatDau: fullEvent.tuyenBatDau,
          tuyenKetThuc: fullEvent.tuyenKetThuc,
          ngayDienRaBatDau: fullEvent.ngayDienRaBatDau,
          ngayDienRaKetThuc: fullEvent.ngayDienRaKetThuc,
          thoiGianKhoaHuy: fullEvent.thoiGianKhoaHuy,
          diaChi: fullEvent.diaChi,
          soLuong: fullEvent.soLuong || 0,
          maToChuc: fullEvent.maToChuc,
          hinhAnh: fullEvent.hinhAnh,
          linhVucIds: Array.isArray(fullEvent.linhVucIds) ? fullEvent.linhVucIds : 
                     Array.isArray(fullEvent.linhVucs) ? fullEvent.linhVucs.map((lv: any) => lv.maLinhVuc || lv.id) : [],
          kyNangIds: Array.isArray(fullEvent.kyNangIds) ? fullEvent.kyNangIds : 
                    Array.isArray(fullEvent.kyNangs) ? fullEvent.kyNangs.map((kn: any) => kn.maKyNang || kn.id) : []
        };
        
        this.isEditingEvent = true;
        this.showEventModal = true;
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Lỗi khi tải chi tiết sự kiện:', error);
        // Fallback: dùng dữ liệu hiện có
        // Format dates to strings for input type="date"
        this.suKienMoi = {
          ...suKien,
          ngayBatDau: this.formatDateForInput(suKien.ngayBatDau) as any,
          ngayKetThuc: this.formatDateForInput(suKien.ngayKetThuc) as any,
          tuyenBatDau: this.formatDateForInput(suKien.tuyenBatDau) as any,
          tuyenKetThuc: this.formatDateForInput(suKien.tuyenKetThuc) as any,
          soLuong: suKien.soLuong || 0,
          trangThai: suKien.trangThai || 'Đang tuyển',
          maToChuc: suKien.maToChuc || undefined
        } as SuKien;
        
        this.dangThemMoi = true;
        this.suKienDangChinhSua = suKien;
        
        // Load preview image nếu có
        if (suKien.hinhAnh) {
          this.previewUrl = this.getImageUrl(suKien.hinhAnh);
        } else {
          this.previewUrl = null;
        }
        this.selectedFile = null;
        
        // Load selected skills and fields (SuKien interface only has linhVucIds and kyNangIds)
        if (suKien.linhVucIds && Array.isArray(suKien.linhVucIds)) {
          this.selectedLinhVucs = [...suKien.linhVucIds];
        } else {
          this.selectedLinhVucs = [];
        }
        this.suKienMoi.linhVucIds = [...this.selectedLinhVucs];
        if (suKien.kyNangIds && Array.isArray(suKien.kyNangIds)) {
          this.selectedKyNangs = [...suKien.kyNangIds];
        } else {
          this.selectedKyNangs = [];
        }
        this.suKienMoi.kyNangIds = [...this.selectedKyNangs];
        
        // Trigger change detection để đảm bảo modal hiển thị
        this.cdr.detectChanges();
      }
    });
  }

  xoaSuKien(suKien: SuKien) {
    this.suKienCanXoa = suKien;
  }

  xacNhanXoaSuKien() {
    if (!this.suKienCanXoa) return;
    
    const suKien = this.suKienCanXoa;
    this.eventService.deleteSuKien(suKien.maSuKien).subscribe({
      next: (response) => {
        console.log('Xóa sự kiện thành công:', response);
        this.toastService.success('Xóa sự kiện thành công!');
        this.suKienCanXoa = null;
        // Tải lại dữ liệu
        this.taiLaiDuLieu();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lỗi khi xóa sự kiện:', error);
        
        // Sử dụng normalizedMessage từ error interceptor (đã được chuẩn hóa)
        const errorMessage = (error as any).normalizedMessage || 
          (error.error && error.error.message) || 
          'Không thể xóa sự kiện. Vui lòng thử lại sau.';
        
        this.toastService.error(errorMessage);
        this.suKienCanXoa = null;
      }
    });
  }

  huyXoaSuKien() {
    this.suKienCanXoa = null;
  }

  huyBo() {
    this.dangThemMoi = false;
    this.suKienMoi = this.khoiTaoSuKienRong();
    this.suKienDangChinhSua = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [];
    this.selectedKyNangs = [];
    this.soLuongError = '';
    this.isSaving = false;
  }

  layUrlAnhSuKien(anh?: string): string {
    if (!anh) return 'public/event-default.png';
    if (anh.startsWith('http')) return anh;
    return anh;
  }
  
  getMockData(): SuKien[] {
    return [
      {
        maSuKien: 1,
        maToChuc: 101,
        tenSuKien: 'Hỗ trợ khắc phục sau lũ',
        noiDung: 'Dưới ảnh hướng của cơn bão số 11, chúng tôi kêu gọi mọi người chung tay giúp đỡ đồng bào tại các tỉnh thành như Thái Nguyên, Bắc Ninh.',
        soLuong: 10,
        diaChi: 'Hà Nội',
        ngayBatDau: new Date('2025-10-16'),
        ngayKetThuc: new Date('2025-10-20'),
        ngayTao: new Date('2025-06-01'),
        tuyenBatDau: new Date('2025-06-01'),
        tuyenKetThuc: new Date('2025-06-20'),
        trangThai: TrangThaiSuKien.DangTuyen,
        hinhAnh: 'public/tinhnguyen2.jpg'
      }
    ];
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/event-default.jpg';
    }
  }

  onRegistrationAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/default-avatar.png';
    }
  }

  getInitials(name?: string): string {
    if (!name) {
      return 'TNV';
    }

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) return 'TNV';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  onSelectLinhVucChange(values: number[]): void {
    this.selectedLinhVucs = values || [];
    this.suKienMoi.linhVucIds = [...this.selectedLinhVucs];
  }

  onSelectKyNangChange(values: number[]): void {
    this.selectedKyNangs = values || [];
    this.suKienMoi.kyNangIds = [...this.selectedKyNangs];
  }

  getSoLuongDaDangKy(suKien: SuKien | null): string | number {
    if (!suKien) return '-';
    const eventWithRegistration = suKien as any;
    return eventWithRegistration?.soLuongDaDangKy ?? '-';
  }

  getTrangThaiTuDong(): string {
    if (!this.suKienMoi.ngayBatDau || !this.suKienMoi.ngayKetThuc) {
      return 'Đang tuyển';
    }

    const now = new Date();
    const ngayBatDau = new Date(this.suKienMoi.ngayBatDau);
    const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);

    // Reset giờ để so sánh chỉ ngày
    now.setHours(0, 0, 0, 0);
    ngayBatDau.setHours(0, 0, 0, 0);
    ngayKetThuc.setHours(0, 0, 0, 0);

    if (ngayBatDau > now) {
      return 'Sắp diễn ra';
    } else if (ngayBatDau <= now && now <= ngayKetThuc) {
      return 'Đang diễn ra';
    } else if (ngayKetThuc < now) {
      return 'Kết thúc';
    }

    return 'Đang tuyển';
  }

  getTenToChuc(maToChuc: number | undefined): string | null {
    if (!maToChuc || maToChuc === -1) {
      return null;
    }
    const org = this.organizations.find(o => o.maToChuc === maToChuc);
    return org ? org.tenToChuc : null;
  }

  // Helper functions để tính min/max date cho validation
  getMinDateForNgayBatDau(): string {
    // Khi chỉnh sửa sự kiện, không giới hạn min date (cho phép giữ nguyên ngày trong quá khứ)
    if (this.suKienDangChinhSua) {
      return '';
    }
    // Khi thêm mới, min date là hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.formatDateForInput(today);
  }

  getMinDateForNgayKetThuc(): string {
    if (!this.suKienMoi.ngayBatDau) {
      return this.getMinDateForNgayBatDau();
    }
    return this.formatDateForInput(this.suKienMoi.ngayBatDau);
  }

  getMinDateForTuyenBatDau(): string {
    if (!this.suKienMoi.ngayBatDau) {
      return this.getMinDateForNgayBatDau();
    }
    return this.formatDateForInput(this.suKienMoi.ngayBatDau);
  }

  getMaxDateForTuyenBatDau(): string {
    if (!this.suKienMoi.ngayKetThuc) {
      return '';
    }
    return this.formatDateForInput(this.suKienMoi.ngayKetThuc);
  }

  getMaxDateForTuyenKetThuc(): string {
    if (!this.suKienMoi.ngayKetThuc) {
      return '';
    }
    return this.formatDateForInput(this.suKienMoi.ngayKetThuc);
  }

  getMinDateForTuyenKetThuc(): string {
    if (!this.suKienMoi.tuyenBatDau) {
      return this.getMinDateForNgayBatDau();
    }
    return this.formatDateForInput(this.suKienMoi.tuyenBatDau);
  }

  // Validation handlers khi người dùng thay đổi ngày
  onNgayBatDauChange(): void {
    // Khi ngày bắt đầu thay đổi, cập nhật min cho ngày kết thúc và ngày bắt đầu tuyển
    if (this.suKienMoi.ngayBatDau && this.suKienMoi.ngayKetThuc) {
      const ngayBatDau = new Date(this.suKienMoi.ngayBatDau);
      const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);
      ngayBatDau.setHours(0, 0, 0, 0);
      ngayKetThuc.setHours(0, 0, 0, 0);
      
      if (ngayKetThuc < ngayBatDau) {
        this.suKienMoi.ngayKetThuc = this.suKienMoi.ngayBatDau;
      }
    }
    
    if (this.suKienMoi.ngayBatDau && this.suKienMoi.tuyenBatDau) {
      const ngayBatDau = new Date(this.suKienMoi.ngayBatDau);
      const tuyenBatDau = new Date(this.suKienMoi.tuyenBatDau);
      ngayBatDau.setHours(0, 0, 0, 0);
      tuyenBatDau.setHours(0, 0, 0, 0);
      
      if (tuyenBatDau < ngayBatDau) {
        this.suKienMoi.tuyenBatDau = this.suKienMoi.ngayBatDau;
      }
    }
  }

  onNgayKetThucChange(): void {
    // Khi ngày kết thúc thay đổi, cập nhật max cho ngày bắt đầu tuyển và ngày kết thúc tuyển
    if (this.suKienMoi.ngayKetThuc) {
      const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);
      ngayKetThuc.setHours(0, 0, 0, 0);
      
      // Kiểm tra và điều chỉnh ngày bắt đầu tuyển nếu vượt quá ngày kết thúc
      if (this.suKienMoi.tuyenBatDau) {
        const tuyenBatDau = new Date(this.suKienMoi.tuyenBatDau);
        tuyenBatDau.setHours(0, 0, 0, 0);
        if (tuyenBatDau > ngayKetThuc) {
          this.suKienMoi.tuyenBatDau = this.suKienMoi.ngayKetThuc;
        }
      }
      
      // Kiểm tra và điều chỉnh ngày kết thúc tuyển nếu vượt quá ngày kết thúc
      if (this.suKienMoi.tuyenKetThuc) {
        const tuyenKetThuc = new Date(this.suKienMoi.tuyenKetThuc);
        tuyenKetThuc.setHours(0, 0, 0, 0);
        if (tuyenKetThuc > ngayKetThuc) {
          this.suKienMoi.tuyenKetThuc = this.suKienMoi.ngayKetThuc;
        }
      }
    }
  }

  onTuyenBatDauChange(): void {
    // Khi ngày bắt đầu tuyển thay đổi, kiểm tra và điều chỉnh nếu cần
    if (this.suKienMoi.tuyenBatDau) {
      const tuyenBatDau = new Date(this.suKienMoi.tuyenBatDau);
      tuyenBatDau.setHours(0, 0, 0, 0);
      
      // Kiểm tra với ngày bắt đầu
      if (this.suKienMoi.ngayBatDau) {
        const ngayBatDau = new Date(this.suKienMoi.ngayBatDau);
        ngayBatDau.setHours(0, 0, 0, 0);
        if (tuyenBatDau < ngayBatDau) {
          this.suKienMoi.tuyenBatDau = this.suKienMoi.ngayBatDau;
        }
      }
      
      // Kiểm tra với ngày kết thúc
      if (this.suKienMoi.ngayKetThuc) {
        const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);
        ngayKetThuc.setHours(0, 0, 0, 0);
        if (tuyenBatDau > ngayKetThuc) {
          this.suKienMoi.tuyenBatDau = this.suKienMoi.ngayKetThuc;
        }
      }
      
      // Cập nhật min cho ngày kết thúc tuyển
      if (this.suKienMoi.tuyenKetThuc) {
        const tuyenKetThuc = new Date(this.suKienMoi.tuyenKetThuc);
        tuyenKetThuc.setHours(0, 0, 0, 0);
        const newTuyenBatDau = new Date(this.suKienMoi.tuyenBatDau);
        newTuyenBatDau.setHours(0, 0, 0, 0);
        
        if (tuyenKetThuc < newTuyenBatDau) {
          this.suKienMoi.tuyenKetThuc = this.suKienMoi.tuyenBatDau;
        }
      }
    }
  }

  onTuyenKetThucChange(): void {
    // Khi ngày kết thúc tuyển thay đổi, kiểm tra và điều chỉnh nếu cần
    if (this.suKienMoi.tuyenKetThuc) {
      const tuyenKetThuc = new Date(this.suKienMoi.tuyenKetThuc);
      tuyenKetThuc.setHours(0, 0, 0, 0);
      
      // Kiểm tra với ngày bắt đầu tuyển
      if (this.suKienMoi.tuyenBatDau) {
        const tuyenBatDau = new Date(this.suKienMoi.tuyenBatDau);
        tuyenBatDau.setHours(0, 0, 0, 0);
        if (tuyenKetThuc < tuyenBatDau) {
          this.suKienMoi.tuyenKetThuc = this.suKienMoi.tuyenBatDau;
        }
      }
      
      // Kiểm tra với ngày kết thúc sự kiện
      if (this.suKienMoi.ngayKetThuc) {
        const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);
        ngayKetThuc.setHours(0, 0, 0, 0);
        if (tuyenKetThuc > ngayKetThuc) {
          this.suKienMoi.tuyenKetThuc = this.suKienMoi.ngayKetThuc;
        }
      }
    }
  }

  // Validation cho số lượng
  onSoLuongChange(): void {
    // Nếu giá trị là số âm hoặc 0, tự động đặt về 1
    if (this.suKienMoi.soLuong !== undefined && this.suKienMoi.soLuong !== null) {
      if (this.suKienMoi.soLuong <= 0) {
        // Không tự động sửa, chỉ hiển thị lỗi để người dùng biết
      }
    }
    this.validateSoLuong();
  }

  validateSoLuong(): void {
    if (this.suKienMoi.soLuong === undefined || this.suKienMoi.soLuong === null) {
      this.soLuongError = 'Vui lòng nhập số lượng tình nguyện viên!';
      return;
    }

    if (this.suKienMoi.soLuong < 0) {
      this.soLuongError = 'Số lượng tình nguyện viên không được là số âm!';
      return;
    }

    if (this.suKienMoi.soLuong === 0) {
      this.soLuongError = 'Số lượng tình nguyện viên phải lớn hơn 0!';
      return;
    }

    this.soLuongError = '';
  }

  // Event handlers cho shared modal
  onEventModalSaved(): void {
    this.showEventModal = false;
    this.taiLaiDuLieu();
  }

  onEventModalCancelled(): void {
    this.showEventModal = false;
  }
}