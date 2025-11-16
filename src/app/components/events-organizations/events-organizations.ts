import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AuthService } from '../../services/auth';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { EventCardComponent } from '../shared/event-card/event-card';
import { OrganizationCardComponent } from '../shared/organization-card/organization-card';
import { PaginationComponent } from '../shared/pagination/pagination';
import { environment } from '../../../environments/environment';
import { NzFormModule } from 'ng-zorro-antd/form';
import { normalizeVietnamese, fuzzyMatch } from '../../utils/fuzzy-search.util';

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
  imports: [CommonModule, FormsModule, RouterModule, NzDatePickerModule, NzFormModule, NzSelectModule, EventCardComponent, OrganizationCardComponent, PaginationComponent],
  templateUrl: './events-organizations.html',
  styleUrls: ['./events-organizations.css']
})
export class EventsOrganizationsComponent implements OnInit {
  // Tab hiện tại: 'events' hoặc 'organizations'
  activeTab: string = 'events';

  // Tìm kiếm
  searchKeyword: string = '';
  searchLocation: string = '';
  selectedSkills: number[] = []; // Cho phép chọn nhiều kỹ năng
  selectedFields: number[] = []; // Cho phép chọn nhiều lĩnh vực
  startDate: string = '';
  endDate: string = '';
  dateRange: [Date | null, Date | null] | null = null; // For Ant Design RangePicker - Khoảng thời gian sự kiện
  recruitmentDateRange: [Date | null, Date | null] | null = null; // For Ant Design RangePicker - Khoảng thời gian tuyển
  selectedEventStatuses: string[] = []; // Cho phép chọn nhiều trạng thái: 'upcoming', 'ongoing', 'finished', 'recruiting'
  selectedOrganizationIds: number[] = []; // Cho phép chọn nhiều tổ chức
  verifiedOnly: boolean = false;

  // Dữ liệu
  allEvents: any[] = [];
  allOrganizations: any[] = [];
  filteredEvents: any[] = [];
  filteredOrganizations: any[] = [];
  
  // Phân trang cho sự kiện
  paginatedEvents: any[] = [];
  eventsCurrentPage: number = 1;
  eventsItemsPerPage: number = 6;
  
  // Phân trang cho tổ chức
  paginatedOrganizations: any[] = [];
  organizationsCurrentPage: number = 1;
  organizationsItemsPerPage: number = 6;
  
  skills: Skill[] = [];
  fields: Field[] = [];

  // UI state
  isLoading: boolean = false;
  errorMessage: string = '';
  showFilters: boolean = false;
  
  // Multi-select dropdown states
  skillsDropdownOpen: boolean = false;
  fieldsDropdownOpen: boolean = false;
  statusDropdownOpen: boolean = false;
  organizationDropdownOpen: boolean = false;
  organizationSearchTerm: string = '';
  filteredOrganizationsForDropdown: any[] = [];
  
  // Date range picker state
  dateRangePickerOpen: boolean = false;
  
  // Date display formats
  startDateDisplay: string = '';
  endDateDisplay: string = '';
  
  // Calendar states - left calendar shows current month, right shows next month
  leftCalendarDate: Date = new Date();
  rightCalendarDate: Date = new Date();
  
  // Track which date is being selected (start or end)
  selectingStartDate: boolean = true;

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
    
    // Initialize date displays if dates are already set
    if (this.startDate) {
      this.startDateDisplay = this.formatDateForDisplay(this.startDate);
    }
    if (this.endDate) {
      this.endDateDisplay = this.formatDateForDisplay(this.endDate);
    }
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    // Reset phân trang khi chuyển tab
    this.eventsCurrentPage = 1;
    this.organizationsCurrentPage = 1;
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
        this.updatePaginatedEvents();
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
        this.filteredOrganizationsForDropdown = [...this.allOrganizations];
        this.updatePaginatedOrganizations();
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

  // Sử dụng utility functions từ fuzzy-search.util

