import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterModule, Router } from '@angular/router';
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
  soLuongTNV?: number;
  soLuongDaDangKy?: number;
  maToChuc: number;
  trangThai?: string;
  tuyenBatDau?: Date;
  tuyenKetThuc?: Date;
  linhVucIds?: number[];
  kyNangIds?: number[];
}

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, VolunteerProfileViewerComponent],
  templateUrl: './event-management.html',
  styleUrls: ['./event-management.css']
})
export class EventManagementComponent implements OnInit {
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
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
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
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();

      if (this.role !== 'Organization' && this.role !== 'Admin') {
        // Redirect nếu không phải tổ chức hoặc admin
        this.router.navigate(['/home']);
        return;
      }
    }
    
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      this.user = JSON.parse(userInfo);
      this.loadOrganizationInfo();
      this.loadSkills();
      this.loadFields();
    } else {
      this.router.navigate(['/login']);
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
        
        // Map dữ liệu từ backend sang frontend format
        this.events = eventsData.map((event: any) => ({
          ...event,
          soLuongTNV: event.soLuong || event.soLuongTNV || 1, // Map soLuong -> soLuongTNV
          diaChi: event.diaChi || '',
          maToChuc: event.maToChuc || this.organization?.maToChuc || 0
        }));
        
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
    this.newEvent = this.createEmptyEvent();
    if (this.organization?.maToChuc) {
      this.newEvent.maToChuc = this.organization.maToChuc;
    }
    this.isCreatingEvent = true;
    this.selectedTab = 'create-event';
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [null]; // Reset về 1 dropdown
    this.selectedKyNangs = [null]; // Reset về 1 dropdown
    this.newLinhVucText = [''];
    this.newKyNangText = [''];
  }

  // Kết thúc sự kiện
  finishSelectedEvent() {
    if (!this.selectedEvent) return;
    if (!confirm('Kết thúc sự kiện này?')) return;
    this.http.post(`${environment.apiUrl}/sukien/${this.selectedEvent.maSuKien}/finish`, {}, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
    }).subscribe({
      next: () => {
        alert('Đã kết thúc sự kiện');
        if (this.selectedEvent) this.selectedEvent.trangThai = 'Đã kết thúc';
        // Reload lại danh sách sự kiện để cập nhật trạng thái
        this.loadOrganizationEvents();
      },
      error: (err) => {
        console.error('Lỗi kết thúc sự kiện:', err);
        alert(err?.error?.message || 'Không thể kết thúc sự kiện');
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
        if (!maNguoiDuocDanhGia) { alert('Không xác định được tài khoản của TNV.'); return; }
        const payload = {
          maNguoiDuocDanhGia,
          maSuKien,
          diemSo: this.evalScore,
          noiDung: this.evalComment
        };
        this.http.post<any>(`${environment.apiUrl}/danhgia`, payload, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' }
        }).subscribe({
          next: (r) => {
            alert(r?.message || 'Đánh giá thành công');
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
            alert(err?.error?.message || 'Không thể gửi đánh giá');
            this.evalSubmitting = false;
          }
        });
      },
      error: () => alert('Không tải được thông tin TNV')
    });
  }

  // Tải mẫu chứng nhận theo sự kiện
  loadCertificateTemplates(maSuKien: number): void {
    this.http.get<any>(`${environment.apiUrl}/certificate/samples/events/${maSuKien}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
    }).subscribe({
      next: (res) => { this.certificateTemplates = res?.data || []; },
      error: () => { this.certificateTemplates = []; }
    });
  }

  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
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
      alert('Bạn chỉ có thể thêm tối đa 10 lĩnh vực');
      return;
    }
    this.selectedLinhVucs.push(null);
    this.newLinhVucText.push('');
  }
  
  async createNewLinhVuc(index: number): Promise<void> {
    const text = this.newLinhVucText[index]?.trim();
    if (!text) {
      alert('Vui lòng nhập tên lĩnh vực');
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
      alert(error.error?.message || 'Không thể tạo lĩnh vực mới. Vui lòng thử lại.');
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
      alert('Bạn chỉ có thể thêm tối đa 10 kỹ năng');
      return;
    }
    this.selectedKyNangs.push(null);
    this.newKyNangText.push('');
  }
  
  async createNewKyNang(index: number): Promise<void> {
    const text = this.newKyNangText[index]?.trim();
    if (!text) {
      alert('Vui lòng nhập tên kỹ năng');
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
      alert(error.error?.message || 'Không thể tạo kỹ năng mới. Vui lòng thử lại.');
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
    // Load đầy đủ dữ liệu từ API
    this.eventService.getSuKienById(event.maSuKien).subscribe({
      next: (response: any) => {
        const eventData = response.data || response;
        
        // Format ngày tháng cho input date (YYYY-MM-DD)
        const formatDateForInput = (date: any): string => {
          if (!date) return '';
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // Đảm bảo lĩnh vực và kỹ năng được load đúng
        const linhVucIds = eventData.linhVucIds && Array.isArray(eventData.linhVucIds) && eventData.linhVucIds.length > 0
          ? [...eventData.linhVucIds]
          : [];
        const kyNangIds = eventData.kyNangIds && Array.isArray(eventData.kyNangIds) && eventData.kyNangIds.length > 0
          ? [...eventData.kyNangIds]
          : [];
        
        this.newEvent = {
          ...eventData,
          ngayBatDau: formatDateForInput(eventData.ngayBatDau),
          ngayKetThuc: formatDateForInput(eventData.ngayKetThuc),
          tuyenBatDau: formatDateForInput(eventData.tuyenBatDau),
          tuyenKetThuc: formatDateForInput(eventData.tuyenKetThuc),
          soLuongTNV: eventData.soLuong || eventData.soLuongTNV || 1, // Map soLuong từ backend -> soLuongTNV cho frontend
          diaChi: eventData.diaChi || '',
          maToChuc: eventData.maToChuc || this.organization?.maToChuc || 0,
          hinhAnh: eventData.hinhAnh || '', // Đảm bảo hinhAnh được lưu
          linhVucIds: linhVucIds.length > 0 ? linhVucIds : undefined, // Đảm bảo linhVucIds được lưu
          kyNangIds: kyNangIds.length > 0 ? kyNangIds : undefined // Đảm bảo kyNangIds được lưu
        };
        
        this.isEditingEvent = true;
        this.selectedTab = 'create-event';
        this.selectedFile = null;
        // Set preview URL cho hình ảnh
        this.previewUrl = eventData.hinhAnh ? getImageUrl(eventData.hinhAnh) : null;
        
        // Khởi tạo danh sách lĩnh vực và kỹ năng đã chọn
        this.selectedLinhVucs = linhVucIds.length > 0 
          ? [...linhVucIds] 
          : [null];
        this.selectedKyNangs = kyNangIds.length > 0 
          ? [...kyNangIds] 
          : [null];
        this.newLinhVucText = new Array(this.selectedLinhVucs.length).fill('');
        this.newKyNangText = new Array(this.selectedKyNangs.length).fill('');
        
        console.log('Loaded event for edit:', {
          hinhAnh: this.newEvent.hinhAnh,
          linhVucIds: this.newEvent.linhVucIds,
          kyNangIds: this.newEvent.kyNangIds,
          selectedLinhVucs: this.selectedLinhVucs,
          selectedKyNangs: this.selectedKyNangs
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi load chi tiết sự kiện:', err);
        alert('Không thể tải thông tin sự kiện. Vui lòng thử lại.');
      }
    });
  }

  cancelEdit() {
    this.isCreatingEvent = false;
    this.isEditingEvent = false;
    this.newEvent = this.createEmptyEvent();
    this.selectedTab = 'events';
  }

  saveEvent() {
    // Thêm lĩnh vực và kỹ năng vào dữ liệu (filter null, undefined, và NaN values)
    const linhVucIds = this.selectedLinhVucs
      .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
      .map(id => Number(id)) as number[];
    const kyNangIds = this.selectedKyNangs
      .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
      .map(id => Number(id)) as number[];
    
    console.log('Selected LinhVucs:', this.selectedLinhVucs);
    console.log('Selected KyNangs:', this.selectedKyNangs);
    console.log('Filtered LinhVucIds:', linhVucIds);
    console.log('Filtered KyNangIds:', kyNangIds);
    
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
    
    console.log('Event data to send:', eventDataToSend);
    console.log('LinhVucIds to send:', eventDataToSend.linhVucIds, 'Length:', eventDataToSend.linhVucIds?.length);
    console.log('KyNangIds to send:', eventDataToSend.kyNangIds, 'Length:', eventDataToSend.kyNangIds?.length);
    
    // Validation ngày tháng
    if (!this.newEvent.ngayBatDau) {
      alert('Vui lòng nhập ngày bắt đầu sự kiện');
      return;
    }
    
    if (!this.newEvent.ngayKetThuc) {
      alert('Vui lòng nhập ngày kết thúc sự kiện');
      return;
    }
    
    const ngayBatDau = new Date(this.newEvent.ngayBatDau);
    const ngayKetThuc = new Date(this.newEvent.ngayKetThuc);
    
    if (ngayBatDau > ngayKetThuc) {
      alert('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      return;
    }
    
    // Validation ngày tuyển phải nằm trong khoảng ngày sự kiện
    if (this.newEvent.tuyenBatDau || this.newEvent.tuyenKetThuc) {
      if (!this.newEvent.tuyenBatDau) {
        alert('Vui lòng nhập ngày bắt đầu tuyển nếu có ngày kết thúc tuyển');
        return;
      }
      
      if (!this.newEvent.tuyenKetThuc) {
        alert('Vui lòng nhập ngày kết thúc tuyển nếu có ngày bắt đầu tuyển');
        return;
      }
      
      const tuyenBatDau = new Date(this.newEvent.tuyenBatDau);
      const tuyenKetThuc = new Date(this.newEvent.tuyenKetThuc);
      
      if (tuyenBatDau > tuyenKetThuc) {
        alert('Ngày bắt đầu tuyển phải nhỏ hơn hoặc bằng ngày kết thúc tuyển');
        return;
      }
      
      if (tuyenBatDau < ngayBatDau || tuyenBatDau > ngayKetThuc) {
        alert('Ngày bắt đầu tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện');
        return;
      }
      
      if (tuyenKetThuc < ngayBatDau || tuyenKetThuc > ngayKetThuc) {
        alert('Ngày kết thúc tuyển phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện');
        return;
      }
    }
    
    if (this.isEditingEvent) {
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
          this.selectedTab = 'events';
          alert('Cập nhật sự kiện thành công!');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Lỗi khi cập nhật sự kiện:', err);
          alert(err.error?.message || 'Không thể cập nhật sự kiện. Vui lòng thử lại sau.');
          this.isEditingEvent = false;
        }
      });
    } else {
      // Tạo sự kiện mới
      this.eventService.createSuKien(eventDataToSend, this.selectedFile || undefined).subscribe({
        next: (response) => {
          console.log('Tạo sự kiện thành công:', response);
          // Thêm sự kiện mới vào danh sách
          const resultData = response.data || response;
          this.events.push(resultData);
          this.isCreatingEvent = false;
          this.selectedTab = 'events';
          alert('Tạo sự kiện thành công!');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Lỗi khi tạo sự kiện:', err);
          alert(err.error?.message || 'Không thể tạo sự kiện. Vui lòng thử lại sau.');
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
          alert('Xóa sự kiện thành công!');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Lỗi khi xóa sự kiện:', err);
          alert('Không thể xóa sự kiện. Vui lòng thử lại sau.');
          
          // Xóa khỏi mảng local nếu API lỗi
          this.events = this.events.filter(e => e.maSuKien !== event.maSuKien);
          if (this.selectedEvent?.maSuKien === event.maSuKien) {
            this.selectedEvent = undefined;
            this.selectedTab = 'events';
          }
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
      alert('Vui lòng chọn ít nhất một tệp để tải lên');
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
        alert('Tải lên giấy tờ pháp lý thành công!');
        
        // Cập nhật lại thông tin tổ chức để lấy trạng thái xác minh mới
        this.loadOrganizationInfo();
        this.loadOrganizationLegalDocs();
      },
      error: (err: any) => {
        console.error('Lỗi khi tải lên giấy tờ:', err);
        this.isLoading = false;
        alert(err.error?.message || 'Không thể tải lên giấy tờ. Vui lòng thử lại sau.');
      }
    });
  }

  // Xóa một giấy tờ pháp lý
  deleteLegalDocument(maGiayTo: number): void {
    if (!confirm('Bạn có chắc muốn xóa giấy tờ này?')) return;
    this.http.delete<any>(`${environment.apiUrl}/GiayToPhapLy/${maGiayTo}`).subscribe({
      next: () => {
        this.legalDocs = this.legalDocs.filter(d => d.maGiayTo !== maGiayTo);
        alert('Đã xóa giấy tờ thành công');
      },
      error: (err) => {
        console.error('Lỗi xóa giấy tờ:', err);
        alert(err?.error?.message || 'Không thể xóa giấy tờ.');
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
        alert('Cập nhật thông tin tổ chức thành công!');
        
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
        
        alert(this.errorMessage);
      }
    });
  }

  approveVolunteer(volunteer: Volunteer) {
    if (!this.selectedEvent) return;
    
    const data = {
      trangThai: 1, // Đã duyệt
      ghiChu: 'Đã duyệt bởi BTC'
    };
    
    // Lưu trạng thái cũ để cập nhật số lượng
    const oldStatus = volunteer.trangThai;
    
    this.registrationService.updateRegistrationStatus(volunteer.maTNV, this.selectedEvent.maSuKien, data).subscribe({
      next: (response) => {
        console.log('Duyệt TNV thành công:', response);
        // Cập nhật trạng thái trong danh sách local
        const index = this.eventVolunteers.findIndex(v => v.maTNV === volunteer.maTNV);
        if (index !== -1) {
          this.eventVolunteers[index].trangThai = 1;
        }
        
        // Cập nhật số lượng TNV đã duyệt: chỉ tăng nếu trước đó chưa được duyệt (0 hoặc 2)
        if (oldStatus !== 1 && this.selectedEvent) {
          this.selectedEvent.soLuongDaDangKy = (this.selectedEvent.soLuongDaDangKy || 0) + 1;
        }
        
        alert('Đã duyệt tình nguyện viên thành công!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi duyệt TNV:', err);
        alert('Không thể duyệt tình nguyện viên. Vui lòng thử lại sau.');
        
        // Cập nhật trạng thái trong danh sách local nếu API lỗi
        const index = this.eventVolunteers.findIndex(v => v.maTNV === volunteer.maTNV);
        if (index !== -1) {
          this.eventVolunteers[index].trangThai = 1;
        }
      }
    });
  }

  rejectVolunteer(volunteer: Volunteer) {
    if (!this.selectedEvent) return;
    
    // Hiển thị popup xác nhận
    const confirmed = confirm(`Bạn có chắc chắn muốn từ chối ${volunteer.hoTen} tham gia sự kiện "${this.selectedEvent.tenSuKien}"?`);
    if (!confirmed) return;
    
    const data = {
      trangThai: 2, // Từ chối
      ghiChu: 'Đã từ chối bởi BTC'
    };
    
    // Lưu trạng thái cũ để cập nhật số lượng
    const oldStatus = volunteer.trangThai;
    
    this.registrationService.updateRegistrationStatus(volunteer.maTNV, this.selectedEvent.maSuKien, data).subscribe({
      next: (response) => {
        console.log('Từ chối TNV thành công:', response);
        // Cập nhật trạng thái trong danh sách local
        const index = this.eventVolunteers.findIndex(v => v.maTNV === volunteer.maTNV);
        if (index !== -1) {
          this.eventVolunteers[index].trangThai = 2;
        }
        
        // Cập nhật số lượng TNV đã duyệt: chỉ giảm nếu trước đó đã được duyệt (1)
        if (oldStatus === 1 && this.selectedEvent && this.selectedEvent.soLuongDaDangKy) {
          this.selectedEvent.soLuongDaDangKy = Math.max(0, this.selectedEvent.soLuongDaDangKy - 1);
        }
        
        alert('Đã từ chối tình nguyện viên!');
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi từ chối TNV:', err);
        alert('Không thể từ chối tình nguyện viên. Vui lòng thử lại sau.');
        
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
    
    this.http.post(`${environment.apiUrl}/sukien/${this.selectedEvent.maSuKien}/invite/${volunteer.maTNV}`, {}, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
    }).subscribe({
      next: () => {
        alert('Đã gửi lời mời tới tình nguyện viên!');
      },
      error: (err) => {
        console.error('Lỗi khi mời TNV:', err);
        alert(err?.error?.message || 'Không thể gửi lời mời. Vui lòng thử lại sau.');
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

  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  getEventStatusText(status: number | string | undefined): string {
    if (typeof status === 'string') {
      return status;
    }
    if (typeof status === 'number') {
      // Map number sang string
      switch (status) {
        case 0: return 'Đang tuyển';
        case 1: return 'Đã duyệt';
        case 2: return 'Đã hủy';
        case 3: return 'Đã kết thúc';
        default: return 'Đang tuyển';
      }
    }
    return 'Đang tuyển';
  }
  
  getEventStatusClass(status: number | string | undefined): string {
    if (typeof status === 'string') {
      if (status === 'Đã duyệt' || status === 'Kết thúc' || status === 'Đã kết thúc') {
        return 'bg-success';
      } else if (status === 'Đang tuyển' || status === 'Sắp diễn ra') {
        return 'bg-warning';
      } else if (status === 'Đã hủy' || status === 'Hủy bỏ') {
        return 'bg-danger';
      }
      return 'bg-secondary';
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

  formatDate(date?: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
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
    this.certificateService.getCertificateSamples().subscribe({
      next: (response) => {
        this.certificateSamples = response.data || response || [];
        // Chọn mẫu mặc định nếu có
        const defaultSample = this.certificateSamples.find(s => s.isDefault);
        if (defaultSample) {
          this.selectedCertificateSample = defaultSample.maMau;
        } else if (this.certificateSamples.length > 0) {
          this.selectedCertificateSample = this.certificateSamples[0].maMau;
        }
      },
      error: (err) => {
        console.error('Lỗi tải mẫu chứng nhận:', err);
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
        alert('Sự kiện đã được đánh dấu hoàn thành!');
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
        alert(err.normalizedMessage || 'Không thể kết thúc sự kiện');
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
      alert('Vui lòng chọn mẫu chứng nhận');
      return;
    }

    if (this.selectedVolunteersForCert.size === 0) {
      alert('Vui lòng chọn ít nhất một tình nguyện viên');
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
      this.certificateService.issueCertificatesBulk(
        this.selectedEvent.maSuKien,
        this.selectedCertificateSample
      ).subscribe({
        next: (response) => {
          alert(`Đã cấp thành công ${response.data?.length || 0} chứng nhận!`);
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
        error: (err) => {
          console.error('Lỗi cấp chứng nhận:', err);
          this.isIssuingCertificates = false;
          alert(err.normalizedMessage || 'Không thể cấp chứng nhận');
        }
      });
    } else {
      // Cấp từng cá nhân
      let successCount = 0;
      let errorCount = 0;
      const total = this.selectedVolunteersForCert.size;
      
      this.selectedVolunteersForCert.forEach(maTNV => {
        const certData: IssueCertificateDto = {
          maTNV: maTNV,
          maSuKien: this.selectedEvent!.maSuKien,
          maMau: this.selectedCertificateSample!
        };
        
        this.certificateService.issueCertificate(certData).subscribe({
          next: () => {
            successCount++;
            this.issuedCertificates.add(maTNV);
            
            if (successCount + errorCount === total) {
              this.isIssuingCertificates = false;
              alert(`Đã cấp thành công ${successCount}/${total} chứng nhận!`);
              
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
              alert(`Đã cấp thành công ${successCount}/${total} chứng nhận!`);
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
}