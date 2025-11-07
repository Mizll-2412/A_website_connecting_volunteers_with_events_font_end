import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';

interface EventStats {
  totalEvents: number;
  completedEvents: number;
  ongoingEvents: number;
  cancelledEvents: number;
  eventsByCategory: { [key: string]: number };
  eventsByMonth: { [key: string]: number };
}

interface OrganizationStats {
  totalOrganizations: number;
  verifiedOrganizations: number;
  pendingVerificationOrganizations: number;
  organizationsByField: { [key: string]: number };
}

interface VolunteerStats {
  totalVolunteers: number;
  volunteersByRank: { [key: string]: number };
  volunteersByGender: { [key: string]: number };
  volunteersByAgeGroup: { [key: number]: number };
}

interface OverallStats {
  totalUsers: number;
  totalEvents: number;
  totalVolunteers: number;
  totalOrganizations: number;
  totalRegistrations: number;
  registrationsByStatus: { [key: string]: number };
}

interface RatingStats {
  averageVolunteerRating: number;
  averageOrganizationRating: number;
  volunteerRatingsDistribution: { [key: number]: number };
  organizationRatingsDistribution: { [key: number]: number };
}

interface RankInfo {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.html',
  styleUrls: ['./statistics.css']
})
export class Statistics implements OnInit {
  isLoading = true;
  role: string = '';
  eventStats: EventStats | null = null;
  organizationStats: OrganizationStats | null = null;
  volunteerStats: VolunteerStats | null = null;
  overallStats: OverallStats | null = null;
  ratingStats: RatingStats | null = null;
  
