import { Component, OnDestroy, OnInit, ViewChild, AfterViewInit, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { RegistrationService } from '../../services/registration';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';
import { TinhNguyenVienService } from '../../services/volunteer';
import { EvaluationService, CreateEvaluationDto } from '../../services/evaluation.service';
import { CertificateService, IssueCertificateDto } from '../../services/certificate.service';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { VolunteerProfileViewerComponent } from '../volunteer-profile-viewer/volunteer-profile-viewer';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';
import { StarRatingComponent } from '../shared/star-rating/star-rating';
import { ToastService } from '../../services/toast.service';
import { formatDateTime, formatDateTimeForInput } from '../../utils/date-format.util';
import { TableComponent, TableColumn } from '../shared/table/table';
import { PaginationComponent } from '../shared/pagination/pagination';
import { EventFormModalComponent, EventFormData } from '../shared/event-form-modal/event-form-modal';

interface Volunteer {
  maTNV: number;
  hoTen: string;
  soDienThoai?: string;
  email: string;
  ngaySinh?: string;
  diaChi?: string;
  anhDaiDien?: string;
  trangThai?: number;  // 0: chờ duyệt, 1: đã duyệt, 2: từ chối
}

// Interface cho tổ chức
interface Organization {
  maToChuc: number;
  maTaiKhoan: number;
  tenToChuc: string;
  email: string;
  soDienThoai?: string;
  diaChi?: string;
  ngayTao?: Date;
  gioiThieu?: string;
  anhDaiDien?: string;
  trangThaiXacMinh: number; // 0: Chờ duyệt, 1: Đã duyệt, 2: Từ chối
  lyDoTuChoi?: string;
  diemTrungBinh?: number;
}

interface EventData {
  maSuKien: number;
  tenSuKien: string;
  noiDung: string;
  diaChi: string;
  ngayBatDau: Date;
  ngayKetThuc: Date;
  hinhAnh?: string;
  soLuong?: number;
  soLuongTNV?: number;
  soLuongDaDangKy?: number;
  soLuongDaDuyet?: number;
  soLuongChoDuyet?: number;
  tongSoDangKy?: number;
  gioiHanDangKy?: number;
  maToChuc: number;
  trangThai?: string;
  tuyenBatDau?: Date;
  tuyenKetThuc?: Date;
  ngayDienRaBatDau?: Date;
  ngayDienRaKetThuc?: Date;
  thoiGianKhoaHuy?: number;
  linhVucIds?: number[];
  kyNangIds?: number[];
}

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, VolunteerProfileViewerComponent, StarRatingComponent, TableComponent, PaginationComponent, EventFormModalComponent],
  templateUrl: './event-management.html',
  styleUrls: ['./event-management.css']
})
export class EventManagementComponent implements OnInit, AfterViewInit, OnDestroy {
  private statusTemplateRef?: TemplateRef<any>;
  private actionsTemplateRef?: TemplateRef<any>;
  private finishedStatusTemplateRef?: TemplateRef<any>;
  private finishedActionsTemplateRef?: TemplateRef<any>;

  @ViewChild('statusTemplate', { static: false })
  set statusTemplate(tpl: TemplateRef<any> | undefined) {
    this.statusTemplateRef = tpl || undefined;
    if (tpl) {
      this.assignActiveEventTemplates();
    }
  }

  @ViewChild('actionsTemplate', { static: false })
  set actionsTemplate(tpl: TemplateRef<any> | undefined) {
    this.actionsTemplateRef = tpl || undefined;
    if (tpl) {
      this.assignActiveEventTemplates();
    }
  }

  @ViewChild('finishedStatusTemplate', { static: false })
  set finishedStatusTemplate(tpl: TemplateRef<any> | undefined) {
    this.finishedStatusTemplateRef = tpl || undefined;
    if (tpl) {
      this.assignFinishedEventTemplates();
    }
  }

  @ViewChild('finishedActionsTemplate', { static: false })
  set finishedActionsTemplate(tpl: TemplateRef<any> | undefined) {
    this.finishedActionsTemplateRef = tpl || undefined;
    if (tpl) {
      this.assignFinishedEventTemplates();
    }
  }
  
  user?: User;
  organization?: Organization;
  isLoggedIn = false;
  username = '';
  role = '';
  isLoading = false;
  errorMessage = '';
  
  // Trạng thái xác minh tổ chức
  isVerified = false;
  isRejected = false;
  rejectionReason = '';

  selectedTab: string = 'events';
  selectedEvent?: EventData;
  
  events: EventData[] = [];
  newEvent: EventData = this.createEmptyEvent();
  isCreatingEvent = false;
  isEditingEvent = false;
  isSavingEvent = false;
  selectedFile: File | null = null;
  isClosingRecruitment: boolean = false;
  
  // Shared Event Form Modal
  showEventModal: boolean = false;
  eventFormData: EventFormData | null = null;
  
  // Table & Pagination
  activeEventsTableColumns: TableColumn[] = [];
  finishedEventsTableColumns: TableColumn[] = [];
  activeEventsCurrentPage = 1;
  activeEventsItemsPerPage = 10;
  finishedEventsCurrentPage = 1;
  finishedEventsItemsPerPage = 10;
  previewUrl: string | null = null;
  
  // Search/Filter
  searchKeyword: string = '';
  filteredActiveEvents: EventData[] = [];
  
  // Validation states - track touched fields
  touchedFields: { [key: string]: boolean } = {};
  
  // Computed properties cho danh sách sự kiện
  get activeEvents(): EventData[] {
    const allActive = this.events
      .filter(e => this.getEventStatusText(e) !== 'Sự kiện đã kết thúc' && this.getEventStatusText(e) !== 'Đã kết thúc')
      .sort((a, b) => (b.maSuKien || 0) - (a.maSuKien || 0)); // Sắp xếp mới nhất trước (theo ID giảm dần)
    
    // Apply search filter if exists
    if (this.searchKeyword && this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase().trim();
      return allActive.filter(e => 
        e.tenSuKien?.toLowerCase().includes(keyword) ||
        e.diaChi?.toLowerCase().includes(keyword) ||
        this.getEventStatusText(e)?.toLowerCase().includes(keyword)
      );
    }
    
    return allActive;
  }
  
  get finishedEvents(): EventData[] {
    return this.events
      .filter(e => this.getEventStatusText(e) === 'Sự kiện đã kết thúc' || this.getEventStatusText(e) === 'Đã kết thúc')
      .sort((a, b) => (b.maSuKien || 0) - (a.maSuKien || 0)); // Sắp xếp mới nhất trước (theo ID giảm dần)
  }
  
  // Statistics getters
  get eventsInProgress(): number {
    return this.activeEvents.filter(e => 
      this.getEventStatusText(e) === 'Đang diễn ra' || e.trangThai === 'Đang diễn ra'
    ).length;
  }
  
  get eventsUpcoming(): number {
    return this.activeEvents.filter(e => 
      this.getEventStatusText(e) === 'Sắp diễn ra' || e.trangThai === 'Sắp diễn ra'
    ).length;
  }
  
  // Cho phần cài đặt tổ chức
  orgSelectedFile: File | null = null;
  orgPreviewUrl: string | null = null;
  isSavingOrg = false;
  
  // Cho phần giấy tờ pháp lý
  selectedLegalDocs: File[] = [];
  legalDocDescription: string = '';
  legalDocs: { maGiayTo: number; tenGiayTo?: string; file?: string; moTa?: string; ngayTao?: string }[] = [];
  
  // Danh sách lĩnh vực và kỹ năng
  linhVucs: any[] = [];
  kyNangs: any[] = [];
  
  // Các lĩnh vực và kỹ năng đã chọn (sử dụng pattern dropdown với nút +)
  selectedLinhVucs: (number | null)[] = [null]; // Mặc định 1 dropdown
  selectedKyNangs: (number | null)[] = [null]; // Mặc định 1 dropdown
  
  // Text input cho lĩnh vực và kỹ năng mới
  newLinhVucText: string[] = [''];
  newKyNangText: string[] = [''];
  
  // Danh sách tình nguyện viên đăng ký cho sự kiện đã chọn
  eventVolunteers: Volunteer[] = [];
  isLoadingVolunteers = false;
  // Chứng nhận
  certificateTemplates: any[] = [];
  selectedCertificateTemplate: number | null = null;
  // Đánh giá TNV
  evalScore: number = 5;
  evalComment: string = '';
  evaluatingVolunteer: Volunteer | null = null;
  evaluatedVolunteerIds: Set<number> = new Set<number>();
  evalSubmitting: boolean = false;
  
  // Kết thúc sự kiện & Cấp chứng nhận
  isCompletingEvent: boolean = false;
  certificateSamples: any[] = [];
  selectedCertificateSample: number | null = null;
  selectedVolunteersForCert: Set<number> = new Set();
  issuedCertificates: Set<number> = new Set();
  isIssuingCertificates: boolean = false;
  confirmComplete: boolean = false;
  
  // Quản lý mẫu chứng nhận
  allCertificateSamples: any[] = [];
  newSample = {
    tenMau: '',
    moTa: '',
    isDefault: false
  };
  selectedSampleFile: File | null = null;
  isLoadingSamples: boolean = false;

  // Router subscription để theo dõi navigation
  private routerSubscription?: Subscription;

  @ViewChild(VolunteerProfileViewerComponent) volunteerProfileViewer?: VolunteerProfileViewerComponent;

