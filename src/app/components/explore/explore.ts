import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';
import { EventCardComponent } from '../shared/event-card/event-card';
import { OrganizationCardComponent } from '../shared/organization-card/organization-card';
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

  setTab(tab: 'all' | 'events' | 'orgs'): void {
    this.activeTab = tab;
  }

  applyFilter(): void {
    const q = (this.searchTerm || '').trim().toLowerCase();
    if (!q) {
      this.filteredEvents = [...this.events];
      this.filteredOrgs = [...this.organizations];
      return;
    }
    this.filteredEvents = this.events.filter((e: any) => {
      return (
        (e.tenSuKien || '').toLowerCase().includes(q) ||
        (e.noiDung || '').toLowerCase().includes(q) ||
        (e.diaChi || '').toLowerCase().includes(q) ||
        (e.tenToChuc || '').toLowerCase().includes(q) ||
        (e.organization?.tenToChuc || '').toLowerCase().includes(q)
      );
    });
    this.filteredOrgs = this.organizations.filter((o: any) => {
      return (
        (o.tenToChuc || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.diaChi || '').toLowerCase().includes(q)
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


