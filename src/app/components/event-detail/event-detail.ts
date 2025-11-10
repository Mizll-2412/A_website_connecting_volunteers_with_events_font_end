import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { RegistrationService } from '../../services/registration';
import { EvaluationService, EvaluationResponseDto } from '../../services/evaluation.service';
import { environment } from '../../../environments/environment';
import { getImageUrl, getOrgDefaultImage as getOrgDefaultImageUtil } from '../../utils/image-url.util';
import { StarRatingComponent } from '../shared/star-rating/star-rating';

declare var bootstrap: any;

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StarRatingComponent],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.css']
})
export class EventDetailComponent implements OnInit, AfterViewInit {
  apiUrl = `${environment.apiUrl}/sukien`;
  apiVolunteerUrl = `${environment.apiUrl}/tinhnguyenvien`;
  apiRegistrationUrl = `${environment.apiUrl}/dondangky`;

  eventId?: number;
  event: any = null;
  organization: any = null;
  similarEvents: any[] = [];
  isRegistered = false;
  registrationStatus: number | null = null; // 0 = chờ duyệt, 1 = đã duyệt, 2 = từ chối, null = chưa đăng ký
  registrationNote = '';
  isLoading = false;
  isRegistering = false;
  registrationError = '';
  isLoggedIn = false;
  username = '';
  role = '';
  volunteer: any = null;
  user: any = null;
  soLuongDaDangKy: number = 0; // Số người đã đăng ký (đã duyệt)
  
  // Evaluations
  evaluations: EvaluationResponseDto[] = [];
  isLoadingEvaluations = false;
  averageRating: number = 0;
  
  // Skills and Fields
  allSkills: any[] = [];
  allFields: any[] = [];

  // Mock data
  mockEvent = {
    maSuKien: 101,
    tenSuKien: 'Trồng cây xanh tại công viên',
    noiDung: 'Tham gia trồng cây xanh để cải thiện môi trường sống và nâng cao ý thức bảo vệ môi trường cho cộng đồng.',
    moTaChiTiet: 'Chương trình "Trồng cây xanh tại công viên" là một phần của sáng kiến "Vì một Việt Nam xanh"...',
    diaChi: 'Công viên Thống Nhất, Hà Nội',
    ngayBatDau: new Date('2025-11-01T07:00:00'),
    ngayKetThuc: new Date('2025-11-01T16:00:00'),
    hinhAnh: '/uploads/avatars/1_20251015005804.png',
    soLuongTNV: 50,
    soLuongDaDangKy: 35,
    maToChuc: 1,
    trangThai: 'Đã duyệt',
    matchRate: 98,
    yeuCau: 'Không yêu cầu kinh nghiệm, phù hợp với mọi đối tượng từ 15 tuổi trở lên',
    quyenLoi: '- Được cung cấp dụng cụ, nước uống và bữa trưa\n- Được cấp giấy chứng nhận tham gia\n- Được tham gia các hoạt động giao lưu'
  };

  mockOrganization = {
    maToChuc: 1,
    tenToChuc: 'Quỹ Hy Vọng',
    gioiThieu: 'Hỗ trợ giáo dục cho trẻ em vùng cao và các hoạt động bảo vệ môi trường',
    anhDaiDien: '/uploads/avatars/1_20251015005804.png',
    diaChi: 'Hà Nội',
    website: 'hyvong.org',
    email: 'info@hyvong.org',
    soDienThoai: '0123456789',
    diemDanhGia: 4.8,
    soLuotDanhGia: 124
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private auth: AuthService,
    private eventService: EventService,
    private orgService: ToChucService,
    private registrationService: RegistrationService,
    private evaluationService: EvaluationService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.loadMasterData(); // Load skills and fields first
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
      const userInfo = localStorage.getItem('user');
      if (userInfo) {
        this.user = JSON.parse(userInfo);
        this.loadVolunteerInfo();
      }
    }

