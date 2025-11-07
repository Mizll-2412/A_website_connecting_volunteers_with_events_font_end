import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToChucService } from '../../services/organization';
import { EventService } from '../../services/event';
import { getImageUrl, getOrgDefaultImage as getOrgDefaultImageUtil } from '../../utils/image-url.util';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './organization-detail.html',
  styleUrls: ['./organization-detail.css']
})
export class OrganizationDetailComponent implements OnInit {
  organizationId?: number;
  organization: any = null;
  events: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: ToChucService,
    private eventService: EventService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.organizationId = +params['id'];
      if (this.organizationId) {
        this.loadOrganizationDetails(this.organizationId);
        this.loadOrganizationEvents(this.organizationId);
      }
    });
  }

  loadOrganizationDetails(id: number): void {
    this.isLoading = true;
    this.orgService.getOrganizationById(id).subscribe({
      next: (response: any) => {
        this.organization = response.data || response;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải thông tin tổ chức:', err);
        this.errorMessage = 'Không thể tải thông tin tổ chức';
        this.isLoading = false;
      }
    });
  }

  loadOrganizationEvents(orgId: number): void {
    this.eventService.getEventsByOrganization(orgId).subscribe({
      next: (response: any) => {
        this.events = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách sự kiện:', err);
        this.events = [];
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/explore']);
  }

  formatDate(dateStr?: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  }

  getStatusText(status: number | string | undefined): string {
    if (typeof status === 'string') {
      return status;
    }
    if (typeof status === 'number') {
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

  getStatusClass(status: number | string | undefined): string {
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
        case 0: return 'bg-warning';
        case 1: return 'bg-success';
        case 2: return 'bg-danger';
        case 3: return 'bg-info';
        default: return 'bg-secondary';
      }
    }
    return 'bg-secondary';
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  getOrgDefaultImage(): string {
    return getOrgDefaultImageUtil();
  }
}

