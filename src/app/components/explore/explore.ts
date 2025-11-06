import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventService } from '../../services/event';
import { ToChucService } from '../../services/organization';

declare var bootstrap: any;

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
    private orgService: ToChucService
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
        (e.diaChi || '').toLowerCase().includes(q)
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
    this.selectedOrg = org;
    const modalEl = document.getElementById('orgDetailModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }
}


