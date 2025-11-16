import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { EventCardComponent } from '../shared/event-card/event-card';
import { OrganizationCardComponent } from '../shared/organization-card/organization-card';
import { fuzzyMatch } from '../../utils/fuzzy-search.util';
import { getImageUrl, getOrgDefaultImage as getOrgDefaultImageUtil } from '../../utils/image-url.util';

declare var bootstrap: any;

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EventCardComponent, OrganizationCardComponent],
  templateUrl: './explore.html',
  styleUrls: ['./explore.css']
})
export class ExploreComponent implements OnInit {
  searchTerm = '';
  activeTab: 'all' | 'events' | 'orgs' = 'all';
  isLoading = false;
  errorMessage = '';

  events: any[] = [];
  organizations: any[] = [];

  filteredEvents: any[] = [];
  filteredOrgs: any[] = [];
  
  selectedOrg: any = null;

  constructor(
    private eventService: EventService,
    private orgService: ToChucService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    let eventsLoaded = false;
    let orgsLoaded = false;

    this.eventService.getAllSuKien().subscribe({
      next: (resp: any) => {
        this.events = resp?.data || resp || [];
        eventsLoaded = true;
        // Enrich events with organization data if organizations are already loaded
        if (orgsLoaded && this.organizations.length > 0) {
          this.enrichEventsWithOrganizationData();
        }
        this.applyFilter();
        this.isLoading = !(eventsLoaded && orgsLoaded);
      },
      error: () => {
        this.events = [];
        eventsLoaded = true;
        this.isLoading = !(eventsLoaded && orgsLoaded);
      }
    });

    this.orgService.getAllOrganizations().subscribe({
      next: (resp: any) => {
        this.organizations = resp?.data || resp || [];
        orgsLoaded = true;
        // Enrich events with organization data if events are already loaded
        if (eventsLoaded && this.events.length > 0) {
          this.enrichEventsWithOrganizationData();
        }
        this.applyFilter();
        this.isLoading = !(eventsLoaded && orgsLoaded);
      },
      error: () => {
        this.organizations = [];
        orgsLoaded = true;
        this.isLoading = !(eventsLoaded && orgsLoaded);
      }
    });
  }

  enrichEventsWithOrganizationData(): void {
    // Create a map of organizations by maToChuc for quick lookup
    const orgMap = new Map<number, any>();
    this.organizations.forEach((org: any) => {
      if (org.maToChuc) {
        orgMap.set(org.maToChuc, org);
      }
    });

    // Enrich each event with organization information
    this.events = this.events.map((event: any) => {
      if (event.maToChuc && orgMap.has(event.maToChuc)) {
        const org = orgMap.get(event.maToChuc);
        return {
          ...event,
          tenToChuc: org.tenToChuc || event.tenToChuc,
          organization: org,
          trangThaiXacMinhToChuc: org.trangThaiXacMinh
        };
      }
      return event;
    });
  }

  // Helper function để kiểm tra sự kiện đã hết hạn tuyển
  isEventRecruitmentExpired(event: any): boolean {
    const now = new Date();
    const recruitEnd = event?.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
    return recruitEnd !== null && recruitEnd < now;
  }

  // Helper function để kiểm tra sự kiện đã kết thúc
  isEventEnded(event: any): boolean {
    const now = new Date();
    if (event?.trangThai === 'Đã kết thúc' || event?.trangThai === 'Sự kiện đã kết thúc') {
      return true;
    }
    const endDate = event?.ngayKetThuc ? new Date(event.ngayKetThuc) : null;
    return endDate !== null && endDate < now;
  }

  // Helper function để kiểm tra sự kiện còn hoạt động (đang tuyển hoặc đang diễn ra)
  isEventActive(event: any): boolean {
    const now = new Date();
    const startDate = event?.ngayBatDau ? new Date(event.ngayBatDau) : null;
    const endDate = event?.ngayKetThuc ? new Date(event.ngayKetThuc) : null;
    const recruitStart = event?.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
    const recruitEnd = event?.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
    
    // Kiểm tra đang diễn ra
    if (startDate && endDate && startDate <= now && now <= endDate) {
      return true;
    }
    
    // Kiểm tra đang tuyển (chưa hết hạn tuyển)
    if (recruitStart && recruitEnd && recruitStart <= now && now <= recruitEnd) {
      return true;
    }
    
    return false;
  }

  setTab(tab: 'all' | 'events' | 'orgs'): void {
    this.activeTab = tab;
  }

  applyFilter(): void {
    const q = (this.searchTerm || '').trim();
    
    // Không lọc bỏ sự kiện - hiển thị tất cả, nhưng sắp xếp theo ưu tiên
    let eventsToFilter = [...this.events];
    
    // Sắp xếp: Sự kiện còn hoạt động (đang tuyển/đang diễn ra) lên trên, sau đó là sự kiện đã kết thúc/hết hạn
    // Trong mỗi nhóm, sắp xếp theo ngày tạo giảm dần (mới nhất lên đầu)
    eventsToFilter = eventsToFilter.sort((a: any, b: any) => {
      const isActiveA = this.isEventActive(a);
      const isActiveB = this.isEventActive(b);
      
      // Nhóm 1 (ưu tiên): Sự kiện còn hoạt động
      // Nhóm 2: Sự kiện đã kết thúc/hết hạn
      if (isActiveA && !isActiveB) return -1; // A lên trên
      if (!isActiveA && isActiveB) return 1;  // B lên trên
      
      // Cùng nhóm: sắp xếp theo ngày tạo giảm dần (mới nhất trước)
      const dateA = a?.ngayTao ? new Date(a.ngayTao).getTime() : 0;
      const dateB = b?.ngayTao ? new Date(b.ngayTao).getTime() : 0;
      return dateB - dateA;
    });
    
    if (!q) {
      this.filteredEvents = eventsToFilter;
      this.filteredOrgs = [...this.organizations];
      return;
    }
    
    // Áp dụng tìm kiếm trên danh sách đã sắp xếp
    this.filteredEvents = eventsToFilter.filter((e: any) => {
      return (
        fuzzyMatch(e.tenSuKien || '', q) ||
        fuzzyMatch(e.noiDung || '', q) ||
        fuzzyMatch(e.diaChi || '', q) ||
        fuzzyMatch(e.tenToChuc || '', q) ||
        fuzzyMatch(e.organization?.tenToChuc || '', q)
      );
    });
    this.filteredOrgs = this.organizations.filter((o: any) => {
      return (
        fuzzyMatch(o.tenToChuc || '', q) ||
        fuzzyMatch(o.email || '', q) ||
        fuzzyMatch(o.diaChi || '', q)
      );
    });
  }
  
  viewOrganizationDetail(org: any): void {
    // Navigate to organization detail page instead of showing modal
    this.router.navigate(['/to-chuc', org.maToChuc]);
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  getOrgDefaultImage(): string {
    return getOrgDefaultImageUtil();
  }
}