  constructor(
    private router: Router, 
    private auth: AuthService,
    private eventService: EventService,
    private toChucService: ToChucService,
    private registrationService: RegistrationService,
    private skillService: SkillService,
    private fieldService: FieldService,
    private volunteerService: TinhNguyenVienService,
    private evaluationService: EvaluationService,
    private certificateService: CertificateService,
    private http: HttpClient,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Khởi tạo cấu hình bảng ngay từ đầu để Table component có dữ liệu cột
    this.initializeTableColumns();
    
    this.isLoggedIn = this.auth.isAuthenticated();
    
    // Phát hiện refresh vs navigation
    // Kiểm tra xem có phải là refresh bằng cách kiểm tra navigation type
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isPageReload = navEntries.length > 0 && navEntries[0].type === 'reload';
    
    // Hoặc kiểm tra bằng sessionStorage flag (được set khi beforeunload)
    const wasRefreshing = sessionStorage.getItem('manageOrgWasRefreshing') === 'true';
    
    if (isPageReload || wasRefreshing) {
      // Nếu là refresh (F5) -> giữ nguyên tab đã lưu
      const savedTab = localStorage.getItem('eventManagementActiveTab');
      if (savedTab && ['events', 'finished-events', 'certificate-samples', 'create-event'].includes(savedTab)) {
        this.selectedTab = savedTab;
      } else {
        this.selectedTab = 'events';
        localStorage.setItem('eventManagementActiveTab', 'events');
      }
      // Xóa flag sau khi sử dụng
      sessionStorage.removeItem('manageOrgWasRefreshing');
    } else {
      // Nếu điều hướng từ trang khác -> reset về tab mặc định
      this.selectedTab = 'events';
      localStorage.setItem('eventManagementActiveTab', 'events');
    }
    
    // Lắng nghe beforeunload để đánh dấu refresh (chỉ khi ở trang này)
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Lắng nghe router events để xóa flag khi điều hướng đi
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Nếu điều hướng ra khỏi trang manage-org, xóa flag refresh
        if (!event.url.includes('/manage-org')) {
          sessionStorage.removeItem('manageOrgWasRefreshing');
          window.removeEventListener('beforeunload', this.handleBeforeUnload);
        }
      });
    
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();

      if (this.role !== 'Organization' && this.role !== 'Admin') {
        // Redirect nếu không phải tổ chức hoặc admin
        this.router.navigate(['/home']);
        return;
      }
    }
    
    // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
    this.user = this.auth.getUser();
    if (this.user) {
      this.loadOrganizationInfo();
      this.loadSkills();
      this.loadFields();
      this.loadCertificateSamples();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngAfterViewInit(): void {
    // Gán template cho bảng sự kiện đang hoạt động
    this.assignActiveEventTemplates();
    this.assignFinishedEventTemplates();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    // Xóa event listener khi component bị destroy
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    // Hủy subscription
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Handler cho beforeunload event để phát hiện refresh
  private handleBeforeUnload = (): void => {
    // Chỉ set flag nếu đang ở trang manage-org
    if (window.location.pathname.includes('/manage-org') && !window.location.pathname.includes('/manage-org/')) {
      sessionStorage.setItem('manageOrgWasRefreshing', 'true');
    }
  }
  
  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.kyNangs = response.data || response;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải kỹ năng:', err);
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.linhVucs = response.data || response;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải lĩnh vực:', err);
      }
    });
  }

  initializeTableColumns(): void {
    // Active events table columns
    this.activeEventsTableColumns = [
      { key: 'tenSuKien', title: 'Tên sự kiện', sortable: true, width: '200px', resizable: true },
      { key: 'diaChi', title: 'Địa điểm', sortable: false, width: '150px', resizable: true },
      { 
        key: 'ngayBatDau', 
        title: 'Ngày bắt đầu', 
        sortable: true, 
        width: '140px', 
        resizable: true,
        valueGetter: (row: any) => this.formatDate(row.ngayBatDau)
      },
      { 
        key: 'ngayKetThuc', 
        title: 'Ngày kết thúc', 
        sortable: true, 
        width: '140px', 
        resizable: true,
        valueGetter: (row: any) => this.formatDate(row.ngayKetThuc)
      },
      { 
        key: 'tuyenBatDau', 
        title: 'Ngày bắt đầu tuyển', 
        sortable: true, 
        width: '160px', 
        resizable: true,
        valueGetter: (row: any) => this.formatDate(row.tuyenBatDau)
      },
      { 
        key: 'tuyenKetThuc', 
        title: 'Ngày kết thúc tuyển', 
        sortable: true, 
        width: '160px', 
        resizable: true,
        valueGetter: (row: any) => this.formatDate(row.tuyenKetThuc)
      },
      { 
        key: 'soLuong', 
        title: 'Số lượng', 
        sortable: true, 
        width: '100px', 
        align: 'center' as 'center',
        valueGetter: (row: any) => `${row.soLuongDaDuyet || 0}/${row.soLuong || 0}`
      },
      { 
        key: 'trangThai', 
        title: 'Trạng thái', 
        sortable: false, 
        width: '120px',
        template: undefined // Will be assigned in ngAfterViewInit
      },
      { 
        key: 'actions', 
        title: 'Thao tác', 
        sortable: false, 
        width: '120px',
        template: undefined // Will be assigned in ngAfterViewInit
      }
    ];

    // Finished events table columns
    this.finishedEventsTableColumns = [
      { key: 'tenSuKien', title: 'Tên sự kiện', sortable: true, width: '250px', resizable: true },
      { key: 'diaChi', title: 'Địa điểm', sortable: false, width: '200px', resizable: true },
      { 
        key: 'ngayBatDau', 
        title: 'Ngày bắt đầu', 
        sortable: true, 
        width: '140px', 
        resizable: true,
        valueGetter: (row: any) => this.formatDate(row.ngayBatDau)
      },
      { 
        key: 'ngayKetThuc', 
        title: 'Ngày kết thúc', 
        sortable: true, 
        width: '140px', 
        resizable: true,
        valueGetter: (row: any) => this.formatDate(row.ngayKetThuc)
      },
      { 
        key: 'trangThai', 
        title: 'Trạng thái', 
        sortable: false, 
        width: '120px',
        template: undefined // Will be assigned in ngAfterViewInit
      },
      { 
        key: 'actions', 
        title: 'Thao tác', 
        sortable: false, 
        width: '100px',
        template: undefined // Will be assigned in ngAfterViewInit
      }
    ];
  }

  get paginatedActiveEvents(): EventData[] {
    const start = (this.activeEventsCurrentPage - 1) * this.activeEventsItemsPerPage;
    const end = start + this.activeEventsItemsPerPage;
    return this.activeEvents.slice(start, end);
  }

  get paginatedFinishedEvents(): EventData[] {
    const start = (this.finishedEventsCurrentPage - 1) * this.finishedEventsItemsPerPage;
    const end = start + this.finishedEventsItemsPerPage;
    return this.finishedEvents.slice(start, end);
  }

  onActiveEventsPageChange(page: number): void {
    this.activeEventsCurrentPage = page;
  }

  onActiveEventsItemsPerPageChange(itemsPerPage: number): void {
    this.activeEventsItemsPerPage = itemsPerPage;
    this.activeEventsCurrentPage = 1;
  }

  onFinishedEventsPageChange(page: number): void {
    this.finishedEventsCurrentPage = page;
  }

  onFinishedEventsItemsPerPageChange(itemsPerPage: number): void {
    this.finishedEventsItemsPerPage = itemsPerPage;
    this.finishedEventsCurrentPage = 1;
  }

  loadOrganizationInfo() {
    if (!this.user?.maTaiKhoan) return;
    
    this.isLoading = true;
    this.toChucService.getOrganizationByAccountId(this.user.maTaiKhoan).subscribe({
      next: (response: any) => {
        console.log('Thông tin tổ chức:', response);
        
        // Xử lý dữ liệu tổ chức từ response
        if (response && response.data) {
          this.organization = response.data;
        } else {
          this.organization = response;
        }
        
        // Cập nhật trạng thái xác minh để hiển thị (không bắt buộc để tạo sự kiện)
        if (this.organization?.trangThaiXacMinh !== undefined) {
          this.isVerified = this.organization.trangThaiXacMinh === 1;
          this.isRejected = this.organization.trangThaiXacMinh === 2;
          this.rejectionReason = this.organization.lyDoTuChoi || '';
        }
        
        // Sau khi có thông tin tổ chức, load sự kiện của tổ chức đó
        if (this.organization?.maToChuc) {
          this.loadOrganizationEvents();
          this.loadOrganizationLegalDocs();
        } else {
          // Nếu không có thông tin tổ chức, sử dụng dữ liệu mẫu
          console.log('Không tìm thấy thông tin tổ chức, sử dụng dữ liệu mẫu');
          this.organization = {
            maToChuc: this.user?.maTaiKhoan || 999,
            maTaiKhoan: this.user?.maTaiKhoan || 999,
            tenToChuc: 'Tổ chức của ' + (this.user?.hoTen || this.username),
            email: this.user?.email || '',
            gioiThieu: 'Chưa có thông tin giới thiệu',
            diaChi: 'Chưa có địa chỉ',
            trangThaiXacMinh: 0 // Giả định chưa được duyệt
          };
          this.events = this.getMockEvents();
        }
        
        // Load dữ liệu cho tab đã lưu (nếu có)
        this.loadDataForSavedTab();
        
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải thông tin tổ chức:', err);
        this.errorMessage = 'Không thể tải thông tin tổ chức. Vui lòng thử lại sau.';
        this.isLoading = false;
        
        // Nếu gặp lỗi 404, tạo tổ chức mẫu
        if (err.status === 404) {
          console.log('Không tìm thấy tổ chức, sử dụng dữ liệu mẫu');
          this.organization = {
            maToChuc: this.user?.maTaiKhoan || 999,
            maTaiKhoan: this.user?.maTaiKhoan || 999,
            tenToChuc: 'Tổ chức của ' + (this.user?.hoTen || this.username),
            email: this.user?.email || '',
            gioiThieu: 'Chưa có thông tin giới thiệu',
            diaChi: 'Chưa có địa chỉ',
            trangThaiXacMinh: 0 // Giả định chưa được duyệt
          };
          this.isVerified = false;
          this.errorMessage = 'Bạn cần tạo hồ sơ tổ chức và chờ được xác minh trước khi có thể tạo sự kiện.';
          this.events = this.getMockEvents();
        }
      }
    });
  }

  // Tải danh sách giấy tờ pháp lý của tổ chức
  loadOrganizationLegalDocs(): void {
    if (!this.organization?.maToChuc) return;
    this.http.get<any>(`${environment.apiUrl}/GiayToPhapLy/tochuc/${this.organization.maToChuc}`).subscribe({
      next: (res) => {
        this.legalDocs = res?.data || res || [];
      },
      error: (err) => {
        console.error('Lỗi tải giấy tờ pháp lý:', err);
        this.legalDocs = [];
      }
    });
  }

  loadOrganizationEvents() {
    if (!this.organization?.maToChuc) return;
    
    this.isLoading = true;
    this.eventService.getEventsByOrganizationId(this.organization.maToChuc).subscribe({
      next: (response: any) => {
        console.log('Sự kiện của tổ chức:', response);
        
        let eventsData: any[] = [];
        if (response && response.data && Array.isArray(response.data)) {
          eventsData = response.data;
        } else if (Array.isArray(response)) {
          eventsData = response;
        } else {
          console.log('Không có dữ liệu sự kiện, sử dụng mẫu');
          this.events = this.getMockEvents();
          this.isLoading = false;
          return;
        }
        
        // Map dữ liệu từ backend sang frontend format và sắp xếp mới nhất trước
        this.events = eventsData
          .map((event: any) => ({
            ...event,
            soLuongTNV: event.soLuong || event.soLuongTNV || 1, // Map soLuong -> soLuongTNV
            diaChi: event.diaChi || '',
            maToChuc: event.maToChuc || this.organization?.maToChuc || 0
          }))
          .sort((a, b) => (b.maSuKien || 0) - (a.maSuKien || 0)); // Sắp xếp mới nhất trước

        if (this.selectedEvent) {
          const latestSelected = this.events.find(e => e.maSuKien === this.selectedEvent?.maSuKien);
          if (latestSelected) {
            this.selectedEvent = { ...this.selectedEvent, ...latestSelected };
          }
        }
        
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải sự kiện của tổ chức:', err);
        this.errorMessage = 'Không thể tải danh sách sự kiện. Vui lòng thử lại sau.';
        this.isLoading = false;
        // Sử dụng dữ liệu mẫu khi lỗi
        this.events = this.getMockEvents();
      }
    });
  }

  loadEventVolunteers(eventId: number) {
    this.isLoadingVolunteers = true;
    this.registrationService.getRegistrationsByEvent(eventId).subscribe({
      next: (response: any) => {
        console.log('Tình nguyện viên đăng ký:', response);
        
        let volunteers: Volunteer[] = [];
        if (response && response.data && Array.isArray(response.data)) {
          volunteers = response.data;
        } else if (Array.isArray(response)) {
          volunteers = response;
        } else {
          console.log('Không có tình nguyện viên đăng ký, sử dụng dữ liệu mẫu');
          this.eventVolunteers = this.getMockVolunteers();
          this.isLoadingVolunteers = false;
          return;
        }
        
        // Kiểm tra và load thông tin chi tiết nếu thiếu hoTen hoặc email
        const volunteersToLoad = volunteers.filter(v => !v.hoTen || !v.email);
        
        if (volunteersToLoad.length > 0) {
          // Load thông tin chi tiết cho các TNV thiếu thông tin
          let loadedCount = 0;
          volunteersToLoad.forEach((volunteer, index) => {
            this.volunteerService.getVolunteerById(volunteer.maTNV).subscribe({
              next: (detailResponse: any) => {
                const detail = detailResponse.data || detailResponse;
                // Cập nhật thông tin vào volunteer
                const volIndex = volunteers.findIndex(v => v.maTNV === volunteer.maTNV);
                if (volIndex !== -1) {
                  volunteers[volIndex].hoTen = detail.hoTen || volunteers[volIndex].hoTen;
                  volunteers[volIndex].email = detail.email || volunteers[volIndex].email;
                  volunteers[volIndex].soDienThoai = detail.soDienThoai || volunteers[volIndex].soDienThoai;
                  volunteers[volIndex].anhDaiDien = detail.anhDaiDien || volunteers[volIndex].anhDaiDien;
                }
                
                loadedCount++;
                if (loadedCount === volunteersToLoad.length) {
                  this.eventVolunteers = volunteers;
                  this.isLoadingVolunteers = false;
                  this.updateEventRegistrationCount(eventId, volunteers.length);
                }
              },
              error: (err) => {
                console.error(`Lỗi khi tải thông tin TNV ${volunteer.maTNV}:`, err);
                loadedCount++;
                if (loadedCount === volunteersToLoad.length) {
                  this.eventVolunteers = volunteers;
                  this.isLoadingVolunteers = false;
                  this.updateEventRegistrationCount(eventId, volunteers.length);
                }
              }
            });
          });
        } else {
          // Tất cả đã có đầy đủ thông tin
          this.eventVolunteers = volunteers;
          this.isLoadingVolunteers = false;
          this.updateEventRegistrationCount(eventId, volunteers.length);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách tình nguyện viên:', err);
        this.isLoadingVolunteers = false;
        this.eventVolunteers = this.getMockVolunteers();
        this.updateEventRegistrationCount(eventId, 0);
      }
    });
  }
  
  updateEventRegistrationCount(eventId: number, count: number): void {
    // Cập nhật soLuongDaDangKy cho selectedEvent và events list
    if (this.selectedEvent && this.selectedEvent.maSuKien === eventId) {
      this.selectedEvent.soLuongDaDangKy = count;
    }
    // Cập nhật trong danh sách events
    const eventIndex = this.events.findIndex(e => e.maSuKien === eventId);
    if (eventIndex !== -1) {
      this.events[eventIndex].soLuongDaDangKy = count;
    }
  }

  hasRegistrations(event: EventData): boolean {
    // Kiểm tra nếu event có số lượng đăng ký > 0 hoặc có eventVolunteers
    // Tạm thời check bằng cách load volunteers khi select event
    // Có thể cải thiện bằng cách thêm field soLuongDaDangKy vào EventData
    return false; // Sẽ được cập nhật khi load volunteers
  }
  
  canEditEvent(event: EventData): boolean {
    // Kiểm tra xem có thể sửa sự kiện không (không có người đăng ký)
    // Check từ soLuongDaDangKy hoặc từ eventVolunteers nếu đã load
    if (event.soLuongDaDangKy && event.soLuongDaDangKy > 0) {
      return false;
    }
    // Nếu đang xem chi tiết event này, check từ eventVolunteers
    if (this.selectedEvent?.maSuKien === event.maSuKien && this.eventVolunteers.length > 0) {
      return false;
    }
    return true;
  }

  selectEvent(event: EventData) {
    this.selectedEvent = event;
    this.selectedTab = 'event-detail';
    this.loadEventVolunteers(event.maSuKien);
    this.loadCertificateTemplates(event.maSuKien);
    this.evaluatedVolunteerIds.clear();
  }

  createEvent() {
    // Open shared modal for creating new event
    this.isEditingEvent = false;
    this.eventFormData = null;
    this.showEventModal = true;
  }

  openEventModal(): void {
    const modalEl = document.getElementById('eventFormModal');
    if ((window as any).bootstrap && modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  closeEventModal(): void {
    if (this.isSavingEvent) return;
    
    const modalEl = document.getElementById('eventFormModal');
    if ((window as any).bootstrap && modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    
    // Reset form
    this.newEvent = this.createEmptyEvent();
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [null];
    this.selectedKyNangs = [null];
    this.touchedFields = {};
    this.isCreatingEvent = false;
    this.isEditingEvent = false;
  }

  // Kết thúc sự kiện
  finishSelectedEvent() {
    if (!this.selectedEvent) return;
    if (!confirm('Kết thúc sự kiện này?')) return;
    // Sử dụng authService.getToken() để lấy token từ cả localStorage và sessionStorage
    const token = this.auth.getToken() || '';
    this.http.post(`${environment.apiUrl}/sukien/${this.selectedEvent.maSuKien}/finish`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toastService.success('Đã kết thúc sự kiện');
        if (this.selectedEvent) this.selectedEvent.trangThai = 'Đã kết thúc';
        // Reload lại danh sách sự kiện để cập nhật trạng thái
        this.loadOrganizationEvents();
      },
      error: (err) => {
        console.error('Lỗi kết thúc sự kiện:', err);
        this.toastService.error(err?.error?.message || 'Không thể kết thúc sự kiện');
      }
    });
  }

  openEvaluateVolunteer(volunteer: Volunteer): void {
    this.evaluatingVolunteer = volunteer;
    this.evalScore = 5;
    this.evalComment = '';
    const modalEl = document.getElementById('evaluateVolunteerModal');
    if ((window as any).bootstrap && modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  submitEvaluateVolunteer(): void {
    if (!this.evaluatingVolunteer || !this.selectedEvent) return;
    if (this.evaluatedVolunteerIds.has(this.evaluatingVolunteer.maTNV)) { return; }
    if (this.evalSubmitting) { return; }
    this.evalSubmitting = true;
    const maSuKien = this.selectedEvent.maSuKien;
    // Cần MaTaiKhoan của TNV để đánh giá: gọi API lấy TNV
    this.http.get<any>(`${environment.apiUrl}/tinhnguyenvien/${this.evaluatingVolunteer.maTNV}`).subscribe({
      next: (res) => {
        const tnv = res?.data || res;
        const maNguoiDuocDanhGia = tnv?.maTaiKhoan;
        if (!maNguoiDuocDanhGia) { this.toastService.error('Không xác định được tài khoản của TNV.'); return; }
        const payload = {
          maNguoiDuocDanhGia,
          maSuKien,
          diemSo: this.evalScore,
          noiDung: this.evalComment
        };
        // Sử dụng authService.getToken() để lấy token từ cả localStorage và sessionStorage
        const token = this.auth.getToken() || '';
        this.http.post<any>(`${environment.apiUrl}/danhgia`, payload, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).subscribe({
          next: (r) => {
            this.toastService.success(r?.message || 'Đánh giá thành công');
            const modalEl = document.getElementById('evaluateVolunteerModal');
            if ((window as any).bootstrap && modalEl) {
              const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
              if (modal) modal.hide();
            }
            // Đánh dấu đã đánh giá để ẩn nút
            this.evaluatedVolunteerIds.add(this.evaluatingVolunteer!.maTNV);
            this.evalSubmitting = false;
          },
          error: (err) => {
            console.error('Lỗi đánh giá TNV:', err);
            this.toastService.error(err?.error?.message || 'Không thể gửi đánh giá');
            this.evalSubmitting = false;
          }
        });
      },
      error: () => this.toastService.error('Không tải được thông tin TNV')
    });
  }

  // Tải mẫu chứng nhận theo sự kiện
  loadCertificateTemplates(maSuKien: number): void {
    // Sử dụng authService.getToken() để lấy token từ cả localStorage và sessionStorage
    const token = this.auth.getToken() || '';
    this.http.get<any>(`${environment.apiUrl}/certificate/samples/events/${maSuKien}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res) => { this.certificateTemplates = res?.data || []; },
      error: () => { this.certificateTemplates = []; }
    });
  }

  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.markFieldAsTouched('hinhAnh'); // Mark field as touched when file is selected
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      // Hiển thị preview hình ảnh
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }
  
  // Methods cho lĩnh vực (dropdown pattern)
  getAvailableLinhVucs(currentIndex: number): any[] {
    const selectedIds = this.selectedLinhVucs
      .filter((id, idx) => id !== null && idx !== currentIndex);
    return this.linhVucs.filter(lv => !selectedIds.includes(lv.maLinhVuc));
  }

  onLinhVucChange(index: number, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const value = selectElement.value;
    // Kiểm tra giá trị hợp lệ trước khi convert
    if (value && value !== '' && value !== 'null' && !isNaN(Number(value))) {
      this.selectedLinhVucs[index] = Number(value);
    } else {
      this.selectedLinhVucs[index] = null;
    }
  }

  addLinhVuc(): void {
    if (this.selectedLinhVucs.length >= 10) {
      this.toastService.warning('Bạn chỉ có thể thêm tối đa 10 lĩnh vực');
      return;
    }
    this.selectedLinhVucs.push(null);
    this.newLinhVucText.push('');
  }
  
  async createNewLinhVuc(index: number): Promise<void> {
    const text = this.newLinhVucText[index]?.trim();
    if (!text) {
      this.toastService.warning('Vui lòng nhập tên lĩnh vực');
      return;
    }
    
    // Kiểm tra xem đã tồn tại chưa
    const existing = this.linhVucs.find(lv => lv.tenLinhVuc.toLowerCase() === text.toLowerCase());
    if (existing) {
      this.selectedLinhVucs[index] = existing.maLinhVuc;
      this.newLinhVucText[index] = '';
      return;
    }
    
    try {
      const response: any = await this.fieldService.createField({ tenLinhVuc: text }).toPromise();
      const newField = response.data || response;
      this.linhVucs.push(newField);
      this.selectedLinhVucs[index] = newField.maLinhVuc;
      this.newLinhVucText[index] = '';
    } catch (error: any) {
      console.error('Lỗi khi tạo lĩnh vực mới:', error);
      this.toastService.error(error.error?.message || 'Không thể tạo lĩnh vực mới. Vui lòng thử lại.');
    }
  }

  removeLinhVuc(idx: number): void {
    this.selectedLinhVucs.splice(idx, 1);
    this.newLinhVucText.splice(idx, 1);
    // Đảm bảo luôn có ít nhất 1 dropdown
    if (this.selectedLinhVucs.length === 0) {
      this.selectedLinhVucs.push(null);
      this.newLinhVucText.push('');
    }
  }

  // Methods cho kỹ năng (dropdown pattern)
  getAvailableKyNangs(currentIndex: number): any[] {
    const selectedIds = this.selectedKyNangs
      .filter((id, idx) => id !== null && idx !== currentIndex);
    return this.kyNangs.filter(kn => !selectedIds.includes(kn.maKyNang));
  }

  onKyNangChange(index: number, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const value = selectElement.value;
    // Kiểm tra giá trị hợp lệ trước khi convert
    if (value && value !== '' && value !== 'null' && !isNaN(Number(value))) {
      this.selectedKyNangs[index] = Number(value);
    } else {
      this.selectedKyNangs[index] = null;
    }
  }

  addKyNang(): void {
    if (this.selectedKyNangs.length >= 10) {
      this.toastService.warning('Bạn chỉ có thể thêm tối đa 10 kỹ năng');
      return;
    }
    this.selectedKyNangs.push(null);
    this.newKyNangText.push('');
  }
  
  async createNewKyNang(index: number): Promise<void> {
    const text = this.newKyNangText[index]?.trim();
    if (!text) {
      this.toastService.warning('Vui lòng nhập tên kỹ năng');
      return;
    }
    
    // Kiểm tra xem đã tồn tại chưa
    const existing = this.kyNangs.find(kn => kn.tenKyNang.toLowerCase() === text.toLowerCase());
    if (existing) {
      this.selectedKyNangs[index] = existing.maKyNang;
      this.newKyNangText[index] = '';
      return;
    }
    
    try {
      const response: any = await this.skillService.createSkill({ tenKyNang: text }).toPromise();
      const newSkill = response.data || response;
      this.kyNangs.push(newSkill);
      this.selectedKyNangs[index] = newSkill.maKyNang;
      this.newKyNangText[index] = '';
    } catch (error: any) {
      console.error('Lỗi khi tạo kỹ năng mới:', error);
      this.toastService.error(error.error?.message || 'Không thể tạo kỹ năng mới. Vui lòng thử lại.');
    }
  }

  removeKyNang(idx: number): void {
    this.selectedKyNangs.splice(idx, 1);
    this.newKyNangText.splice(idx, 1);
    // Đảm bảo luôn có ít nhất 1 dropdown
    if (this.selectedKyNangs.length === 0) {
      this.selectedKyNangs.push(null);
      this.newKyNangText.push('');
    }
  }

  editEvent(event: EventData) {
    // Cho phép sửa sự kiện ngay cả khi đã có người đăng ký
    this.loadEventForEdit(event);
  }
  
  loadEventForEdit(event: EventData) {
    // Load đầy đủ dữ liệu từ API và mở shared modal
    this.eventService.getSuKienById(event.maSuKien).subscribe({
      next: (response: any) => {
        const fullEvent = response.data || response;
        
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
          soLuong: fullEvent.soLuong || fullEvent.soLuongTNV || 1,
          maToChuc: this.organization?.maToChuc || fullEvent.maToChuc,
          hinhAnh: fullEvent.hinhAnh,
          linhVucIds: Array.isArray(fullEvent.linhVucIds) && fullEvent.linhVucIds.length > 0 
            ? fullEvent.linhVucIds 
            : [],
          kyNangIds: Array.isArray(fullEvent.kyNangIds) && fullEvent.kyNangIds.length > 0 
            ? fullEvent.kyNangIds 
            : []
        };
        
        this.isEditingEvent = true;
        this.showEventModal = true;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi load chi tiết sự kiện:', err);
        this.toastService.error('Không thể tải thông tin sự kiện. Vui lòng thử lại.');
      }
    });
  }

  cancelEdit() {
    this.isCreatingEvent = false;
    this.isEditingEvent = false;
    this.isSavingEvent = false;
    this.newEvent = this.createEmptyEvent();
    this.selectedTab = 'events';
    this.touchedFields = {}; // Reset touched fields
  }

  // Mark field as touched
  markFieldAsTouched(fieldName: string) {
    this.touchedFields[fieldName] = true;
  }

  // Validation helper functions
  isFieldInvalid(fieldName: string): boolean {
    if (!this.touchedFields[fieldName]) return false;
    
    switch (fieldName) {
      case 'tenSuKien':
        return !this.newEvent.tenSuKien?.trim();
      case 'noiDung':
        return !this.newEvent.noiDung?.trim();
      case 'ngayBatDau':
        return !this.newEvent.ngayBatDau;
      case 'ngayKetThuc':
        if (!this.newEvent.ngayKetThuc) return true;
        if (this.newEvent.ngayBatDau) {
          return new Date(this.newEvent.ngayKetThuc) < new Date(this.newEvent.ngayBatDau);
        }
        return false;
      case 'tuyenBatDau':
        if (!this.newEvent.tuyenBatDau) {
          return true; // Bắt buộc phải có
        }
        // Validate tuyenBatDau phải trong khoảng ngayBatDau - ngayKetThuc
        if (this.newEvent.ngayBatDau && this.newEvent.ngayKetThuc) {
          const tuyenBatDau = new Date(this.newEvent.tuyenBatDau);
          const ngayBatDau = new Date(this.newEvent.ngayBatDau);
          const ngayKetThuc = new Date(this.newEvent.ngayKetThuc);
          return tuyenBatDau < ngayBatDau || tuyenBatDau > ngayKetThuc;
        }
        return false;
      case 'tuyenKetThuc':
        if (!this.newEvent.tuyenKetThuc) {
          return true; // Bắt buộc phải có
        }
        if (this.newEvent.tuyenBatDau) {
          const tuyenKetThuc = new Date(this.newEvent.tuyenKetThuc);
          const tuyenBatDau = new Date(this.newEvent.tuyenBatDau);
          if (tuyenKetThuc < tuyenBatDau) return true;
        }
        // Validate tuyenKetThuc phải trong khoảng ngayBatDau - ngayKetThuc
        if (this.newEvent.ngayBatDau && this.newEvent.ngayKetThuc) {
          const tuyenKetThuc = new Date(this.newEvent.tuyenKetThuc);
          const ngayBatDau = new Date(this.newEvent.ngayBatDau);
          const ngayKetThuc = new Date(this.newEvent.ngayKetThuc);
          return tuyenKetThuc < ngayBatDau || tuyenKetThuc > ngayKetThuc;
        }
        return false;
      case 'diaChi':
        return !this.newEvent.diaChi?.trim();
      case 'soLuongTNV':
        return this.newEvent.soLuongTNV === undefined || this.newEvent.soLuongTNV === null;
      case 'hinhAnh':
        return !this.selectedFile && !this.newEvent.hinhAnh;
      case 'linhVucIds':
        return !this.selectedLinhVucs || this.selectedLinhVucs.length === 0 || this.selectedLinhVucs.every(id => id === null);
      case 'kyNangIds':
        return !this.selectedKyNangs || this.selectedKyNangs.length === 0 || this.selectedKyNangs.every(id => id === null);
      default:
        return false;
    }
  }

  getFieldErrorMessage(fieldName: string): string {
    if (!this.isFieldInvalid(fieldName)) return '';
    
    switch (fieldName) {
      case 'tenSuKien':
        return 'Vui lòng nhập tên sự kiện!';
      case 'noiDung':
        return 'Vui lòng nhập mô tả sự kiện!';
      case 'ngayBatDau':
        return 'Vui lòng chọn ngày bắt đầu!';
      case 'ngayKetThuc':
        if (!this.newEvent.ngayKetThuc) return 'Vui lòng chọn ngày kết thúc!';
        return 'Ngày kết thúc phải sau ngày bắt đầu!';
      case 'tuyenBatDau':
        if (!this.newEvent.tuyenBatDau) return 'Vui lòng chọn ngày bắt đầu tuyển!';
        return 'Ngày bắt đầu tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!';
      case 'tuyenKetThuc':
        if (!this.newEvent.tuyenKetThuc) return 'Vui lòng chọn ngày kết thúc tuyển!';
        if (this.newEvent.tuyenBatDau && new Date(this.newEvent.tuyenKetThuc) < new Date(this.newEvent.tuyenBatDau)) {
          return 'Ngày kết thúc tuyển phải sau ngày bắt đầu tuyển!';
        }
        return 'Ngày kết thúc tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!';
      case 'diaChi':
        return 'Vui lòng nhập địa điểm!';
      case 'soLuongTNV':
        return 'Vui lòng nhập số lượng tình nguyện viên!';
      case 'hinhAnh':
        return 'Vui lòng chọn hình ảnh cho sự kiện!';
      case 'linhVucIds':
        return 'Vui lòng chọn ít nhất 1 lĩnh vực!';
      case 'kyNangIds':
        return 'Vui lòng chọn ít nhất 1 kỹ năng!';
      case 'ngayDienRaBatDau':
        return 'Ngày bắt đầu diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!';
      case 'ngayDienRaKetThuc':
        if (this.newEvent.ngayDienRaBatDau && this.newEvent.ngayDienRaKetThuc) {
          const start = new Date(this.newEvent.ngayDienRaBatDau);
          const end = new Date(this.newEvent.ngayDienRaKetThuc);
          if (end < start) {
            return 'Ngày kết thúc diễn ra phải sau hoặc bằng ngày bắt đầu diễn ra!';
          }
        }
        return 'Ngày kết thúc diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!';
      case 'thoiGianKhoaHuy':
        if (this.newEvent.thoiGianKhoaHuy !== null && this.newEvent.thoiGianKhoaHuy !== undefined) {
          if (this.newEvent.thoiGianKhoaHuy < 0) {
            return 'Thời gian khóa hủy không được âm!';
          }
          if (this.newEvent.thoiGianKhoaHuy > 168) {
            return 'Thời gian khóa hủy không được vượt quá 168 giờ (7 ngày)!';
          }
        }
        return '';
      default:
        return '';
    }
  }

  saveEvent() {
    if (this.isSavingEvent) {
      return;
    }

    // Thêm lĩnh vực và kỹ năng vào dữ liệu (filter null, undefined, và NaN values)
    const linhVucIds = this.selectedLinhVucs
      .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
      .map(id => Number(id)) as number[];
    const kyNangIds = this.selectedKyNangs
      .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
      .map(id => Number(id)) as number[];
    
    console.log('Lĩnh vực đã chọn:', this.selectedLinhVucs);
    console.log('Kỹ năng đã chọn:', this.selectedKyNangs);
    console.log('Lĩnh vực đã lọc:', linhVucIds);
    console.log('Kỹ năng đã lọc:', kyNangIds);
    
    // Chuẩn bị dữ liệu để gửi lên backend (map soLuongTNV -> soLuong)
    // QUAN TRỌNG: Luôn gửi mảng (không phải undefined) để backend có thể xử lý
    const eventDataToSend: any = {
      ...this.newEvent,
      soLuong: this.newEvent.soLuongTNV, // Map soLuongTNV -> soLuong cho backend
      maToChuc: this.newEvent.maToChuc || this.organization?.maToChuc || 0,
      hinhAnh: this.newEvent.hinhAnh || '', // Đảm bảo hinhAnh được gửi
      linhVucIds: linhVucIds, // Luôn gửi mảng (có thể rỗng)
      kyNangIds: kyNangIds // Luôn gửi mảng (có thể rỗng)
    };
    
    console.log('Dữ liệu sự kiện để gửi:', eventDataToSend);
    console.log('LinhVucIds để gửi:', eventDataToSend.linhVucIds, 'Độ dài:', eventDataToSend.linhVucIds?.length);
    console.log('KyNangIds để gửi:', eventDataToSend.kyNangIds, 'Độ dài:', eventDataToSend.kyNangIds?.length);
    
    // Validation ngày tháng
    if (!this.newEvent.ngayBatDau) {
      this.toastService.warning('Vui lòng nhập ngày bắt đầu sự kiện');
      return;
    }
    
    if (!this.newEvent.ngayKetThuc) {
      this.toastService.warning('Vui lòng nhập ngày kết thúc sự kiện');
      return;
    }
    
    const ngayBatDau = new Date(this.newEvent.ngayBatDau);
    const ngayKetThuc = new Date(this.newEvent.ngayKetThuc);
    
    if (ngayBatDau > ngayKetThuc) {
      this.toastService.warning('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      return;
    }
    
    // Validation ngày tuyển phải nằm trong khoảng ngày sự kiện
    if (this.newEvent.tuyenBatDau || this.newEvent.tuyenKetThuc) {
      if (!this.newEvent.tuyenBatDau) {
        this.toastService.warning('Vui lòng nhập ngày bắt đầu tuyển nếu có ngày kết thúc tuyển');
        return;
      }
      
      if (!this.newEvent.tuyenKetThuc) {
        this.toastService.warning('Vui lòng nhập ngày kết thúc tuyển nếu có ngày bắt đầu tuyển');
        return;
      }
      
      const tuyenBatDau = new Date(this.newEvent.tuyenBatDau);
      const tuyenKetThuc = new Date(this.newEvent.tuyenKetThuc);
      
      if (tuyenBatDau > tuyenKetThuc) {
        this.toastService.warning('Ngày bắt đầu tuyển phải nhỏ hơn hoặc bằng ngày kết thúc tuyển');
        return;
      }
      
      if (tuyenBatDau < ngayBatDau || tuyenBatDau > ngayKetThuc) {
        this.toastService.warning('Ngày bắt đầu tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện');
        return;
      }
      
      if (tuyenKetThuc < ngayBatDau || tuyenKetThuc > ngayKetThuc) {
        this.toastService.warning('Ngày kết thúc tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện');
        return;
      }
    }
    
    // Validation cho 3 field mới: ngayDienRaBatDau, ngayDienRaKetThuc, thoiGianKhoaHuy
    if (this.newEvent.ngayDienRaBatDau) {
      const ngayDienRaBatDau = new Date(this.newEvent.ngayDienRaBatDau);
      
      // Ngày diễn ra phải nằm trong khoảng ngày bắt đầu và ngày kết thúc
      if (ngayDienRaBatDau < ngayBatDau || ngayDienRaBatDau > ngayKetThuc) {
        this.toastService.warning('Ngày bắt đầu diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!');
        return;
      }
    }

    if (this.newEvent.ngayDienRaKetThuc) {
      const ngayDienRaKetThuc = new Date(this.newEvent.ngayDienRaKetThuc);
      
      // Ngày kết thúc diễn ra phải nằm trong khoảng ngày bắt đầu và ngày kết thúc
      if (ngayDienRaKetThuc < ngayBatDau || ngayDienRaKetThuc > ngayKetThuc) {
        this.toastService.warning('Ngày kết thúc diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện!');
        return;
      }
      
      // Nếu có ngayDienRaBatDau, kiểm tra ngayDienRaKetThuc phải sau hoặc bằng ngayDienRaBatDau
      if (this.newEvent.ngayDienRaBatDau) {
        const ngayDienRaBatDau = new Date(this.newEvent.ngayDienRaBatDau);
        
        if (ngayDienRaKetThuc < ngayDienRaBatDau) {
          this.toastService.warning('Ngày kết thúc diễn ra phải sau hoặc bằng ngày bắt đầu diễn ra!');
          return;
        }
      }
    }

    // Validate thời gian khóa hủy (phải >= 0 và <= 168)
    if (this.newEvent.thoiGianKhoaHuy !== null && this.newEvent.thoiGianKhoaHuy !== undefined) {
      if (this.newEvent.thoiGianKhoaHuy < 0) {
        this.toastService.warning('Thời gian khóa hủy đăng ký không được âm!');
        return;
      }
      if (this.newEvent.thoiGianKhoaHuy > 168) {
        this.toastService.warning('Thời gian khóa hủy đăng ký không được vượt quá 168 giờ (7 ngày)!');
        return;
      }
    }
    
    if (this.isEditingEvent) {
      this.isSavingEvent = true;
      // Cập nhật sự kiện
      this.eventService.updateSuKien(this.newEvent.maSuKien, eventDataToSend, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Cập nhật sự kiện thành công:', response);
          // Cập nhật lại danh sách sự kiện
          const resultData = response.data || response;
          const index = this.events.findIndex(e => e.maSuKien === this.newEvent.maSuKien);
          if (index !== -1) {
            this.events[index] = resultData;
          }
          this.isEditingEvent = false;
          this.isSavingEvent = false;
          this.closeEventModal();
          this.loadOrganizationEvents(); // Reload event list
          this.toastService.success('Cập nhật sự kiện thành công!');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Lỗi khi cập nhật sự kiện:', err);
          this.toastService.error(err.error?.message || 'Không thể cập nhật sự kiện. Vui lòng thử lại sau.');
          this.isSavingEvent = false;
          // Không reset isEditingEvent khi có lỗi để giữ nguyên trạng thái form
        }
      });
    } else {
      this.isSavingEvent = true;
      // Tạo sự kiện mới
      this.eventService.createSuKien(eventDataToSend, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Tạo sự kiện thành công:', response);
          // Thêm sự kiện mới vào đầu danh sách (mới nhất lên đầu)
          const resultData = response.data || response;
          this.events.unshift(resultData);
          this.isSavingEvent = false;
          this.isCreatingEvent = false;
          this.closeEventModal();
          this.loadOrganizationEvents(); // Reload event list
          this.toastService.success('Tạo sự kiện thành công!');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Lỗi khi tạo sự kiện:', err);
          this.toastService.error(err.error?.message || 'Không thể tạo sự kiện. Vui lòng thử lại sau.');
          this.isSavingEvent = false;
          this.isCreatingEvent = false;
        }
      });
    }
  }

  deleteEvent(event: EventData) {
    if (confirm(`Bạn có chắc chắn muốn xóa sự kiện "${event.tenSuKien}"?`)) {
      this.eventService.deleteSuKien(event.maSuKien).subscribe({
        next: (response) => {
          console.log('Xóa sự kiện thành công:', response);
          this.events = this.events.filter(e => e.maSuKien !== event.maSuKien);
          if (this.selectedEvent?.maSuKien === event.maSuKien) {
            this.selectedEvent = undefined;
            this.selectedTab = 'events';
          }
          this.toastService.success('Xóa sự kiện thành công!');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Lỗi khi xóa sự kiện:', err);
          this.toastService.error(err.error?.message || 'Không thể xóa sự kiện. Vui lòng thử lại sau.');
          this.loadOrganizationEvents();
        }
      });
    }
  }
  
  // Phương thức điều hướng đến trang cài đặt tổ chức
  navigateToOrgSettings() {
    // Navigate to organization profile page instead of settings tab
    this.router.navigate(['/org-profile']);
  }
  
  // Xử lý khi chọn giấy tờ pháp lý
  onLegalDocSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedLegalDocs = Array.from(input.files);
      console.log('Đã chọn', this.selectedLegalDocs.length, 'giấy tờ pháp lý');
    }
  }
  
  // Format kích thước file để hiển thị
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Tải lên giấy tờ pháp lý
  uploadLegalDocuments() {
    if (!this.organization?.maToChuc || this.selectedLegalDocs.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một tệp để tải lên');
      return;
    }
    
    const formData = new FormData();
    formData.append('maToChuc', this.organization.maToChuc.toString());
    formData.append('TenGiayTo', 'Giấy tờ pháp lý tổ chức'); // Sửa tên property để match với DTO
    
    if (this.legalDocDescription) {
      formData.append('moTa', this.legalDocDescription);
    }
    
    // Thêm nhiều file vào formData
    this.selectedLegalDocs.forEach(file => {
      formData.append('Files', file); // Sửa tên property để match với DTO
    });
    
    // Gọi API để tải lên giấy tờ
    this.isLoading = true;
    
    // Giả định có một phương thức uploadLegalDocuments trong service
    // Nếu không có, cần thêm vào ToChucService
    this.http.post(`${environment.apiUrl}/GiayToPhapLy/upload`, formData).subscribe({
      next: (response: any) => {
        console.log('Tải lên giấy tờ thành công:', response);
        this.isLoading = false;
        this.selectedLegalDocs = [];
        this.legalDocDescription = '';
        this.toastService.success('Tải lên giấy tờ pháp lý thành công!');
        
        // Cập nhật lại thông tin tổ chức để lấy trạng thái xác minh mới
        this.loadOrganizationInfo();
        this.loadOrganizationLegalDocs();
      },
      error: (err: any) => {
        console.error('Lỗi khi tải lên giấy tờ:', err);
        this.isLoading = false;
        this.toastService.error(err.error?.message || 'Không thể tải lên giấy tờ. Vui lòng thử lại sau.');
      }
    });
  }

  // Xóa một giấy tờ pháp lý
  deleteLegalDocument(maGiayTo: number): void {
    if (!confirm('Bạn có chắc muốn xóa giấy tờ này?')) return;
    this.http.delete<any>(`${environment.apiUrl}/GiayToPhapLy/${maGiayTo}`).subscribe({
      next: () => {
        this.legalDocs = this.legalDocs.filter(d => d.maGiayTo !== maGiayTo);
        this.toastService.success('Đã xóa giấy tờ thành công');
      },
      error: (err) => {
        console.error('Lỗi xóa giấy tờ:', err);
        this.toastService.error(err?.error?.message || 'Không thể xóa giấy tờ.');
      }
    });
  }
  
  // Xử lý khi chọn ảnh đại diện cho tổ chức
  onOrgImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.orgSelectedFile = input.files[0];
      
      // Tạo preview cho ảnh
      const reader = new FileReader();
      reader.onload = () => {
        this.orgPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.orgSelectedFile);
    }
  }
  
  // Lưu thông tin cài đặt tổ chức
  saveOrganizationSettings() {
    if (!this.organization) return;
    
    this.isSavingOrg = true;
    this.errorMessage = '';
    
    // Tạo FormData để gửi thông tin tổ chức và ảnh đại diện
    const formData = new FormData();
    formData.append('maToChuc', this.organization.maToChuc.toString());
    formData.append('tenToChuc', this.organization.tenToChuc);
    formData.append('email', this.organization.email);
    
    if (this.organization.soDienThoai) {
      formData.append('soDienThoai', this.organization.soDienThoai);
    }
    
    if (this.organization.diaChi) {
      formData.append('diaChi', this.organization.diaChi);
    }
    
    if (this.organization.gioiThieu) {
      formData.append('gioiThieu', this.organization.gioiThieu);
    }
    
    // Thêm file ảnh nếu có
    if (this.orgSelectedFile) {
      formData.append('anhDaiDien', this.orgSelectedFile);
    }
    
    // Gọi API cập nhật thông tin tổ chức
    this.toChucService.updateToChuc(this.organization.maToChuc, formData).subscribe({
      next: (response: any) => {
        console.log('Cập nhật tổ chức thành công:', response);
        this.isSavingOrg = false;
        
        // Cập nhật thông tin tổ chức trong component
        if (response && response.data) {
          this.organization = response.data;
        } else if (response) {
          this.organization = response;
        }
        
        // Hiển thị thông báo thành công
        this.toastService.success('Cập nhật thông tin tổ chức thành công!');
        
        // Reset file đã chọn
        this.orgSelectedFile = null;
      },
      error: (err: any) => {
        console.error('Lỗi khi cập nhật tổ chức:', err);
        this.isSavingOrg = false;
        this.errorMessage = 'Không thể cập nhật thông tin tổ chức. Vui lòng thử lại sau.';
        
        if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
        }
        
        this.toastService.error(this.errorMessage);
      }
    });
  }

  approveVolunteer(volunteer: Volunteer) {
    if (!this.selectedEvent) return;
    
    // Kiểm tra số lượng trước khi duyệt
    const soLuongDaDuyet = this.selectedEvent?.soLuongDaDuyet || 0;
    const soLuong = this.selectedEvent?.soLuong || 0;
    
    let confirmMessage = 'Xác nhận duyệt tình nguyện viên này?';
    
    // Cảnh báo nếu sắp đủ số lượng
    if (soLuong > 0) {
      const soLuongConLai = soLuong - soLuongDaDuyet;
      if (soLuongConLai === 1) {
        confirmMessage = `⚠️ CẢNH BÁO: Đây là tình nguyện viên cuối cùng!\n\nSố lượng hiện tại: ${soLuongDaDuyet}/${soLuong}\nSau khi duyệt sẽ đủ số lượng tuyển.\n\nXác nhận duyệt?`;
      } else if (soLuongConLai <= 3) {
        confirmMessage = `⚠️ Chú ý: Còn ${soLuongConLai} vị trí trống\n\nSố lượng hiện tại: ${soLuongDaDuyet}/${soLuong}\n\nXác nhận duyệt?`;
      }
    }
    
    if (!confirm(confirmMessage)) return;
    
    const data = {
      trangThai: 1, // Đã duyệt
      ghiChu: 'Đã duyệt bởi BTC'
    };
    
    // Lưu maSuKien vào biến local để tránh lỗi TypeScript
    const maSuKien = this.selectedEvent.maSuKien;
    
    this.registrationService.updateRegistrationStatus(volunteer.maTNV, maSuKien, data).subscribe({
      next: (response) => {
        console.log('Duyệt TNV thành công:', response);
        
        // Reload lại danh sách từ API để đảm bảo dữ liệu đồng bộ
        this.loadEventVolunteers(maSuKien);
        
        this.toastService.success('Đã duyệt tình nguyện viên thành công!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi duyệt TNV:', err);
        // Hiển thị thông báo lỗi chi tiết từ backend
        const errorMessage = err.error?.message || 'Không thể duyệt tình nguyện viên. Vui lòng thử lại sau.';
        this.toastService.error(errorMessage);
        
        // Không cập nhật trạng thái local khi có lỗi
      }
    });
  }

  rejectVolunteer(volunteer: Volunteer) {
    if (!this.selectedEvent) return;

    if (this.isSelectedEventFinished()) {
      this.toastService.warning('Sự kiện đã kết thúc, không thể từ chối thêm tình nguyện viên.');
      return;
    }
    
    // Hiển thị popup xác nhận
    const confirmed = confirm(`Bạn có chắc chắn muốn từ chối ${volunteer.hoTen} tham gia sự kiện "${this.selectedEvent.tenSuKien}"?`);
    if (!confirmed) return;
    
    const data = {
      trangThai: 2, // Từ chối
      ghiChu: 'Đã từ chối bởi BTC'
    };
    
    // Lưu maSuKien vào biến local để tránh lỗi TypeScript
    const maSuKien = this.selectedEvent.maSuKien;
    
    // Lưu trạng thái cũ để cập nhật số lượng
    const oldStatus = volunteer.trangThai;
    
    this.registrationService.updateRegistrationStatus(volunteer.maTNV, maSuKien, data).subscribe({
      next: (response) => {
        console.log('Từ chối TNV thành công:', response);
        
        // Reload lại danh sách từ API để đảm bảo dữ liệu đồng bộ
        this.loadEventVolunteers(maSuKien);
        
        this.toastService.success('Đã từ chối tình nguyện viên!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi từ chối TNV:', err);
        this.toastService.error('Không thể từ chối tình nguyện viên. Vui lòng thử lại sau.');
        
        // Cập nhật trạng thái trong danh sách local nếu API lỗi
        const index = this.eventVolunteers.findIndex(v => v.maTNV === volunteer.maTNV);
        if (index !== -1) {
          this.eventVolunteers[index].trangThai = 2;
        }
      }
    });
  }

  inviteVolunteer(volunteer: Volunteer) {
    if (!this.selectedEvent) return;
    
    // Sử dụng authService.getToken() để lấy token từ cả localStorage và sessionStorage
    const token = this.auth.getToken() || '';
    this.http.post(`${environment.apiUrl}/sukien/${this.selectedEvent.maSuKien}/invite/${volunteer.maTNV}`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.toastService.success('Đã gửi lời mời tới tình nguyện viên!');
      },
      error: (err) => {
        console.error('Lỗi khi mời TNV:', err);
        this.toastService.error(err?.error?.message || 'Không thể gửi lời mời. Vui lòng thử lại sau.');
      }
    });
  }

  backToEvents() {
    this.selectedEvent = undefined;
    this.selectedTab = 'events';
  }

  viewVolunteerProfile(volunteer: Volunteer): void {
    if (this.volunteerProfileViewer) {
      this.volunteerProfileViewer.open(volunteer.maTNV, volunteer);
    }
  }

  private isSelectedEventFinished(): boolean {
    if (!this.selectedEvent) {
      return false;
    }

    if (this.selectedEvent.ngayKetThuc) {
      const eventEnd = new Date(this.selectedEvent.ngayKetThuc);
      const now = new Date();
      return eventEnd < now;
    }

    const status = (this.selectedEvent as any).trangThaiSuKien || this.selectedEvent.trangThai;
    return typeof status === 'string' && status.toLowerCase().includes('kết thúc');
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    
    // Lưu tab vào localStorage (không lưu tab động như 'event-detail')
    if (tab !== 'event-detail') {
      localStorage.setItem('eventManagementActiveTab', tab);
    }
    
    // Load dữ liệu cho tab tương ứng
    this.loadDataForTab(tab);
    if (tab === 'events') {
      this.assignActiveEventTemplates();
    }
    if (tab === 'finished-events') {
      this.assignFinishedEventTemplates();
    }
  }
  
  // Load dữ liệu cho tab đã lưu từ localStorage
  loadDataForSavedTab(): void {
    const savedTab = localStorage.getItem('eventManagementActiveTab');
    // Không load tab động như 'event-detail'
    if (savedTab && ['events', 'finished-events', 'certificate-samples', 'create-event'].includes(savedTab)) {
      this.loadDataForTab(savedTab);
    }
  }
  
  // Load dữ liệu cho tab cụ thể (không thay đổi selectedTab)
  loadDataForTab(tab: string): void {
    if (tab === 'certificate-samples') {
      this.loadCertificateSamples();
    }
    // Tab 'events' và 'finished-events' đã được load trong loadOrganizationInfo -> loadOrganizationEvents()
    // (Dữ liệu được filter qua getter activeEvents và finishedEvents)
    // Tab 'create-event' không cần load dữ liệu (form tạo mới)
    // Tab 'event-detail' được set khi xem chi tiết sự kiện
  }

  getEventStatusText(event: any): string {
    // Ưu tiên sử dụng trangThaiHienThi từ backend nếu có
    if (event?.trangThaiHienThi) {
      return event.trangThaiHienThi;
    }
    
    // Fallback: tính toán dựa trên ngày và trạng thái trong DB
    if (event?.trangThai === 'Đã kết thúc' || event?.trangThai === 'Sự kiện đã kết thúc') {
      return 'Sự kiện đã kết thúc';
    }
    
    // Tính toán dựa trên ngày
    if (event?.ngayBatDau && event?.ngayKetThuc) {
      const now = new Date();
      const start = new Date(event.ngayBatDau);
      const end = new Date(event.ngayKetThuc);
      
      if (end < now) return 'Sự kiện đã kết thúc';
      if (start > now) return 'Sắp diễn ra';
      if (start <= now && now <= end) return 'Đang diễn ra';
    }
    
    return 'Đang tuyển';
  }
  
  getEventStatusClass(status: number | string | undefined): string {
    if (typeof status === 'string') {
      switch (status) {
        case 'Sự kiện đã kết thúc':
        case 'Đã kết thúc':
        case 'Kết thúc':
          return 'bg-secondary';
        case 'Đang diễn ra':
          return 'bg-success'; // Màu xanh lá cho sự kiện đang diễn ra
        case 'Sắp diễn ra':
          return 'bg-info';
        case 'Đang tuyển':
          return 'bg-warning';
        case 'Đã hủy':
        case 'Hủy bỏ':
          return 'bg-danger';
        case 'Đã duyệt':
          return 'bg-success';
        default:
          return 'bg-secondary';
      }
    }
    if (typeof status === 'number') {
      switch (status) {
        case 0: return 'bg-warning'; // Đang tuyển
        case 1: return 'bg-success'; // Đã duyệt
        case 2: return 'bg-danger'; // Đã hủy
        case 3: return 'bg-info'; // Đã kết thúc
        default: return 'bg-secondary';
      }
    }
    return 'bg-secondary';
  }

  getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã duyệt';
      case 2: return 'Từ chối';
      default: return 'Không xác định';
    }
  }

  getStatusClass(status?: number): string {
    switch (status) {
      case 0: return 'status-pending';
      case 1: return 'status-approved';
      case 2: return 'status-rejected';
      default: return 'status-pending';
    }
  }

  formatDate(date?: Date | string): string {
    // Sử dụng utility function thống nhất
    return formatDateTime(date);
  }

  // Format datetime for input type="datetime-local" (yyyy-MM-ddTHH:mm)
  formatDateForInput(dateValue: any): string {
    // Sử dụng utility function thống nhất
    return formatDateTimeForInput(dateValue);
  }
  
  formatDateForInputOld(dateValue: any): string {
    if (!dateValue) return '';
    try {
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      if (typeof dateValue === 'string') {
        const ddMMyyyyMatch = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (ddMMyyyyMatch) {
          const [, day, month, year] = ddMMyyyyMatch;
          return `${year}-${month}-${day}`;
        }
        const dateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          return dateMatch[1];
        }
      }
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  createEmptyEvent(): EventData {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
      maSuKien: 0,
      tenSuKien: '',
      noiDung: '',
      diaChi: '',
      ngayBatDau: tomorrow,
      ngayKetThuc: nextWeek, // Mặc định 1 tuần
      tuyenBatDau: today,
      tuyenKetThuc: tomorrow, // Mặc định tuyển 1 ngày
      soLuongTNV: 1,
      maToChuc: this.organization?.maToChuc || 0,
      trangThai: 'Đang tuyển',
      linhVucIds: [],
      kyNangIds: []
    };
  }

  // Kết thúc sự kiện
  openCompleteEventModal(event: EventData): void {
    this.selectedEvent = event;
    this.loadEventVolunteers(event.maSuKien);
    this.loadCertificateSamples();
    
    const modalEl = document.getElementById('completeEventModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  loadCertificateSamples(): void {
    this.isLoadingSamples = true;
    this.certificateService.getCertificateSamples().subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.certificateSamples = data;
        this.allCertificateSamples = data;
        
        // Chọn mẫu mặc định nếu có
        const defaultSample = data.find((s: any) => s.isDefault);
        if (defaultSample) {
          this.selectedCertificateSample = defaultSample.maMau;
        } else if (data.length > 0) {
          this.selectedCertificateSample = data[0].maMau;
        }
        
        this.isLoadingSamples = false;
      },
      error: (err) => {
        console.error('Lỗi tải mẫu chứng nhận:', err);
        this.isLoadingSamples = false;
      }
    });
  }

  canCompleteEvent(event: EventData): boolean {
    if (!event.ngayKetThuc) return false;
    const endDate = new Date(event.ngayKetThuc);
    return endDate < new Date();
  }

  getApprovedVolunteersCount(): number {
    return this.eventVolunteers.filter(v => v.trangThai === 1).length;
  }

  completeEvent(): void {
    if (!this.selectedEvent) return;
    
    this.isCompletingEvent = true;
    
    // Đánh dấu sự kiện hoàn thành (cập nhật trạng thái)
    this.http.post(`${environment.apiUrl}/sukien/${this.selectedEvent.maSuKien}/finish`, {}).subscribe({
      next: () => {
        this.toastService.success('Sự kiện đã được đánh dấu hoàn thành!');
        this.isCompletingEvent = false;
        
        // Cập nhật trạng thái local
        if (this.selectedEvent) {
          this.selectedEvent.trangThai = 'Đã kết thúc';
        }
        
        // Reload lại danh sách sự kiện để cập nhật trạng thái
        this.loadOrganizationEvents();
        
        // Đóng modal complete và mở modal cấp chứng nhận
        const completeModalEl = document.getElementById('completeEventModal');
        if (completeModalEl && (window as any).bootstrap) {
          const modal = (window as any).bootstrap.Modal.getInstance(completeModalEl);
          if (modal) modal.hide();
        }
        
        // Mở modal cấp chứng nhận
        this.openIssueCertificatesModal();
      },
      error: (err) => {
        console.error('Lỗi kết thúc sự kiện:', err);
        this.isCompletingEvent = false;
        this.toastService.error(err.normalizedMessage || 'Không thể kết thúc sự kiện');
      }
    });
  }

  // Cấp chứng nhận
  openIssueCertificatesModal(): void {
    // Tự động chọn tất cả TNV đã được duyệt
    this.selectedVolunteersForCert.clear();
    this.eventVolunteers.forEach(v => {
      if (v.trangThai === 1) {
        this.selectedVolunteersForCert.add(v.maTNV);
      }
    });
    
    const modalEl = document.getElementById('issueCertificatesModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  toggleVolunteerSelection(volunteerId: number): void {
    if (this.selectedVolunteersForCert.has(volunteerId)) {
      this.selectedVolunteersForCert.delete(volunteerId);
    } else {
      this.selectedVolunteersForCert.add(volunteerId);
    }
  }

  selectAllVolunteers(): void {
    this.eventVolunteers.forEach(v => {
      if (v.trangThai === 1) {
        this.selectedVolunteersForCert.add(v.maTNV);
      }
    });
  }

  deselectAllVolunteers(): void {
    this.selectedVolunteersForCert.clear();
  }

  issueCertificatesBulk(): void {
    if (!this.selectedEvent || !this.selectedCertificateSample) {
      this.toastService.warning('Vui lòng chọn mẫu chứng nhận');
      return;
    }

    if (this.selectedVolunteersForCert.size === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất một tình nguyện viên');
      return;
    }

    if (!confirm(`Xác nhận cấp chứng nhận cho ${this.selectedVolunteersForCert.size} tình nguyện viên?`)) {
      return;
    }

    this.isIssuingCertificates = true;

    // Sử dụng API bulk nếu cấp cho tất cả TNV đã duyệt
    const approvedCount = this.eventVolunteers.filter(v => v.trangThai === 1).length;
    
    if (this.selectedVolunteersForCert.size === approvedCount) {
      // Cấp hàng loạt
      this.certificateService.issueAllCertificates(
        this.selectedEvent.maSuKien,
        this.selectedCertificateSample
      ).subscribe({
        next: (response: any) => {
          this.toastService.success(`Đã cấp thành công ${response.data?.length || 0} chứng nhận!`);
          this.isIssuingCertificates = false;
          
          // Đóng modal
          const modalEl = document.getElementById('issueCertificatesModal');
          if (modalEl && (window as any).bootstrap) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
          
          // Reload danh sách
          this.loadOrganizationEvents();
        },
        error: (err: any) => {
          console.error('Lỗi cấp chứng nhận:', err);
          this.isIssuingCertificates = false;
          this.toastService.error(err.normalizedMessage || 'Không thể cấp chứng nhận');
        }
      });
    } else {
      // Cấp từng cá nhân
      let successCount = 0;
      let errorCount = 0;
      const total = this.selectedVolunteersForCert.size;
      
      this.selectedVolunteersForCert.forEach(maTNV => {
        const formData = new FormData();
        formData.append('MaMau', this.selectedCertificateSample!.toString());
        formData.append('MaTNV', maTNV.toString());
        formData.append('MaSuKien', this.selectedEvent!.maSuKien.toString());
        
        this.certificateService.issueCertificate(formData).subscribe({
          next: () => {
            successCount++;
            this.issuedCertificates.add(maTNV);
            
            if (successCount + errorCount === total) {
              this.isIssuingCertificates = false;
              this.toastService.success(`Đã cấp thành công ${successCount}/${total} chứng nhận!`);
              
              // Đóng modal
              const modalEl = document.getElementById('issueCertificatesModal');
              if (modalEl && (window as any).bootstrap) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
              }
            }
          },
          error: (err) => {
            errorCount++;
            console.error(`Lỗi cấp chứng nhận cho TNV ${maTNV}:`, err);
            
            if (successCount + errorCount === total) {
              this.isIssuingCertificates = false;
              this.toastService.success(`Đã cấp thành công ${successCount}/${total} chứng nhận!`);
            }
          }
        });
      });
    }
  }

  getMockEvents(): EventData[] {
    return [
      {
        maSuKien: 101,
        tenSuKien: 'Trồng cây xanh tại công viên',
        noiDung: 'Tham gia trồng cây xanh để cải thiện môi trường sống',
        diaChi: 'Công viên Thống Nhất, Hà Nội',
        ngayBatDau: new Date('2025-11-01'),
        ngayKetThuc: new Date('2025-11-02'),
        soLuongTNV: 50,
        soLuongDaDangKy: 35,
        maToChuc: this.organization?.maToChuc || 1,
        trangThai: 'Đã duyệt'
      },
      {
        maSuKien: 102,
        tenSuKien: 'Dạy học cho trẻ em khó khăn',
        noiDung: 'Chương trình dạy học miễn phí cho các em nhỏ có hoàn cảnh khó khăn',
        diaChi: 'Trường Tiểu học Thăng Long, Hà Nội',
        ngayBatDau: new Date('2025-10-25'),
        ngayKetThuc: new Date('2025-11-25'),
        soLuongTNV: 20,
        soLuongDaDangKy: 15,
        maToChuc: this.organization?.maToChuc || 1,
        trangThai: 'Đang tuyển'
      }
    ];
  }

  getMockVolunteers(): Volunteer[] {
    return [
      {
        maTNV: 1,
        hoTen: 'Nguyễn Văn A',
        soDienThoai: '0123456789',
        email: 'nguyenvana@example.com',
        diaChi: 'Hà Nội',
        trangThai: 0
      },
      {
        maTNV: 2,
        hoTen: 'Trần Thị B',
        soDienThoai: '0987654321',
        email: 'tranthib@example.com',
        diaChi: 'TP HCM',
        trangThai: 0
      },
      {
        maTNV: 3,
        hoTen: 'Lê Văn C',
        soDienThoai: '0912345678',
        email: 'levanc@example.com',
        diaChi: 'Đà Nẵng',
        trangThai: 1
      }
    ];
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  // ================= QUẢN LÝ MẪU CHỨNG NHẬN =================

  onSampleFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedSampleFile = input.files[0];
    }
  }

  createCertificateSample(): void {
    if (!this.newSample.tenMau) {
      this.toastService.warning('Vui lòng nhập tên mẫu!');
      return;
    }

    const doCreate = (bgFileName?: string) => {
      const formData = new FormData();
      // Input này là Ảnh nền, không phải file chứng nhận tĩnh
      if (bgFileName) {
        formData.append('backgroundImage', bgFileName);
      }
      formData.append('tenMau', this.newSample.tenMau);
      formData.append('moTa', this.newSample.moTa || '');
      formData.append('isDefault', this.newSample.isDefault.toString());

      this.certificateService.createCertificateSample(formData).subscribe({
        next: () => {
          this.toastService.success('Tạo mẫu chứng nhận thành công! Hãy click "Chỉnh sửa" để thiết kế template.');
          this.loadCertificateSamples();
          this.resetSampleForm();
        },
        error: (err) => {
          console.error('Lỗi tạo mẫu:', err);
          this.toastService.error(err.error?.message || 'Lỗi tạo mẫu chứng nhận');
        }
      });
    };

    if (this.selectedSampleFile) {
      const uploadData = new FormData();
      uploadData.append('file', this.selectedSampleFile);
      this.certificateService.uploadBackgroundImage(uploadData).subscribe({
        next: (res) => {
          const name = res?.fileName || res?.filePath || '';
          const bgFileName = typeof name === 'string' && name.includes('/uploads/')
            ? name.split('/').pop()
            : (res?.fileName || '');
          doCreate(bgFileName || undefined);
        },
        error: (err) => {
          console.error('Lỗi upload ảnh nền:', err);
          this.toastService.error(err.error?.message || 'Không thể upload ảnh nền');
        }
      });
    } else {
      doCreate();
    }
  }

  resetSampleForm(): void {
    this.newSample = {
      tenMau: '',
      moTa: '',
      isDefault: false
    };
    this.selectedSampleFile = null;
    
    // Reset file input
    const fileInput = document.getElementById('sampleFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  deleteSample(maMau: number): void {
    if (!confirm('Bạn có chắc chắn muốn xóa mẫu này?')) {
      return;
    }

    this.certificateService.deleteCertificateSample(maMau).subscribe({
      next: () => {
        this.toastService.success('Xóa mẫu thành công!');
        this.loadCertificateSamples();
      },
      error: (err) => {
        console.error('Lỗi xóa mẫu:', err);
        this.toastService.error(err.error?.message || 'Lỗi xóa mẫu chứng nhận');
      }
    });
  }

  // Event handlers cho shared modal
  onEventModalSaved(): void {
    this.showEventModal = false;
    this.loadOrganizationEvents();
  }

  onEventModalCancelled(): void {
    this.showEventModal = false;
  }

  // Search/Filter
  applySearchFilter(): void {
    // Reset to page 1 when searching
    this.activeEventsCurrentPage = 1;
  }

  shouldShowCloseRecruitmentButton(event: EventData | undefined = this.selectedEvent): boolean {
    if (!event) {
      return false;
    }

    const now = new Date();
    const recruitStart = event.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
    const recruitEnd = event.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
    const eventEnd = event.ngayKetThuc ? new Date(event.ngayKetThuc) : null;

    if (!recruitStart) return false;
    if (recruitStart > now) return false;
    if (recruitEnd && recruitEnd <= now) return false;
    if (eventEnd && eventEnd <= now) return false;

    const status = this.getEventStatusText(event);
    if (status === 'Sự kiện đã kết thúc' || status === 'Đã kết thúc') {
      return false;
    }

    return true;
  }

  getRecruitmentStatusText(event: EventData | null | undefined): string {
    if (!event) return 'Chưa thiết lập';

    const now = new Date();
    const recruitStart = event.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
    const recruitEnd = event.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;

    if (!recruitStart) {
      return 'Chưa thiết lập';
    }

    if (recruitStart > now) {
      return 'Chưa mở tuyển';
    }

    if (recruitEnd && recruitEnd < now) {
      return 'Đã kết thúc tuyển';
    }

    if (event.soLuong && event.soLuongDaDangKy && event.soLuongDaDangKy >= event.soLuong) {
      return 'Đã đủ người';
    }

    return 'Đang tuyển';
  }

  getRecruitmentStatusClass(event: EventData | null | undefined): string {
    const text = this.getRecruitmentStatusText(event);
    switch (text) {
      case 'Đang tuyển':
        return 'bg-warning';
      case 'Đã đủ người':
        return 'bg-primary';
      case 'Đã kết thúc tuyển':
        return 'bg-secondary';
      case 'Chưa mở tuyển':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  closeRecruitment(event: EventData | null | undefined): void {
    if (!event) return;
    if (!confirm('Bạn có chắc chắn muốn đóng phiên tuyển của sự kiện này?')) {
      return;
    }

    this.isClosingRecruitment = true;
    this.eventService.closeRecruitment(event.maSuKien).subscribe({
      next: () => {
        this.toastService.success('Đã đóng phiên tuyển của sự kiện.');
        this.isClosingRecruitment = false;
        this.refreshSelectedEvent(event.maSuKien);
        this.loadOrganizationEvents();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi đóng phiên tuyển:', err);
        this.toastService.error(err.error?.message || 'Không thể đóng phiên tuyển. Vui lòng thử lại sau.');
        this.isClosingRecruitment = false;
      }
    });
  }

  refreshSelectedEvent(eventId: number): void {
    this.eventService.getSuKienById(eventId).subscribe({
      next: (response: any) => {
        const updated = response?.data || response;
        if (updated) {
          this.selectedEvent = {
            ...this.selectedEvent,
            ...updated
          };
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải lại thông tin sự kiện:', err);
      }
    });
  }

  private assignActiveEventTemplates(): void {
    const statusCol = this.activeEventsTableColumns.find(col => col.key === 'trangThai');
    const actionsCol = this.activeEventsTableColumns.find(col => col.key === 'actions');
    let updated = false;

    if (statusCol && this.statusTemplateRef && statusCol.template !== this.statusTemplateRef) {
      statusCol.template = this.statusTemplateRef;
      updated = true;
    }
    if (actionsCol && this.actionsTemplateRef && actionsCol.template !== this.actionsTemplateRef) {
      actionsCol.template = this.actionsTemplateRef;
      updated = true;
    }

    if (updated) {
      this.activeEventsTableColumns = [...this.activeEventsTableColumns];
    }
  }

  private assignFinishedEventTemplates(): void {
    const statusCol = this.finishedEventsTableColumns.find(col => col.key === 'trangThai');
    const actionsCol = this.finishedEventsTableColumns.find(col => col.key === 'actions');
    let updated = false;

    if (statusCol && this.finishedStatusTemplateRef && statusCol.template !== this.finishedStatusTemplateRef) {
      statusCol.template = this.finishedStatusTemplateRef;
      updated = true;
    }
    if (actionsCol && this.finishedActionsTemplateRef && actionsCol.template !== this.finishedActionsTemplateRef) {
      actionsCol.template = this.finishedActionsTemplateRef;
      updated = true;
    }

    if (updated) {
      this.finishedEventsTableColumns = [...this.finishedEventsTableColumns];
    }
  }

}