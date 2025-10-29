import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { HttpErrorResponse } from '@angular/common/http';

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
  imports: [CommonModule, RouterModule, FormsModule],
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
  
  // Danh sách lĩnh vực và kỹ năng
  linhVucs: any[] = [];
  kyNangs: any[] = [];
  
  // Các lĩnh vực và kỹ năng đã chọn
  selectedLinhVucs: number[] = [];
  selectedKyNangs: number[] = [];
  
  // Danh sách tình nguyện viên đăng ký cho sự kiện đã chọn
  eventVolunteers: Volunteer[] = [];
  isLoadingVolunteers = false;

  constructor(
    private router: Router, 
    private auth: AuthService,
    private eventService: EventService,
    private toChucService: ToChucService,
    private registrationService: RegistrationService,
    private skillService: SkillService,
    private fieldService: FieldService
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
        
        // Kiểm tra trạng thái xác minh tổ chức
        if (this.organization?.trangThaiXacMinh !== undefined) {
          // 0: Chờ duyệt, 1: Đã duyệt, 2: Từ chối
          this.isVerified = this.organization.trangThaiXacMinh === 1;
          this.isRejected = this.organization.trangThaiXacMinh === 2;
          this.rejectionReason = this.organization.lyDoTuChoi || '';
          
          // Hiển thị thông báo nếu tổ chức chưa được duyệt
          if (!this.isVerified) {
            if (this.isRejected) {
              this.errorMessage = `Tổ chức của bạn đã bị từ chối xác minh. Lý do: ${this.rejectionReason || 'Không có lý do được cung cấp'}`;
            } else {
              this.errorMessage = 'Tổ chức của bạn đang chờ được phê duyệt. Bạn chỉ có thể tạo sự kiện sau khi được xác minh.';
            }
          } else {
            // Xóa thông báo lỗi nếu đã được xác minh
            this.errorMessage = '';
          }
        } else {
          // Nếu không có thông tin trạng thái, giả định là chưa được duyệt
          this.isVerified = false;
          this.errorMessage = 'Không tìm thấy thông tin xác minh tổ chức. Vui lòng liên hệ quản trị viên.';
        }
        
        // Sau khi có thông tin tổ chức, load sự kiện của tổ chức đó
        if (this.organization?.maToChuc) {
          this.loadOrganizationEvents();
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

  loadOrganizationEvents() {
    if (!this.organization?.maToChuc) return;
    
    this.isLoading = true;
    this.eventService.getEventsByOrganizationId(this.organization.maToChuc).subscribe({
      next: (response: any) => {
        console.log('Sự kiện của tổ chức:', response);
        
        if (response && response.data && Array.isArray(response.data)) {
          this.events = response.data;
        } else if (Array.isArray(response)) {
          this.events = response;
        } else {
          console.log('Không có dữ liệu sự kiện, sử dụng mẫu');
          this.events = this.getMockEvents();
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
        
        if (response && response.data && Array.isArray(response.data)) {
          this.eventVolunteers = response.data;
        } else if (Array.isArray(response)) {
          this.eventVolunteers = response;
        } else {
          console.log('Không có tình nguyện viên đăng ký, sử dụng dữ liệu mẫu');
          this.eventVolunteers = this.getMockVolunteers();
        }
        
        this.isLoadingVolunteers = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách tình nguyện viên:', err);
        this.isLoadingVolunteers = false;
        this.eventVolunteers = this.getMockVolunteers();
      }
    });
  }

  selectEvent(event: EventData) {
    this.selectedEvent = event;
    this.selectedTab = 'event-detail';
    this.loadEventVolunteers(event.maSuKien);
  }

  createEvent() {
    // Kiểm tra xác minh tổ chức trước khi cho phép tạo sự kiện
    if (!this.isVerified) {
      if (this.isRejected) {
        alert('Tổ chức của bạn đã bị từ chối xác minh. Vui lòng cập nhật thông tin và yêu cầu xem xét lại.');
      } else {
        alert('Tổ chức của bạn chưa được xác minh. Vui lòng chờ quản trị viên xác minh trước khi tạo sự kiện.');
      }
      return;
    }
    
    this.newEvent = this.createEmptyEvent();
    if (this.organization?.maToChuc) {
      this.newEvent.maToChuc = this.organization.maToChuc;
    }
    this.isCreatingEvent = true;
    this.selectedTab = 'create-event';
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [];
    this.selectedKyNangs = [];
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
  
  toggleLinhVuc(id: number): void {
    const index = this.selectedLinhVucs.indexOf(id);
    if (index !== -1) {
      this.selectedLinhVucs.splice(index, 1); // Bỏ chọn
    } else {
      this.selectedLinhVucs.push(id); // Chọn
    }
  }
  
  toggleKyNang(id: number): void {
    const index = this.selectedKyNangs.indexOf(id);
    if (index !== -1) {
      this.selectedKyNangs.splice(index, 1); // Bỏ chọn
    } else {
      this.selectedKyNangs.push(id); // Chọn
    }
  }
  
  isLinhVucSelected(id: number): boolean {
    return this.selectedLinhVucs.includes(id);
  }
  
  isKyNangSelected(id: number): boolean {
    return this.selectedKyNangs.includes(id);
  }

  editEvent(event: EventData) {
    this.newEvent = { ...event };
    this.isEditingEvent = true;
    this.selectedTab = 'create-event';
    this.selectedFile = null;
    this.previewUrl = event.hinhAnh ? 'http://localhost:5000' + event.hinhAnh : null;
    
    // Khởi tạo danh sách lĩnh vực và kỹ năng đã chọn
    this.selectedLinhVucs = event.linhVucIds || [];
    this.selectedKyNangs = event.kyNangIds || [];
  }

  cancelEdit() {
    this.isCreatingEvent = false;
    this.isEditingEvent = false;
    this.newEvent = this.createEmptyEvent();
    this.selectedTab = 'events';
  }

  saveEvent() {
    // Thêm lĩnh vực và kỹ năng vào dữ liệu
    this.newEvent.linhVucIds = this.selectedLinhVucs.length > 0 ? this.selectedLinhVucs : undefined;
    this.newEvent.kyNangIds = this.selectedKyNangs.length > 0 ? this.selectedKyNangs : undefined;
    
    if (this.isEditingEvent) {
      // Cập nhật sự kiện
      this.eventService.updateSuKien(this.newEvent.maSuKien, this.newEvent, this.selectedFile || undefined).subscribe({
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
      this.eventService.createSuKien(this.newEvent, this.selectedFile || undefined).subscribe({
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
    if (this.organization?.maToChuc) {
      // Chuyển đến tab settings trong cùng component
      this.selectedTab = 'settings';
      // Nếu có ảnh đại diện, hiển thị preview
      if (this.organization.anhDaiDien) {
        this.orgPreviewUrl = 'http://localhost:5000' + this.organization.anhDaiDien;
      }
    } else {
      alert('Không tìm thấy thông tin tổ chức!');
    }
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
        
        // Quay lại tab events
        this.selectedTab = 'events';
        
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
    
    this.registrationService.updateRegistrationStatus(volunteer.maTNV, this.selectedEvent.maSuKien, data).subscribe({
      next: (response) => {
        console.log('Duyệt TNV thành công:', response);
        // Cập nhật trạng thái trong danh sách local
        const index = this.eventVolunteers.findIndex(v => v.maTNV === volunteer.maTNV);
        if (index !== -1) {
          this.eventVolunteers[index].trangThai = 1;
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
    
    const data = {
      trangThai: 2, // Từ chối
      ghiChu: 'Đã từ chối bởi BTC'
    };
    
    this.registrationService.updateRegistrationStatus(volunteer.maTNV, this.selectedEvent.maSuKien, data).subscribe({
      next: (response) => {
        console.log('Từ chối TNV thành công:', response);
        // Cập nhật trạng thái trong danh sách local
        const index = this.eventVolunteers.findIndex(v => v.maTNV === volunteer.maTNV);
        if (index !== -1) {
          this.eventVolunteers[index].trangThai = 2;
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

  backToEvents() {
    this.selectedEvent = undefined;
    this.selectedTab = 'events';
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
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
}