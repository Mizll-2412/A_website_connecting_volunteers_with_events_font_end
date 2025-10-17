import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LocalDataService, Organization, Event, EventRegistration } from '../../services/local-data';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './organization-detail.html',
  styleUrls: ['./organization-detail.css']
})
export class OrganizationDetailComponent implements OnInit {
  organizationId?: number;
  organization?: Organization;
  events: Event[] = [];
  activeEvents: Event[] = [];
  completedEvents: Event[] = [];
  registrations: EventRegistration[] = [];
  
  isLoggedIn = false;
  username = '';
  role = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private localDataService: LocalDataService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isAuthenticated();
    if (this.isLoggedIn) {
      this.username = this.auth.getUsername();
      this.role = this.auth.getRole();
    }
    
    this.route.params.subscribe(params => {
      this.organizationId = +params['id']; // Chuyển đổi string sang number
      if (this.organizationId) {
        this.loadOrganizationDetails();
      } else {
        this.router.navigate(['/organization']);
      }
    });
  }

  loadOrganizationDetails(): void {
    if (!this.organizationId) return;
    
    // Lấy thông tin tổ chức từ LocalStorage
    this.organization = this.localDataService.getOrganizationById(this.organizationId);
    
    if (!this.organization) {
      // Nếu không tìm thấy tổ chức, quay lại trang danh sách
      this.router.navigate(['/organization']);
      return;
    }
    
    // Lấy danh sách sự kiện của tổ chức
    this.events = this.localDataService.getEventsByOrganization(this.organizationId);
    
    // Phân loại sự kiện
    this.activeEvents = this.events.filter(e => e.status === 'active');
    this.completedEvents = this.events.filter(e => e.status === 'completed');
    
    // Lấy tất cả đăng ký cho các sự kiện của tổ chức này
    this.events.forEach(event => {
      const eventRegistrations = this.localDataService.getRegistrationsByEvent(event.id);
      this.registrations = [...this.registrations, ...eventRegistrations];
    });
  }

  getVerificationStatusText(status: string): string {
    switch (status) {
      case 'verified':
        return 'Đã xác minh';
      case 'pending':
        return 'Chờ xác minh';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return 'Không xác định';
    }
  }
  
  getVerificationStatusClass(status: string): string {
    switch (status) {
      case 'verified':
        return 'bg-success';
      case 'pending':
        return 'bg-warning';
      case 'rejected':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  getEventStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'Đang diễn ra';
      case 'completed':
        return 'Đã hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      case 'draft':
        return 'Bản nháp';
      default:
        return 'Không xác định';
    }
  }
  
  getEventStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-success';
      case 'completed':
        return 'bg-info';
      case 'cancelled':
        return 'bg-danger';
      case 'draft':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }
  
  viewEventDetails(eventId: number): void {
    this.router.navigate(['/su-kien', eventId]);
  }
  
  getApprovedRegistrationsCount(eventId: number): number {
    return this.registrations.filter(r => r.eventId === eventId && r.status === 'approved').length;
  }
}
