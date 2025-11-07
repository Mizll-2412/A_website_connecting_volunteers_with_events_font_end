import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../services/event';
import { getImageUrl as getImageUrlUtil, getOrgDefaultImage as getOrgDefaultImageUtil } from '../../../utils/image-url.util';

@Component({
  selector: 'app-organization-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './organization-card.html',
  styleUrls: ['./organization-card.css']
})
export class OrganizationCardComponent implements OnInit {
  @Input() organization: any;
  @Input() showEventCount: boolean = true;
  @Input() showRating: boolean = true;

  eventCount: number = 0;

  constructor(private eventService: EventService) {}

  ngOnInit() {
    if (this.showEventCount && this.organization?.maToChuc) {
      this.loadEventCount();
    }
  }

  loadEventCount() {
    // Nếu đã có số sự kiện trong dữ liệu thì dùng luôn
    if (this.organization.soSuKien !== undefined && this.organization.soSuKien !== null) {
      this.eventCount = this.organization.soSuKien;
      return;
    }

    // Nếu chưa có thì load từ API
    this.eventService.getEventsByOrganizationId(this.organization.maToChuc).subscribe({
      next: (response: any) => {
        const events = response?.data || response || [];
        this.eventCount = events.length;
      },
      error: () => {
        this.eventCount = 0;
      }
    });
  }

  getImageUrl(path: string | null | undefined): string {
    if (!path) return getOrgDefaultImageUtil();
    if (path.startsWith('http')) return path;
    return getImageUrlUtil(path);
  }

  getRatingStars(rating: number): number[] {
    const stars = Math.round(rating || 0);
    return Array(5).fill(0).map((_, i) => i < stars ? 1 : 0);
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
}

