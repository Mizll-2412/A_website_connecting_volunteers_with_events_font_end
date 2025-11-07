import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { EventCardComponent } from '../shared/event-card/event-card';
import { OrganizationCardComponent } from '../shared/organization-card/organization-card';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule, FormsModule, RouterModule, EventCardComponent, OrganizationCardComponent],
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

  private apiUrl = environment.apiUrl;
  private searchTimeout: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private eventService: EventService,
    private toChucService: ToChucService
  ) {}

  ngOnInit(): void {
    // Scroll về đầu trang khi component được khởi tạo
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Đọc query parameter để xác định tab nào cần mở
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'organizations') {
        this.activeTab = 'organizations';
      } else if (params['tab'] === 'events') {
        this.activeTab = 'events';
      }
    });

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

  // Tự động search khi gõ (với debounce)
  onSearchInput(): void {
    // Clear timeout trước đó nếu có
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Đợi 300ms sau khi người dùng ngừng gõ rồi mới search
    this.searchTimeout = setTimeout(() => {
      this.search();
    }, 300);
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
    if (org?.maToChuc) {
      this.router.navigate(['/to-chuc', org.maToChuc]);
    }
  }
}