  searchEvents(): void {
    let results = [...this.allEvents];

    // Keyword search với fuzzy matching
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.trim();
      results = results.filter(event =>
        fuzzyMatch(event.tenSuKien || '', keyword) ||
        fuzzyMatch(event.noiDung || '', keyword) ||
        fuzzyMatch(event.diaChi || '', keyword)
      );
    }

    // Location filter với fuzzy matching
    if (this.searchLocation.trim()) {
      const location = this.searchLocation.trim();
      results = results.filter(event =>
        fuzzyMatch(event.diaChi || '', location)
      );
    }

    // Date range filter - Fixed: check if event overlaps with date range
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      
      results = results.filter(event => {
        const eventStart = new Date(event.ngayBatDau);
        const eventEnd = new Date(event.ngayKetThuc || event.ngayBatDau);
        
        // Event overlaps if: event starts before filter ends AND event ends after filter starts
        return eventStart <= end && eventEnd >= start;
      });
    } else if (this.startDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      results = results.filter(event => {
        const eventEnd = new Date(event.ngayKetThuc || event.ngayBatDau);
        return eventEnd >= start;
      });
    } else if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      results = results.filter(event => {
        const eventStart = new Date(event.ngayBatDau);
        return eventStart <= end;
      });
    }

    // Skill filter - Cho phép chọn nhiều kỹ năng
    if (this.selectedSkills.length > 0) {
      results = results.filter(event => {
        // Check kyNangs array (full objects)
        if (event.kyNangs && Array.isArray(event.kyNangs)) {
          const eventSkillIds = event.kyNangs.map((skill: any) => skill.maKyNang);
          return this.selectedSkills.some(skillId => eventSkillIds.includes(skillId));
        }
        // Check kyNangIds array (just IDs)
        if (event.kyNangIds && Array.isArray(event.kyNangIds)) {
          return this.selectedSkills.some(skillId => event.kyNangIds.includes(skillId));
        }
        return false;
      });
    }

    // Field filter - Cho phép chọn nhiều lĩnh vực
    if (this.selectedFields.length > 0) {
      results = results.filter(event => {
        // Check linhVucs array (full objects)
        if (event.linhVucs && Array.isArray(event.linhVucs)) {
          const eventFieldIds = event.linhVucs.map((field: any) => field.maLinhVuc);
          return this.selectedFields.some(fieldId => eventFieldIds.includes(fieldId));
        }
        // Check linhVucIds array (just IDs)
        if (event.linhVucIds && Array.isArray(event.linhVucIds)) {
          return this.selectedFields.some(fieldId => event.linhVucIds.includes(fieldId));
        }
        return false;
      });
    }

    // Recruitment date range filter - Khoảng thời gian tuyển
    if (this.recruitmentDateRange && this.recruitmentDateRange[0] && this.recruitmentDateRange[1]) {
      const recruitStart = new Date(this.recruitmentDateRange[0]);
      recruitStart.setHours(0, 0, 0, 0);
      const recruitEnd = new Date(this.recruitmentDateRange[1]);
      recruitEnd.setHours(23, 59, 59, 999);
      
      results = results.filter(event => {
        const eventRecruitStart = event.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
        const eventRecruitEnd = event.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
        
        if (eventRecruitStart && eventRecruitEnd) {
          // Event recruitment overlaps if: event recruitment starts before filter ends AND event recruitment ends after filter starts
          return eventRecruitStart <= recruitEnd && eventRecruitEnd >= recruitStart;
        }
        return false;
      });
    }

    // Organization filter - Lọc theo tổ chức (cho phép chọn nhiều)
    if (this.selectedOrganizationIds.length > 0) {
      results = results.filter(event => {
        return this.selectedOrganizationIds.includes(event.maToChuc);
      });
    }

    // Event status filter (cho phép chọn nhiều)
    if (this.selectedEventStatuses.length > 0) {
      const now = new Date();
      results = results.filter(event => {
        const startDate = new Date(event.ngayBatDau);
        const endDate = new Date(event.ngayKetThuc || event.ngayBatDau);
        const recruitStart = event.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
        const recruitEnd = event.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;

        // Xác định trạng thái thực tế của sự kiện
        let eventStatus: string = '';
        
        // Kiểm tra đã kết thúc trước (độ ưu tiên cao nhất)
        if (endDate < now) {
          eventStatus = 'finished';
        } 
        // Kiểm tra đang diễn ra (phải đang trong khoảng thời gian diễn ra)
        else if (startDate <= now && endDate >= now) {
          eventStatus = 'ongoing';
        }
        // Kiểm tra đang tuyển (CHỈ khi đang trong khoảng thời gian tuyển)
        // Quan trọng: phải kiểm tra recruitEnd >= now (chưa hết thời gian tuyển)
        else if (recruitStart && recruitEnd && recruitStart <= now && recruitEnd >= now) {
          eventStatus = 'recruiting';
        }
        // Sắp diễn ra (sự kiện chưa bắt đầu)
        else if (startDate > now) {
          // Nếu có thời gian tuyển nhưng đã hết (recruitEnd < now), không coi là "recruiting"
          // Chỉ coi là "upcoming" nếu chưa bắt đầu
          eventStatus = 'upcoming';
        }
        // Mặc định (trường hợp hiếm)
        else {
          eventStatus = 'upcoming';
        }

        // Chỉ match với trạng thái đã chọn, đảm bảo không lọc ra "finished" khi không chọn nó
        // Quan trọng: Nếu chọn "ongoing" hoặc "recruiting", không hiển thị sự kiện hết thời gian tuyển
        if (this.selectedEventStatuses.includes('ongoing') || this.selectedEventStatuses.includes('recruiting')) {
          // Nếu sự kiện hết thời gian tuyển (recruitEnd < now) và chưa bắt đầu (startDate > now)
          // thì không hiển thị khi chọn "ongoing" hoặc "recruiting"
          if (recruitEnd && recruitEnd < now && startDate > now) {
            return false;
          }
        }
        
        return this.selectedEventStatuses.includes(eventStatus);
      });
    }

    this.filteredEvents = results;
    this.eventsCurrentPage = 1; // Reset về trang 1 khi filter thay đổi
    this.updatePaginatedEvents();
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
    this.organizationsCurrentPage = 1; // Reset về trang 1 khi filter thay đổi
    this.updatePaginatedOrganizations();
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.searchLocation = '';
    this.selectedSkills = [];
    this.selectedFields = [];
    this.startDate = '';
    this.endDate = '';
    this.dateRange = null;
    this.recruitmentDateRange = null;
    this.selectedEventStatuses = [];
    this.selectedOrganizationIds = [];
    this.verifiedOnly = false;

    this.filteredEvents = [...this.allEvents];
    this.filteredOrganizations = [...this.allOrganizations];
    this.updatePaginatedEvents();
    this.updatePaginatedOrganizations();
  }

  // Multi-select methods for Skills
  toggleSkillsDropdown(): void {
    this.skillsDropdownOpen = !this.skillsDropdownOpen;
    if (this.skillsDropdownOpen) {
      this.fieldsDropdownOpen = false;
    }
  }

  toggleSkill(skillId: number): void {
    const index = this.selectedSkills.indexOf(skillId);
    if (index > -1) {
      this.selectedSkills.splice(index, 1);
    } else {
      this.selectedSkills.push(skillId);
    }
    this.search();
  }

  removeSkill(skillId: number, event: Event): void {
    event.stopPropagation();
    const index = this.selectedSkills.indexOf(skillId);
    if (index > -1) {
      this.selectedSkills.splice(index, 1);
      this.search();
    }
  }

  isSkillSelected(skillId: number): boolean {
    return this.selectedSkills.includes(skillId);
  }

  // Multi-select methods for Fields
  toggleFieldsDropdown(): void {
    this.fieldsDropdownOpen = !this.fieldsDropdownOpen;
    if (this.fieldsDropdownOpen) {
      this.skillsDropdownOpen = false;
    }
  }

  toggleField(fieldId: number): void {
    const index = this.selectedFields.indexOf(fieldId);
    if (index > -1) {
      this.selectedFields.splice(index, 1);
    } else {
      this.selectedFields.push(fieldId);
    }
    this.search();
  }

  removeField(fieldId: number, event: Event): void {
    event.stopPropagation();
    const index = this.selectedFields.indexOf(fieldId);
    if (index > -1) {
      this.selectedFields.splice(index, 1);
      this.search();
    }
  }

  isFieldSelected(fieldId: number): boolean {
    return this.selectedFields.includes(fieldId);
  }

  getSkillName(skillId: number): string {
    const skill = this.skills.find(s => s.maKyNang === skillId);
    return skill ? skill.tenKyNang : '';
  }

  getFieldName(fieldId: number): string {
    const field = this.fields.find(f => f.maLinhVuc === fieldId);
    return field ? field.tenLinhVuc : '';
  }

  // Status dropdown methods
  toggleStatusDropdown(): void {
    this.statusDropdownOpen = !this.statusDropdownOpen;
    if (this.statusDropdownOpen) {
      this.skillsDropdownOpen = false;
      this.fieldsDropdownOpen = false;
      this.organizationDropdownOpen = false;
      this.dateRangePickerOpen = false;
    }
  }

  toggleStatus(status: string): void {
    const index = this.selectedEventStatuses.indexOf(status);
    if (index > -1) {
      this.selectedEventStatuses.splice(index, 1);
    } else {
      this.selectedEventStatuses.push(status);
    }
    this.search();
  }

  removeStatus(status: string, event: Event): void {
    event.stopPropagation();
    const index = this.selectedEventStatuses.indexOf(status);
    if (index > -1) {
      this.selectedEventStatuses.splice(index, 1);
      this.search();
    }
  }

  isStatusSelected(status: string): boolean {
    return this.selectedEventStatuses.includes(status);
  }

  getStatusName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'recruiting': 'Đang tuyển',
      'upcoming': 'Sắp diễn ra',
      'ongoing': 'Đang diễn ra',
      'finished': 'Sự kiện đã kết thúc'
    };
    return statusMap[status] || status;
  }

  getSelectedStatusNames(): string {
    if (this.selectedEventStatuses.length === 0) {
      return 'Chọn trạng thái';
    }
    if (this.selectedEventStatuses.length <= 2) {
      return this.selectedEventStatuses.map(s => this.getStatusName(s)).join(', ');
    }
    return this.selectedEventStatuses.slice(0, 2).map(s => this.getStatusName(s)).join(', ') + ` +${this.selectedEventStatuses.length - 2}`;
  }

  // Date range picker methods
  toggleDateRangePicker(): void {
    this.dateRangePickerOpen = !this.dateRangePickerOpen;
    if (this.dateRangePickerOpen) {
      this.skillsDropdownOpen = false;
      this.fieldsDropdownOpen = false;
      this.statusDropdownOpen = false;
      // Initialize calendars
      const today = new Date();
      this.leftCalendarDate = new Date(today);
      this.rightCalendarDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      // If no start date, or both dates are selected, start selecting start date
      this.selectingStartDate = !this.startDate || (!!this.startDate && !!this.endDate);
    }
  }

  initializeCalendars(): void {
    const today = new Date();
    if (this.startDate) {
      const start = new Date(this.startDate);
      this.leftCalendarDate = new Date(start);
      this.rightCalendarDate = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    } else {
      this.leftCalendarDate = new Date(today);
      this.rightCalendarDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }
  }

  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Calendar navigation methods
  navigateLeftMonth(direction: number): void {
    const newDate = new Date(this.leftCalendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    this.leftCalendarDate = newDate;
    // Keep right calendar as next month
    this.rightCalendarDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1);
  }

  navigateLeftYear(direction: number): void {
    const newDate = new Date(this.leftCalendarDate);
    newDate.setFullYear(newDate.getFullYear() + direction);
    this.leftCalendarDate = newDate;
    // Keep right calendar as next month
    this.rightCalendarDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1);
  }

  navigateRightMonth(direction: number): void {
    const newDate = new Date(this.rightCalendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    this.rightCalendarDate = newDate;
    // Keep left calendar as previous month
    this.leftCalendarDate = new Date(newDate.getFullYear(), newDate.getMonth() - 1, 1);
  }

  navigateRightYear(direction: number): void {
    const newDate = new Date(this.rightCalendarDate);
    newDate.setFullYear(newDate.getFullYear() + direction);
    this.rightCalendarDate = newDate;
    // Keep left calendar as previous month
    this.leftCalendarDate = new Date(newDate.getFullYear(), newDate.getMonth() - 1, 1);
  }

  // Get calendar grid for a month
  getCalendarGrid(date: Date): any[][] {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    
    // Add days from previous month
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      currentWeek.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: year,
        isCurrentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i)
      });
    }
    
    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push({
        day: day,
        month: month,
        year: year,
        isCurrentMonth: true,
        date: new Date(year, month, day)
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add days from next month
    let nextMonthDay = 1;
    while (currentWeek.length < 7) {
      currentWeek.push({
        day: nextMonthDay,
        month: month + 1,
        year: year,
        isCurrentMonth: false,
        date: new Date(year, month + 1, nextMonthDay)
      });
      nextMonthDay++;
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }

  getMonthYearLabel(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getFullYear()} ${months[date.getMonth()]}`;
  }

  // Select date from calendar
  selectDate(day: any): void {
    const selectedDate = this.formatDateForInput(day.date);
    
    if (this.selectingStartDate || !this.startDate) {
      // Selecting start date
      this.startDate = selectedDate;
      this.startDateDisplay = this.formatDateForDisplay(this.startDate);
      this.selectingStartDate = false;
      
      // If end date is before start date, clear it
      if (this.endDate && new Date(this.endDate) < new Date(this.startDate)) {
        this.endDate = '';
        this.endDateDisplay = '';
      }
    } else {
      // Selecting end date
      if (new Date(selectedDate) >= new Date(this.startDate)) {
        this.endDate = selectedDate;
        this.endDateDisplay = this.formatDateForDisplay(this.endDate);
        this.dateRangePickerOpen = false;
        this.search();
      } else {
        // If selected date is before start date, make it the new start date
        this.startDate = selectedDate;
        this.startDateDisplay = this.formatDateForDisplay(this.startDate);
        this.endDate = '';
        this.endDateDisplay = '';
        this.selectingStartDate = false;
      }
    }
  }

  isDateSelected(date: Date, selectedDate: string): boolean {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return date.getDate() === selected.getDate() &&
           date.getMonth() === selected.getMonth() &&
           date.getFullYear() === selected.getFullYear();
  }

  isDateInRange(date: Date): boolean {
    if (!this.startDate || !this.endDate) return false;
    const dateTime = date.getTime();
    const startTime = new Date(this.startDate).getTime();
    const endTime = new Date(this.endDate).getTime();
    return dateTime > startTime && dateTime < endTime;
  }

  isStartDate(date: Date): boolean {
    return this.isDateSelected(date, this.startDate);
  }

  isEndDate(date: Date): boolean {
    return this.isDateSelected(date, this.endDate);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  // Ant Design RangePicker handler
  onDateRangeChange(dates: [Date | null, Date | null] | null): void {
    this.dateRange = dates;
    if (dates && dates[0] && dates[1]) {
      this.startDate = this.formatDateForInput(dates[0]);
      this.endDate = this.formatDateForInput(dates[1]);
      this.startDateDisplay = this.formatDateForDisplay(this.startDate);
      this.endDateDisplay = this.formatDateForDisplay(this.endDate);
      this.search();
    } else {
      this.startDate = '';
      this.endDate = '';
      this.startDateDisplay = '';
      this.endDateDisplay = '';
      this.search();
    }
  }

  onRecruitmentDateRangeChange(dates: [Date | null, Date | null] | null): void {
    this.recruitmentDateRange = dates;
    this.search();
  }

  clearDateRange(): void {
    this.dateRange = null;
    this.startDate = '';
    this.startDateDisplay = '';
    this.endDate = '';
    this.endDateDisplay = '';
    this.search();
  }

  // Organization dropdown methods
  toggleOrganizationDropdown(): void {
    // Method này không còn cần thiết vì đã dùng nz-select
    // Giữ lại để tránh lỗi nếu có nơi nào đó vẫn gọi
  }

  toggleOrganization(orgId: number): void {
    const index = this.selectedOrganizationIds.indexOf(orgId);
    if (index > -1) {
      this.selectedOrganizationIds.splice(index, 1);
    } else {
      this.selectedOrganizationIds.push(orgId);
    }
    this.search();
  }

  removeOrganization(orgId: number, event: Event): void {
    event.stopPropagation();
    const index = this.selectedOrganizationIds.indexOf(orgId);
    if (index > -1) {
      this.selectedOrganizationIds.splice(index, 1);
      this.search();
    }
  }

  isOrganizationSelected(orgId: number): boolean {
    return this.selectedOrganizationIds.includes(orgId);
  }

  getOrganizationName(orgId: number): string {
    const org = this.allOrganizations.find(o => o.maToChuc === orgId);
    return org ? org.tenToChuc : '';
  }

  // Filter function cho nz-select
  filterOrganizationOption = (searchValue: string, option: any): boolean => {
    if (!searchValue) return true;
    return fuzzyMatch(option.nzLabel || '', searchValue);
  }

  getSelectedOrganizationNames(): string {
    if (this.selectedOrganizationIds.length === 0) {
      return 'Chọn tổ chức';
    }
    if (this.selectedOrganizationIds.length <= 2) {
      return this.selectedOrganizationIds.map(id => this.getOrganizationName(id)).join(', ');
    }
    return this.selectedOrganizationIds.slice(0, 2).map(id => this.getOrganizationName(id)).join(', ') + ` +${this.selectedOrganizationIds.length - 2}`;
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-multiselect') && 
        !target.closest('.custom-select') && 
        !target.closest('.custom-daterange-picker')) {
      this.skillsDropdownOpen = false;
      this.fieldsDropdownOpen = false;
      this.statusDropdownOpen = false;
      this.organizationDropdownOpen = false;
      this.dateRangePickerOpen = false;
    }
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

  // Phân trang cho sự kiện
  updatePaginatedEvents(): void {
    const startIndex = (this.eventsCurrentPage - 1) * this.eventsItemsPerPage;
    const endIndex = startIndex + this.eventsItemsPerPage;
    this.paginatedEvents = this.filteredEvents.slice(startIndex, endIndex);
  }

  onEventsPageChange(page: number): void {
    this.eventsCurrentPage = page;
    this.updatePaginatedEvents();
    // Scroll về đầu danh sách sự kiện
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onEventsItemsPerPageChange(itemsPerPage: number): void {
    this.eventsItemsPerPage = itemsPerPage;
    this.eventsCurrentPage = 1;
    this.updatePaginatedEvents();
  }

  // Phân trang cho tổ chức
  updatePaginatedOrganizations(): void {
    const startIndex = (this.organizationsCurrentPage - 1) * this.organizationsItemsPerPage;
    const endIndex = startIndex + this.organizationsItemsPerPage;
    this.paginatedOrganizations = this.filteredOrganizations.slice(startIndex, endIndex);
  }

  onOrganizationsPageChange(page: number): void {
    this.organizationsCurrentPage = page;
    this.updatePaginatedOrganizations();
    // Scroll về đầu danh sách tổ chức
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onOrganizationsItemsPerPageChange(itemsPerPage: number): void {
    this.organizationsItemsPerPage = itemsPerPage;
    this.organizationsCurrentPage = 1;
    this.updatePaginatedOrganizations();
  }
}


