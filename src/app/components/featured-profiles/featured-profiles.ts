import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TinhNguyenVienService } from '../../services/volunteer';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { NotificationService } from '../../services/notification.service';
import { ToChucService } from '../../services/organization';
import { VolunteerProfileViewerComponent } from '../volunteer-profile-viewer/volunteer-profile-viewer';
import { environment } from '../../../environments/environment';
import { getImageUrl as getImageUrlUtil } from '../../utils/image-url.util';

interface Volunteer {
  maTNV: number;
  maTaiKhoan: number;
  hoTen: string;
  anhDaiDien?: string;
  email: string;
  soDienThoai?: string;
  gioiThieu?: string;
  ngaySinh?: string;
  diaChi?: string;
  kyNangs?: any[]; // Deprecated: sử dụng getVolunteerSkills() thay thế
  linhVucs?: any[]; // Deprecated: sử dụng getVolunteerFields() thay thế
  kyNangIds?: number[]; // IDs từ API
  linhVucIds?: number[]; // IDs từ API
  danhGiaTrungBinh?: number;
}

@Component({
  selector: 'app-featured-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, VolunteerProfileViewerComponent],
  templateUrl: './featured-profiles.html',
  styleUrls: ['./featured-profiles.css']
})
export class FeaturedProfilesComponent implements OnInit {
  volunteers: Volunteer[] = [];
  filteredVolunteers: Volunteer[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Lọc
  searchQuery: string = '';
  selectedSkills: number[] = [];
  selectedFields: number[] = [];
  
  // Danh sách kỹ năng và lĩnh vực để lọc
  skills: any[] = [];
  fields: any[] = [];
  
  // Phân trang đơn giản
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  
  // Mời tham gia sự kiện
  orgEvents: any[] = [];
  selectedEventId: number | null = null;
  organization: any = null; // Thông tin tổ chức hiện tại
  
  // Chi tiết TNV
  selectedVolunteer: Volunteer | null = null;
  volunteerDetail: any = null;

  @ViewChild(VolunteerProfileViewerComponent) volunteerProfileViewer?: VolunteerProfileViewerComponent;

  constructor(
    private volunteerService: TinhNguyenVienService,
    private skillService: SkillService,
    private fieldService: FieldService,
    private auth: AuthService,
    private eventService: EventService,
    private notificationService: NotificationService,
    private toChucService: ToChucService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
    this.loadFeaturedVolunteers();
    // Load organization info ngay từ đầu nếu là Organization
    this.loadOrganizationInfo();

    // Kiểm tra query parameter để mở modal volunteer
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        const volunteerId = +params['id'];
        // Đợi volunteers load xong rồi mới mở modal
        setTimeout(() => {
          const volunteer = this.volunteers.find(v => v.maTNV === volunteerId);
          if (volunteer) {
            this.viewVolunteerProfile(volunteer);
          } else {
            // Nếu chưa có trong danh sách, load chi tiết trực tiếp
            this.volunteerService.getVolunteerById(volunteerId).subscribe({
              next: (data: any) => {
                const vol = data?.data || data;
                if (vol) {
                  this.viewVolunteerProfile(vol);
                }
              },
              error: (err) => {
                console.error('Lỗi tải thông tin tình nguyện viên:', err);
              }
            });
          }
        }, 500);
      }
    });
  }

  loadOrganizationInfo(): void {
    const user = this.auth.getUser();
    if (!user || user.vaiTro !== 'Organization') { 
      this.organization = null;
      return; 
    }
    
    if (!user.maTaiKhoan) {
      console.warn('Không tìm thấy maTaiKhoan từ user object:', user);
      return;
    }
    
    // Nếu đã có organization info, không cần load lại
    if (this.organization?.maToChuc) {
      return;
    }
    
    console.log('Loading organization info for account ID:', user.maTaiKhoan);
    this.toChucService.getOrganizationByAccountId(user.maTaiKhoan).subscribe({
      next: (response: any) => {
        this.organization = response?.data || response;
        console.log('Organization info loaded:', this.organization);
        console.log('maToChuc:', this.organization?.maToChuc);
      },
      error: (err) => {
        console.error('Error loading organization info:', err);
        this.organization = null;
      }
    });
  }
  
  loadOrgEvents(): void {
    const user = this.auth.getUser();
    if (!user || user.vaiTro !== 'Organization') { 
      this.orgEvents = [];
      return; 
    }
    
    // Đảm bảo đã có organization info trước khi load events
    if (!this.organization?.maToChuc) {
      // Nếu chưa có organization info, load trước
      if (!user.maTaiKhoan) {
        console.warn('Không tìm thấy maTaiKhoan từ user object:', user);
        this.orgEvents = [];
        return;
      }
      
      // Load organization info trước, sau đó load events
      this.toChucService.getOrganizationByAccountId(user.maTaiKhoan).subscribe({
        next: (response: any) => {
          this.organization = response?.data || response;
          console.log('Organization info loaded in loadOrgEvents:', this.organization);
          
          // Phải dùng maToChuc từ organization object, KHÔNG dùng maTaiKhoan
          if (this.organization?.maToChuc) {
            console.log('Loading events with maToChuc:', this.organization.maToChuc);
            this.loadEventsByOrgId(this.organization.maToChuc);
          } else {
            console.warn('Không tìm thấy maToChuc từ organization response:', this.organization);
            this.orgEvents = [];
          }
        },
        error: (err) => {
          console.error('Error loading organization info:', err);
          this.orgEvents = [];
        }
      });
      return;
    }
    
    // Nếu đã có organization info và maToChuc, load events trực tiếp
    console.log('Using cached organization maToChuc:', this.organization.maToChuc);
    this.loadEventsByOrgId(this.organization.maToChuc);
  }
  
  private loadEventsByOrgId(orgId: number): void {
    // Đảm bảo orgId là maToChuc, không phải maTaiKhoan
    if (!orgId || orgId <= 0) {
      console.error('Invalid organization ID:', orgId);
      this.orgEvents = [];
      return;
    }
    
    console.log('=== Loading events ===');
    console.log('Organization ID (maToChuc):', orgId);
    console.log('Current organization object:', this.organization);
    console.log('Expected maToChuc:', this.organization?.maToChuc);
    
    // Double check: đảm bảo orgId khớp với maToChuc từ organization object
    if (this.organization && this.organization.maToChuc && orgId !== this.organization.maToChuc) {
      console.warn('WARNING: orgId does not match organization.maToChuc!', {
        orgId,
        organizationMaToChuc: this.organization.maToChuc
      });
      // Sửa lại để dùng maToChuc từ organization object
      orgId = this.organization.maToChuc;
      console.log('Using corrected maToChuc:', orgId);
    }
    
    this.eventService.getEventsByOrganizationId(orgId).subscribe({
      next: (resp: any) => {
        console.log('Events response:', resp);
        this.orgEvents = resp?.data || resp || [];
        console.log('Loaded events:', this.orgEvents.length);
      },
      error: (err) => { 
        console.error('Error loading organization events:', err);
        console.error('Failed with organization ID:', orgId);
        this.orgEvents = []; 
      }
    });
  }

  invite(v: Volunteer): void {
    if (!this.selectedEventId) { return; }
    // POST /api/sukien/{eventId}/invite/{maTNV}
    fetch(`${environment.apiUrl}/sukien/${this.selectedEventId}/invite/${v.maTNV}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.auth.getToken() || ''}`
      }
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || 'Không thể gửi lời mời');
      }
      alert('Đã gửi lời mời tới tình nguyện viên.');
    }).catch((e) => {
      alert(e.message || 'Không thể gửi lời mời');
    });
  }

  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.skills = response.data || response;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách kỹ năng:', err);
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.fields = response.data || response;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách lĩnh vực:', err);
      }
    });
  }

  loadFeaturedVolunteers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Load all volunteers first, then apply filters client-side
    this.volunteerService.getAllVolunteers().subscribe({
      next: (response: any) => {
        let volunteersData: any[] = [];
        if (response && response.data && Array.isArray(response.data)) {
          volunteersData = response.data;
        } else if (Array.isArray(response)) {
          volunteersData = response;
        } else {
          this.volunteers = [];
          this.errorMessage = 'Không thể tải danh sách tình nguyện viên';
          this.isLoading = false;
          return;
        }
        
        // Map dữ liệu và đảm bảo danhGiaTrungBinh được map đúng
        this.volunteers = volunteersData.map((vol: any) => ({
          ...vol,
          danhGiaTrungBinh: vol.danhGiaTrungBinh ?? vol.diemTrungBinh ?? vol.DiemTrungBinh ?? 0
        }));
        
        // Apply filters after loading data
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách tình nguyện viên:', err);
        this.errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
        this.isLoading = false;
        
        // Dữ liệu mẫu cho mục đích phát triển
        this.loadMockData();
      }
    });
  }

  loadMockData(): void {
    // Dữ liệu mẫu để hiển thị khi API lỗi
    this.volunteers = [
      {
        maTNV: 1,
        maTaiKhoan: 101,
        hoTen: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        soDienThoai: '0123456789',
        diaChi: 'Hà Nội',
        gioiThieu: 'Tôi là sinh viên năm cuối đại học, có nhiều kinh nghiệm trong các hoạt động tình nguyện.',
        danhGiaTrungBinh: 4.5,
        kyNangs: [
          { maKyNang: 1, tenKyNang: 'Dạy học' },
          { maKyNang: 3, tenKyNang: 'Tổ chức sự kiện' }
        ],
        linhVucs: [
          { maLinhVuc: 2, tenLinhVuc: 'Giáo dục' }
        ]
      },
      {
        maTNV: 2,
        maTaiKhoan: 102,
        hoTen: 'Trần Thị B',
        email: 'tranthib@example.com',
        soDienThoai: '0987654321',
        diaChi: 'TP HCM',
        gioiThieu: 'Tôi có 5 năm kinh nghiệm trong các dự án cộng đồng và hoạt động xã hội.',
        danhGiaTrungBinh: 4.8,
        kyNangs: [
          { maKyNang: 2, tenKyNang: 'Y tế' },
          { maKyNang: 5, tenKyNang: 'Quản lý dự án' }
        ],
        linhVucs: [
          { maLinhVuc: 1, tenLinhVuc: 'Y tế' },
          { maLinhVuc: 3, tenLinhVuc: 'Phát triển cộng đồng' }
        ]
      }
    ];
    
    this.applyFilters();
  }

  applyFilters(): void {
    let results = [...this.volunteers];
    
    // Lọc theo từ khóa tìm kiếm
    if (this.searchQuery && this.searchQuery.trim()) {
      const keyword = this.searchQuery.toLowerCase().trim();
      results = results.filter(vol => 
        vol.hoTen?.toLowerCase().includes(keyword) || 
        vol.email?.toLowerCase().includes(keyword) || 
        vol.diaChi?.toLowerCase().includes(keyword) ||
        vol.gioiThieu?.toLowerCase().includes(keyword)
      );
    }
    
    // Lọc theo kỹ năng
    if (this.selectedSkills.length > 0) {
      results = results.filter(vol => {
        // Hỗ trợ cả kyNangIds và kyNangs
        const skillIds = vol.kyNangIds || (vol.kyNangs ? vol.kyNangs.map((s: any) => s.maKyNang) : []);
        return this.selectedSkills.some(skillId => skillIds.includes(skillId));
      });
    }
    
    // Lọc theo lĩnh vực
    if (this.selectedFields.length > 0) {
      results = results.filter(vol => {
        // Hỗ trợ cả linhVucIds và linhVucs
        const fieldIds = vol.linhVucIds || (vol.linhVucs ? vol.linhVucs.map((f: any) => f.maLinhVuc) : []);
        return this.selectedFields.some(fieldId => fieldIds.includes(fieldId));
      });
    }
    
    // Cập nhật danh sách đã lọc và tính toán phân trang
    this.filteredVolunteers = results;
    this.totalPages = Math.ceil(results.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
  }

  toggleSkill(skillId: number): void {
    const index = this.selectedSkills.indexOf(skillId);
    if (index === -1) {
      this.selectedSkills.push(skillId);
    } else {
      this.selectedSkills.splice(index, 1);
    }
    // Áp dụng bộ lọc ngay lập tức
    this.applyFilters();
  }

  toggleField(fieldId: number): void {
    const index = this.selectedFields.indexOf(fieldId);
    if (index === -1) {
      this.selectedFields.push(fieldId);
    } else {
      this.selectedFields.splice(index, 1);
    }
    // Áp dụng bộ lọc ngay lập tức
    this.applyFilters();
  }

  search(): void {
    // Áp dụng bộ lọc ngay lập tức
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedSkills = [];
    this.selectedFields = [];
    // Áp dụng bộ lọc ngay lập tức
    this.applyFilters();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getCurrentPageItems(): Volunteer[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVolunteers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getStarRating(rating: number | undefined): string[] {
    if (!rating) rating = 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return [
      ...Array(fullStars).fill('full'),
      ...(halfStar ? ['half'] : []),
      ...Array(emptyStars).fill('empty')
    ];
  }

  viewVolunteerProfile(volunteer: Volunteer): void {
    this.selectedVolunteer = volunteer;
    if (this.volunteerProfileViewer) {
      this.volunteerProfileViewer.open(volunteer.maTNV, volunteer);
    }
  }

  inviteToEvent(volunteerId: number): void {
    if (!this.selectedEventId) {
      alert('Vui lòng chọn sự kiện muốn mời');
      return;
    }

    // Gửi thông báo mời tham gia sự kiện
    this.notificationService.inviteVolunteerToEvent(volunteerId, this.selectedEventId).subscribe({
      next: (response) => {
        alert('Đã gửi lời mời tham gia sự kiện thành công!');
        
        // Đóng modal
        const modalEl = document.getElementById('inviteModal');
        if (modalEl && (window as any).bootstrap) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      },
      error: (err) => {
        console.error('Lỗi gửi lời mời:', err);
        const errorMsg = err.normalizedMessage || 'Không thể gửi lời mời. Vui lòng thử lại';
        alert(errorMsg);
      }
    });
  }

  openInviteModal(volunteer: Volunteer): void {
    this.selectedVolunteer = volunteer;
    this.selectedEventId = null;
    
    console.log('=== openInviteModal called ===');
    
    // Đảm bảo organization info đã được load trước khi load events
    const user = this.auth.getUser();
    console.log('Current user:', user);
    console.log('Current organization:', this.organization);
    
    if (user && user.vaiTro === 'Organization') {
      if (!this.organization?.maToChuc) {
        // Nếu chưa có organization info, load trước
        if (user.maTaiKhoan) {
          console.log('Loading organization info for account:', user.maTaiKhoan);
          this.toChucService.getOrganizationByAccountId(user.maTaiKhoan).subscribe({
            next: (response: any) => {
              this.organization = response?.data || response;
              console.log('=== Organization loaded in openInviteModal ===');
              console.log('Full organization object:', this.organization);
              console.log('maToChuc:', this.organization?.maToChuc);
              console.log('maTaiKhoan:', this.organization?.maTaiKhoan);
              
              // Đảm bảo dùng maToChuc, KHÔNG dùng maTaiKhoan
              const maToChuc = this.organization?.maToChuc;
              if (maToChuc) {
                console.log('Loading events with maToChuc:', maToChuc);
                this.loadEventsByOrgId(maToChuc);
              } else {
                console.error('ERROR: maToChuc not found in organization object!');
              }
            },
            error: (err) => {
              console.error('Error loading organization in openInviteModal:', err);
            }
          });
        } else {
          console.error('ERROR: user.maTaiKhoan not found!');
        }
      } else {
        // Nếu đã có organization info, load events trực tiếp với maToChuc
        const maToChuc = this.organization.maToChuc;
        console.log('=== Using existing organization ===');
        console.log('maToChuc:', maToChuc);
        console.log('maTaiKhoan (should NOT use):', this.organization.maTaiKhoan);
        this.loadEventsByOrgId(maToChuc);
      }
    } else {
      console.warn('User is not an Organization or user not found');
    }
    
    const modalEl = document.getElementById('inviteModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // Helper methods để map IDs thành objects
  getVolunteerSkills(volunteer: Volunteer): any[] {
    if (!volunteer.kyNangIds || volunteer.kyNangIds.length === 0) {
      return [];
    }
    return volunteer.kyNangIds
      .map((id: number) => this.skills.find(s => s.maKyNang === id))
      .filter((skill: any) => skill != null);
  }

  getVolunteerFields(volunteer: Volunteer): any[] {
    if (!volunteer.linhVucIds || volunteer.linhVucIds.length === 0) {
      return [];
    }
    return volunteer.linhVucIds
      .map((id: number) => this.fields.find(f => f.maLinhVuc === id))
      .filter((field: any) => field != null);
  }

  // Helper methods cho volunteerDetail (có thể là any type)
  getDetailSkills(detail: any): any[] {
    if (detail?.kyNangs && Array.isArray(detail.kyNangs)) {
      return detail.kyNangs; // Nếu đã có objects
    }
    if (detail?.kyNangIds && Array.isArray(detail.kyNangIds)) {
      return detail.kyNangIds
        .map((id: number) => this.skills.find(s => s.maKyNang === id))
        .filter((skill: any) => skill != null);
    }
    return [];
  }

  getDetailFields(detail: any): any[] {
    if (detail?.linhVucs && Array.isArray(detail.linhVucs)) {
      return detail.linhVucs; // Nếu đã có objects
    }
    if (detail?.linhVucIds && Array.isArray(detail.linhVucIds)) {
      return detail.linhVucIds
        .map((id: number) => this.fields.find(f => f.maLinhVuc === id))
        .filter((field: any) => field != null);
    }
    return [];
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrlUtil(path);
  }
}