    this.route.params.subscribe(params => {
      this.eventId = +params['id'];
      if (this.eventId) {
        this.loadEventDetails(this.eventId);
      }
    });
  }

  ngAfterViewInit() {
    // Khởi tạo Bootstrap tooltip sau khi view được render
    setTimeout(() => {
      const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.map((tooltipTriggerEl: any) => {
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }, 100);
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
  
  getEventSkills(): any[] {
    if (!this.event?.kyNangIds || this.event.kyNangIds.length === 0) {
      return [];
    }
    return this.event.kyNangIds
      .map((id: number) => this.allSkills.find(s => s.maKyNang === id))
      .filter((skill: any) => skill != null);
  }
  
  getEventFields(): any[] {
    if (!this.event?.linhVucIds || this.event.linhVucIds.length === 0) {
      return [];
    }
    return this.event.linhVucIds
      .map((id: number) => this.allFields.find(f => f.maLinhVuc === id))
      .filter((field: any) => field != null);
  }
  
  isRecruitingOpen(): boolean {
    if (!this.event?.tuyenBatDau || !this.event?.tuyenKetThuc) {
      return false;
    }
    const now = new Date();
    const startDate = new Date(this.event.tuyenBatDau);
    const endDate = new Date(this.event.tuyenKetThuc);
    return now >= startDate && now <= endDate;
  }

  hasRecruitment(): boolean {
    return !!(this.event?.tuyenBatDau && this.event?.tuyenKetThuc);
  }

  isRecruitingNotStarted(): boolean {
    if (!this.hasRecruitment()) return false;
    const now = new Date();
    const startDate = new Date(this.event.tuyenBatDau);
    return now < startDate;
  }

  isRecruitingEnded(): boolean {
    if (!this.hasRecruitment()) return false;
    const now = new Date();
    const endDate = new Date(this.event.tuyenKetThuc);
    return now > endDate;
  }

  loadEventDetails(id: number) {
    this.isLoading = true;
    // Thử load dữ liệu từ API
    this.eventService.getSuKienById(id).subscribe({
      next: (response: any) => {
        console.log('Chi tiết sự kiện từ API:', response);
        
        // Xử lý nhiều định dạng dữ liệu có thể có
        let eventData: any;
        if (response && response.data) {
          eventData = response.data;
        } else if (response && !Array.isArray(response)) {
          eventData = response;
        } else {
          console.log('Không tìm thấy sự kiện từ API, sử dụng dữ liệu mẫu');
          this.event = this.mockEvent;
          this.isLoading = false;
          return;
        }
        
        // Chuẩn hóa số lượng cần tuyển - thử nhiều trường có thể có
        const slots = eventData.soLuong ?? eventData.soLuongCanTuyen ?? eventData.soLuongTNV ?? eventData.soLuongTnv ?? 0;
        eventData.soLuong = slots;
        eventData.soLuongTNV = slots;
        if (eventData.soLuongCanTuyen == null) {
          eventData.soLuongCanTuyen = slots;
        }
        
        // Khởi tạo soLuongDaDangKy nếu chưa có (từ API response)
        if (eventData.soLuongDaDangKy == null || eventData.soLuongDaDangKy === undefined) {
          eventData.soLuongDaDangKy = 0;
        }
        
        // Cập nhật biến soLuongDaDangKy từ API response
        this.soLuongDaDangKy = eventData.soLuongDaDangKy;
        
        this.event = eventData;
        
        // Load thông tin tổ chức
        if (this.event.maToChuc) {
          this.loadOrganizationDetails(this.event.maToChuc);
        }
        
        // Load sự kiện tương tự
        this.loadSimilarEvents();
        
        // Load đánh giá nếu sự kiện đã kết thúc
        if (this.isEventEnded()) {
          this.loadEvaluations();
        }
        
        // Nếu đã đăng nhập, kiểm tra xem đã đăng ký chưa
        if (this.isLoggedIn && this.volunteer) {
          this.checkRegistrationStatus();
        }
        
        this.isLoading = false;
        
        // Khởi tạo lại tooltip sau khi load xong dữ liệu
        setTimeout(() => {
          const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
          tooltipTriggerList.map((tooltipTriggerEl: any) => {
            // Xóa tooltip cũ nếu có
            const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
            if (existingTooltip) {
              existingTooltip.dispose();
            }
            // Tạo tooltip mới
            return new bootstrap.Tooltip(tooltipTriggerEl);
          });
        }, 200);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy chi tiết sự kiện:', err);
        // Sử dụng dữ liệu mẫu khi API lỗi
        this.event = this.mockEvent;
        this.organization = this.mockOrganization;
        this.isLoading = false;
      }
    });
  }

  loadRegisteredCount(eventId: number): void {
    this.registrationService.getRegistrationsByEvent(eventId).subscribe({
      next: (response: any) => {
        const data = response.data || response || [];
        // Đếm số đăng ký đã được duyệt (trangThai === 1)
        const approvedCount = data.filter((reg: any) => reg.trangThai === 1).length;
        if (this.event) {
          this.event.soLuongDaDangKy = approvedCount;
        }
      },
      error: (err: any) => {
        console.error('Lỗi tải số lượng đăng ký:', err);
        // Giữ nguyên giá trị hiện tại hoặc set về 0
        if (this.event && this.event.soLuongDaDangKy == null) {
          this.event.soLuongDaDangKy = 0;
        }
      }
    });
  }

  loadOrganizationDetails(orgId: number) {
    this.orgService.getOrganizationById(orgId).subscribe({
      next: (response: any) => {
        console.log('Thông tin tổ chức từ API:', response);
        
        // Xử lý nhiều định dạng dữ liệu có thể có
        if (response && response.data) {
          this.organization = response.data;
        } else if (response && !Array.isArray(response)) {
          this.organization = response;
        } else {
          console.log('Không tìm thấy tổ chức từ API, sử dụng dữ liệu mẫu');
          this.organization = this.mockOrganization;
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy thông tin tổ chức:', err);
        this.organization = this.mockOrganization;
      }
    });
  }

  loadVolunteerInfo() {
    if (!this.user?.maTaiKhoan) return;

    this.http.get<any>(`${this.apiVolunteerUrl}/by-account/${this.user.maTaiKhoan}`).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.volunteer = response.data;
        } else {
          this.volunteer = response;
        }
        
        console.log('Thông tin tình nguyện viên:', this.volunteer);
        
        // Nếu đã load được sự kiện, kiểm tra trạng thái đăng ký
        if (this.event) {
          this.checkRegistrationStatus();
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy thông tin tình nguyện viên:', err);
      }
    });
  }

  checkRegistrationStatus() {
    // Kiểm tra nếu TNV đã đăng ký sự kiện này chưa
    if (!this.volunteer?.maTNV || !this.eventId) return;

    this.registrationService.getRegistrationStatus(this.volunteer.maTNV, this.eventId).subscribe({
      next: (response: any) => {
        if (response) {
          console.log('Trạng thái đăng ký:', response);
          const registrationData = response.data || response;
          this.isRegistered = true;
          this.registrationStatus = registrationData.trangThai !== undefined ? registrationData.trangThai : null;
        }
      },
      error: (err: HttpErrorResponse) => {
        console.log('Chưa đăng ký sự kiện này');
        this.isRegistered = false;
        this.registrationStatus = null;
      }
    });
  }

  registerForEvent() {
    // Kiểm tra nếu là tổ chức thì không cho đăng ký
    if (this.role === 'Organization') {
      alert('Tổ chức không thể đăng ký tham gia sự kiện');
      return;
    }
    
    if (!this.volunteer?.maTNV || !this.eventId) {
      // Kiểm tra nếu đã đăng nhập nhưng chưa có hồ sơ tình nguyện viên
      if (this.isLoggedIn && this.role === 'User' && this.user?.maTaiKhoan && !this.volunteer) {
        alert('Bạn cần hoàn thiện hồ sơ tình nguyện viên trước khi đăng ký sự kiện');
        this.router.navigate(['/profile']);
        return;
      }
      
      alert('Bạn cần đăng nhập và hoàn thiện hồ sơ tình nguyện viên trước khi đăng ký');
      return;
    }

    // Kiểm tra số lượng slot còn lại
    const remainingSlots = this.getRemainingSlots();
    if (remainingSlots <= 0) {
      alert('Sự kiện đã đủ số lượng tình nguyện viên. Không thể đăng ký thêm.');
      return;
    }

    this.isRegistering = true;
    
    const registerData = {
      maTNV: this.volunteer.maTNV,
      maSuKien: this.eventId,
      ghiChu: this.registrationNote || 'Đăng ký tham gia'
    };

    console.log('Đang gửi dữ liệu đăng ký:', registerData);

    this.registrationService.register(registerData).subscribe({
      next: (response: any) => {
        console.log('Đăng ký thành công:', response);
        this.isRegistered = true;
        this.registrationStatus = 0; // Chờ duyệt
        this.isRegistering = false;
        alert('Đăng ký tham gia sự kiện thành công!');
        // Reload event details để cập nhật số lượng từ backend
        if (this.eventId) {
          this.loadEventDetails(this.eventId);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi đăng ký sự kiện:', err);
        this.isRegistering = false;
        
        let errorMessage = 'Không thể đăng ký tham gia. Vui lòng thử lại sau.';
        
        // Cố gắng lấy thông báo lỗi cụ thể từ API nếu có
        if (err.error && err.error.message) {
          errorMessage = err.error.message;
        }
        
        this.registrationError = errorMessage;
        alert(errorMessage);
      }
    });
  }

  cancelRegistration() {
    if (!this.volunteer?.maTNV || !this.eventId) return;

    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký tham gia sự kiện này?')) return;

    this.registrationService.cancelRegistration(this.volunteer.maTNV, this.eventId).subscribe({
      next: (response: any) => {
        console.log('Hủy đăng ký thành công:', response);
        this.isRegistered = false;
        this.registrationStatus = null;
        alert('Hủy đăng ký tham gia sự kiện thành công!');
        // Reload event details để cập nhật số lượng từ backend
        if (this.eventId) {
          this.loadEventDetails(this.eventId);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi hủy đăng ký:', err);
        alert('Không thể hủy đăng ký. Vui lòng thử lại sau.');
      }
    });
  }

  eventHasStarted(): boolean {
    if (!this.event?.ngayBatDau) return false;
    const now = new Date();
    const eventStart = new Date(this.event.ngayBatDau);
    return now >= eventStart;
  }

  isEventEnded(): boolean {
    if (!this.event?.ngayKetThuc) return false;
    const now = new Date();
    const eventEnd = new Date(this.event.ngayKetThuc);
    return now > eventEnd;
  }

  goBack(): void {
    this.location.back();
  }

  loadEvaluations(): void {
    if (!this.eventId) return;
    
    this.isLoadingEvaluations = true;
    this.evaluationService.getEvaluationsByEvent(this.eventId).subscribe({
      next: (response: any) => {
        const data = response?.data || response || [];
        const allEvaluations = Array.isArray(data) ? data : [];
        
        // Lọc chỉ lấy đánh giá từ User (tình nguyện viên) đến Organization (tổ chức)
        this.evaluations = allEvaluations.filter((evaluation: EvaluationResponseDto) => {
          return evaluation.vaiTroNguoiDanhGia === 'User' && 
                 evaluation.vaiTroNguoiDuocDanhGia === 'Organization';
        });
        
        // Tính điểm trung bình
        if (this.evaluations.length > 0) {
          const total = this.evaluations.reduce((sum, evaluation) => sum + (evaluation.diemSo || 0), 0);
          this.averageRating = total / this.evaluations.length;
        } else {
          this.averageRating = 0;
        }
        
        this.isLoadingEvaluations = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi lấy đánh giá:', err);
        this.evaluations = [];
        this.isLoadingEvaluations = false;
      }
    });
  }

  loadSimilarEvents(): void {
    if (!this.event?.maSuKien) return;
    
    // Load tất cả sự kiện
    this.eventService.getAllSuKien().subscribe({
      next: (response: any) => {
        const allEvents = response?.data || response || [];
        
        // Lọc các sự kiện tương tự (không phải sự kiện hiện tại)
        let similar: any[] = allEvents.filter((e: any) => e.maSuKien !== this.event.maSuKien);
        
        // Ưu tiên các sự kiện có cùng lĩnh vực hoặc kỹ năng
        if (this.event.linhVucIds && this.event.linhVucIds.length > 0) {
          const sameField = similar.filter((e: any) => 
            e.linhVucIds && e.linhVucIds.some((id: number) => 
              this.event.linhVucIds.includes(id)
            )
          );
          
          const differentField = similar.filter((e: any) => 
            !e.linhVucIds || !e.linhVucIds.some((id: number) => 
              this.event.linhVucIds.includes(id)
            )
          );
          
          similar = [...sameField, ...differentField];
        }
        
        // Ưu tiên các sự kiện có cùng kỹ năng
        if (this.event.kyNangIds && this.event.kyNangIds.length > 0) {
          const sameSkill = similar.filter((e: any) => 
            e.kyNangIds && e.kyNangIds.some((id: number) => 
              this.event.kyNangIds.includes(id)
            )
          );
          
          const differentSkill = similar.filter((e: any) => 
            !e.kyNangIds || !e.kyNangIds.some((id: number) => 
              this.event.kyNangIds.includes(id)
            )
          );
          
          similar = [...sameSkill, ...differentSkill];
        }
        
        // Ưu tiên các sự kiện cùng tổ chức
        if (this.event.maToChuc) {
          const sameOrg = similar.filter((e: any) => e.maToChuc === this.event.maToChuc);
          const differentOrg = similar.filter((e: any) => e.maToChuc !== this.event.maToChuc);
          similar = [...sameOrg, ...differentOrg];
        }
        
        // Giới hạn tối đa 6 sự kiện
        this.similarEvents = similar.slice(0, 6);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải sự kiện tương tự:', err);
        this.similarEvents = [];
      }
    });
  }

  navigateToOtherEvent(eventId: number) {
    this.router.navigate(['/su-kien', eventId]);
  }

  formatDate(dateStr?: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  }

  getSimilarEventsExplanation(): string {
    const reasons: string[] = [];
    
    if (this.event?.linhVucIds && this.event.linhVucIds.length > 0) {
      reasons.push('cùng lĩnh vực');
    }
    
    if (this.event?.kyNangIds && this.event.kyNangIds.length > 0) {
      reasons.push('cùng kỹ năng yêu cầu');
    }
    
    if (this.event?.maToChuc) {
      reasons.push('cùng tổ chức');
    }
    
    if (reasons.length === 0) {
      return 'Các sự kiện được gợi ý dựa trên các sự kiện khác trong hệ thống.';
    }
    
    return `Các sự kiện được gợi ý vì có ${reasons.join(', ')} với sự kiện này.`;
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  getOrgDefaultImage(): string {
    return getOrgDefaultImageUtil();
  }

  // Phương thức helper để lấy số lượng cần tuyển
  getRequiredSlots(): number {
    if (!this.event) return 0;
    return this.event.soLuong ?? this.event.soLuongCanTuyen ?? this.event.soLuongTNV ?? this.event.soLuongTnv ?? 0;
  }

  // Phương thức helper để lấy số lượng đã đăng ký (đã duyệt)
  getRegisteredSlots(): number {
    if (!this.event) return 0;
    // Sử dụng dữ liệu từ API response (backend đã tính sẵn)
    return this.event.soLuongDaDangKy ?? this.soLuongDaDangKy ?? 0;
  }

  // Phương thức helper để tính số slot còn lại
  getRemainingSlots(): number {
    const required = this.getRequiredSlots();
    const registered = this.getRegisteredSlots();
    const remaining = required - registered;
    return remaining > 0 ? remaining : 0;
  }
}