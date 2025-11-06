import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';

interface Skill {
  maKyNang: number;
  tenKyNang: string;
}

interface Field {
  maLinhVuc: number;
  tenLinhVuc: string;
}

@Component({
  selector: 'app-events-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './events-organizations.html',
  styleUrls: ['./events-organizations.css']
})
export class EventsOrganizationsComponent implements OnInit {
  // Tab hiện tại: 'events' hoặc 'organizations'
  activeTab: string = 'events';

  // Tìm kiếm
  searchKeyword: string = '';
  searchLocation: string = '';
  selectedSkill: number | null = null;
  selectedField: number | null = null;
  startDate: string = '';
  endDate: string = '';
  verifiedOnly: boolean = false;

  // Dữ liệu
  allEvents: any[] = [];
  allOrganizations: any[] = [];
  filteredEvents: any[] = [];
  filteredOrganizations: any[] = [];
  
  skills: Skill[] = [];
  fields: Field[] = [];

  // UI state
  isLoading: boolean = false;
  errorMessage: string = '';
  showFilters: boolean = false;

  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private eventService: EventService,
    private toChucService: ToChucService
  ) {}

  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
    this.loadEvents();
    this.loadOrganizations();
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.clearSearch();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Load data
  loadSkills(): void {
    this.http.get<any>(`${this.apiUrl}/kynang`).subscribe({
      next: (response) => {
        this.skills = response.data || response || [];
      },
      error: (err) => console.error('Lỗi tải kỹ năng:', err)
    });
  }

  loadFields(): void {
    this.http.get<any>(`${this.apiUrl}/linhvuc`).subscribe({
      next: (response) => {
        this.fields = response.data || response || [];
      },
      error: (err) => console.error('Lỗi tải lĩnh vực:', err)
    });
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.eventService.getAllEvents().subscribe({
      next: (response: any) => {
        this.allEvents = response.data || response || [];
        this.filteredEvents = [...this.allEvents];
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Lỗi tải sự kiện:', err);
        this.errorMessage = 'Không thể tải danh sách sự kiện';
        this.isLoading = false;
      }
    });
  }

  loadOrganizations(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.toChucService.getAllOrganizations().subscribe({
      next: (response: any) => {
        this.allOrganizations = response.data || response || [];
        this.filteredOrganizations = [...this.allOrganizations];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải tổ chức:', err);
        this.errorMessage = 'Không thể tải danh sách tổ chức';
        this.isLoading = false;
      }
    });
  }

  // Search & Filter
  search(): void {
    if (this.activeTab === 'events') {
      this.searchEvents();
    } else {
      this.searchOrganizations();
    }
  }

  searchEvents(): void {
    let results = [...this.allEvents];

    // Keyword search
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase().trim();
      results = results.filter(event =>
        event.tenSuKien?.toLowerCase().includes(keyword) ||
        event.noiDung?.toLowerCase().includes(keyword) ||
        event.diaChi?.toLowerCase().includes(keyword)
      );
    }

    // Location filter
    if (this.searchLocation.trim()) {
      const location = this.searchLocation.toLowerCase().trim();
      results = results.filter(event =>
        event.diaChi?.toLowerCase().includes(location)
      );
    }

    // Date range filter
    if (this.startDate) {
      const start = new Date(this.startDate);
      results = results.filter(event => {
        const eventDate = new Date(event.ngayBatDau);
        return eventDate >= start;
      });
    }

    if (this.endDate) {
      const end = new Date(this.endDate);
      results = results.filter(event => {
        const eventDate = new Date(event.ngayKetThuc || event.ngayBatDau);
        return eventDate <= end;
      });
    }

    // Skill filter
    if (this.selectedSkill) {
      results = results.filter(event =>
        event.kyNangs?.some((skill: any) => skill.maKyNang === this.selectedSkill)
      );
    }

    // Field filter
    if (this.selectedField) {
      results = results.filter(event =>
        event.linhVucs?.some((field: any) => field.maLinhVuc === this.selectedField)
      );
    }

    this.filteredEvents = results;
  }

  searchOrganizations(): void {
    let results = [...this.allOrganizations];

    // Keyword search
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase().trim();
      results = results.filter(org =>
        org.tenToChuc?.toLowerCase().includes(keyword) ||
        org.gioiThieu?.toLowerCase().includes(keyword) ||
        org.email?.toLowerCase().includes(keyword) ||
        org.diaChi?.toLowerCase().includes(keyword)
      );
    }

    // Location filter
    if (this.searchLocation.trim()) {
      const location = this.searchLocation.toLowerCase().trim();
      results = results.filter(org =>
        org.diaChi?.toLowerCase().includes(location)
      );
    }

    // Verified only filter
    if (this.verifiedOnly) {
      results = results.filter(org => org.trangThaiXacMinh === 1);
    }

    this.filteredOrganizations = results;
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.searchLocation = '';
    this.selectedSkill = null;
    this.selectedField = null;
    this.startDate = '';
    this.endDate = '';
    this.verifiedOnly = false;

    this.filteredEvents = [...this.allEvents];
    this.filteredOrganizations = [...this.allOrganizations];
  }

  // Navigation
  viewEventDetail(eventId: number): void {
    this.router.navigate(['/su-kien', eventId]);
  }

  viewOrgDetail(org: any): void {
    // TODO: Navigate to organization detail page
    alert(`Xem chi tiết tổ chức: ${org.tenToChuc}`);
  }

  // Helpers
  getImageUrl(path: string | null | undefined): string {
    if (!path) return 'assets/default-event.png';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000${path}`;
  }

  getEventStatus(event: any): string {
    const now = new Date();
    const start = new Date(event.ngayBatDau);
    const end = new Date(event.ngayKetThuc || event.ngayBatDau);

    if (now < start) return 'Sắp diễn ra';
    if (now >= start && now <= end) return 'Đang diễn ra';
    return 'Đã kết thúc';
  }

  getEventStatusClass(event: any): string {
    const status = this.getEventStatus(event);
    if (status === 'Sắp diễn ra') return 'badge bg-info';
    if (status === 'Đang diễn ra') return 'badge bg-success';
    return 'badge bg-secondary';
  }

  getVerificationBadge(status: number): string {
    switch (status) {
      case 0: return 'badge bg-warning';
      case 1: return 'badge bg-success';
      case 2: return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  getVerificationText(status: number): string {
    switch (status) {
      case 0: return 'Chờ duyệt';
      case 1: return 'Đã xác minh';
      case 2: return 'Bị từ chối';
      default: return 'Không xác định';
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  }
}