  private apiUrl = `${environment.apiUrl}/statistics`;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.role = (this.authService.getRole() || '').toLowerCase();
    this.loadStatistics();
  }
  
  loadStatistics(): void {
    // Lấy thống kê sự kiện (hiển thị cho mọi vai trò)
    this.http.get<EventStats>(`${this.apiUrl}/events`).subscribe({
      next: (response) => {
        this.eventStats = response;
      },
      error: (err) => {
        console.error('Lỗi tải thống kê sự kiện:', err);
      }
    });
    
    // Chỉ Admin mới lấy các thống kê tổng quan/toàn hệ thống
    if (this.role === 'admin') {
      this.http.get<OrganizationStats>(`${this.apiUrl}/organizations`).subscribe({
        next: (response) => { this.organizationStats = response; },
        error: (err) => { console.error('Lỗi tải thống kê tổ chức:', err); }
      });
      this.http.get<VolunteerStats>(`${this.apiUrl}/volunteers`).subscribe({
        next: (response) => { this.volunteerStats = response; },
        error: (err) => { console.error('Lỗi tải thống kê tình nguyện viên:', err); }
      });
      this.http.get<any>(`${this.apiUrl}/overall`).subscribe({
        next: (response) => { 
          this.overallStats = response.data || response; 
        },
        error: (err) => { console.error('Lỗi tải thống kê tổng quan:', err); }
      });
      this.http.get<any>(`${this.apiUrl}/ratings`).subscribe({
        next: (response) => { 
          this.ratingStats = response.data || response; 
          this.isLoading = false; 
        },
        error: (err) => { console.error('Lỗi tải thống kê đánh giá:', err); this.isLoading = false; }
      });
    } else {
      // Với Organization/User: chỉ hiển thị eventStats; đánh dấu tải xong
      this.isLoading = false;
    }
  }
  
  getMonthsArray(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  
  getEventMonthPercentage(month: number): number {
    if (!this.eventStats || !this.eventStats.eventsByMonth) return 0;
    
    const currentYear = new Date().getFullYear();
    const key = month.toString();
    
    const count = this.eventStats.eventsByMonth[key] || 0;
    const maxCount = Math.max(...Object.values(this.eventStats.eventsByMonth), 1);
    
    return (count / maxCount) * 100;
  }
  
  getOrganizationVerifiedPercentage(): number {
    if (!this.organizationStats || this.organizationStats.totalOrganizations === 0) return 0;
    return (this.organizationStats.verifiedOrganizations / this.organizationStats.totalOrganizations) * 100;
  }
  
  getOrganizationPendingPercentage(): number {
    if (!this.organizationStats || this.organizationStats.totalOrganizations === 0) return 0;
    return (this.organizationStats.pendingVerificationOrganizations / this.organizationStats.totalOrganizations) * 100;
  }
  
  getOrganizationUnverifiedPercentage(): number {
    if (!this.organizationStats || this.organizationStats.totalOrganizations === 0) return 0;
    const unverified = this.organizationStats.totalOrganizations - 
                       this.organizationStats.verifiedOrganizations - 
                       this.organizationStats.pendingVerificationOrganizations;
    return (unverified / this.organizationStats.totalOrganizations) * 100;
  }
  
  getUnverifiedOrganizations(): number {
    if (!this.organizationStats) return 0;
    return this.organizationStats.totalOrganizations - 
           this.organizationStats.verifiedOrganizations - 
           this.organizationStats.pendingVerificationOrganizations;
  }
  
  getVolunteerRanks(): RankInfo[] {
    if (!this.volunteerStats || !this.volunteerStats.volunteersByRank) return [];
    
    const ranks: RankInfo[] = [];
    const total = this.volunteerStats.totalVolunteers || 1;
    
    // Màu sắc cho các cấp bậc
    const colors: Record<string, string> = {
      'Tình nguyện viên Đồng': '#cd7f32',
      'Tình nguyện viên Bạc': '#c0c0c0',
      'Tình nguyện viên Vàng': '#ffd700',
      'Tình nguyện viên Bạch Kim': '#e5e4e2',
      'Tình nguyện viên Kim Cương': '#b9f2ff'
    };
    
    for (const [name, count] of Object.entries(this.volunteerStats.volunteersByRank)) {
      ranks.push({
        name,
        count,
        percentage: (count / total) * 100,
        color: colors[name] || '#6c757d'
      });
    }
    
    return ranks;
  }
  
  getGenderPercentage(gender: string): number {
    if (!this.volunteerStats || !this.volunteerStats.volunteersByGender) return 0;
    
    const count = this.volunteerStats.volunteersByGender[gender] || 0;
    const total = this.volunteerStats.totalVolunteers || 1;
    
    return (count / total) * 100;
  }
  
  getGenderCount(gender: string): number {
    if (!this.volunteerStats || !this.volunteerStats.volunteersByGender) return 0;
    return this.volunteerStats.volunteersByGender[gender] || 0;
  }
  
  getVolunteerRatingCount(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.volunteerRatingsDistribution) return 0;
    return this.ratingStats.volunteerRatingsDistribution[rating] || 0;
  }
  
  getVolunteerRatingPercentage(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.volunteerRatingsDistribution) return 0;
    
    const count = this.ratingStats.volunteerRatingsDistribution[rating] || 0;
    const total = Object.values(this.ratingStats.volunteerRatingsDistribution).reduce((a, b) => a + b, 0) || 1;
    
    return (count / total) * 100;
  }
  
  getOrganizationRatingCount(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.organizationRatingsDistribution) return 0;
    return this.ratingStats.organizationRatingsDistribution[rating] || 0;
  }
  
  getOrganizationRatingPercentage(rating: number): number {
    if (!this.ratingStats || !this.ratingStats.organizationRatingsDistribution) return 0;
    
    const count = this.ratingStats.organizationRatingsDistribution[rating] || 0;
    const total = Object.values(this.ratingStats.organizationRatingsDistribution).reduce((a, b) => a + b, 0) || 1;
    
    return (count / total) * 100;
  }
  
  getRegistrationStatusCount(status: string): number {
    if (!this.overallStats || !this.overallStats.registrationsByStatus) return 0;
    return this.overallStats.registrationsByStatus[status] || 0;
  }
  
  getRegistrationStatusPercentage(status: string): number {
    if (!this.overallStats || !this.overallStats.registrationsByStatus) return 0;
    
    const count = this.overallStats.registrationsByStatus[status] || 0;
    const total = this.overallStats.totalRegistrations || 1;
    
    return (count / total) * 100;
  }
}
