import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { TinhNguyenVienService } from '../../services/volunteer';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { NotificationService } from '../../services/notification.service';
import { VolunteerProfileViewerComponent } from '../volunteer-profile-viewer/volunteer-profile-viewer';

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
  imports: [CommonModule, FormsModule, HttpClientModule, VolunteerProfileViewerComponent],
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
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
    this.loadFeaturedVolunteers();
    this.loadOrgEvents();
  }

  loadOrgEvents(): void {
    const user = this.auth.getUser();
    if (!user || user.vaiTro !== 'Organization') { return; }
    const orgId = user.maToChuc || user.maTaiKhoan; // fallback
    this.eventService.getEventsByOrganizationId(orgId).subscribe({
      next: (resp: any) => {
        this.orgEvents = resp?.data || resp || [];
      },
      error: () => { this.orgEvents = []; }
    });
  }

  invite(v: Volunteer): void {
    if (!this.selectedEventId) { return; }
    // POST /api/sukien/{eventId}/invite/{maTNV}
    fetch(`http://localhost:5000/api/sukien/${this.selectedEventId}/invite/${v.maTNV}`, {
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
        if (response && response.data && Array.isArray(response.data)) {
          this.volunteers = response.data;
        } else if (Array.isArray(response)) {
          this.volunteers = response;
        } else {
          this.volunteers = [];
          this.errorMessage = 'Không thể tải danh sách tình nguyện viên';
        }
        
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
}
