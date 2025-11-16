import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ToChucService } from '../../services/organization';
import { EventService } from '../../services/event';
import { EvaluationService } from '../../services/evaluation.service';
import { getImageUrl, getOrgDefaultImage as getOrgDefaultImageUtil } from '../../utils/image-url.util';
import { EventCardComponent } from '../shared/event-card/event-card';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, EventCardComponent],
  templateUrl: './organization-detail.html',
  styleUrls: ['./organization-detail.css']
})
export class OrganizationDetailComponent implements OnInit {
  organizationId?: number;
  organization: any = null;
  events: any[] = [];
  evaluations: any[] = [];
  isLoading = false;
  isLoadingEvaluations = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: ToChucService,
    private eventService: EventService,
    private evaluationService: EvaluationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.organizationId = +params['id'];
      if (this.organizationId) {
        this.loadOrganizationDetails(this.organizationId);
        this.loadOrganizationEvents(this.organizationId);
        this.loadOrganizationEvaluations(this.organizationId);
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

  getStatusText(event: any): string {
    // Ưu tiên sử dụng trangThaiHienThi từ backend nếu có
    if (event?.trangThaiHienThi) {
      return event.trangThaiHienThi;
    }
    
    // Nếu có status dạng string, trả về luôn
    if (typeof event?.trangThai === 'string') {
      if (event.trangThai === 'Đã kết thúc' || event.trangThai === 'Sự kiện đã kết thúc') {
        return 'Sự kiện đã kết thúc';
      }
      return event.trangThai;
    }
    
    // Tính toán trạng thái dựa trên ngày thực tế
    if (event?.ngayBatDau && event?.ngayKetThuc) {
      const now = new Date();
      const startDate = new Date(event.ngayBatDau);
      const endDate = new Date(event.ngayKetThuc);
      const recruitStart = event.tuyenBatDau ? new Date(event.tuyenBatDau) : null;
      const recruitEnd = event.tuyenKetThuc ? new Date(event.tuyenKetThuc) : null;
      
      // Kiểm tra đã kết thúc
      if (endDate < now) {
        return 'Sự kiện đã kết thúc';
      }
      
      // Kiểm tra đang diễn ra
      if (startDate <= now && endDate >= now) {
        return 'Đang diễn ra';
      }
      
      // Kiểm tra đang tuyển
      if (recruitStart && recruitEnd && recruitStart <= now && recruitEnd >= now) {
        return 'Đang tuyển';
      }
      
      // Sắp diễn ra
      if (startDate > now) {
        return 'Sắp diễn ra';
      }
    }
    
    // Fallback: sử dụng status number nếu có
    if (typeof event?.trangThai === 'number') {
      switch (event.trangThai) {
        case 0: return 'Đang tuyển';
        case 1: return 'Đã duyệt';
        case 2: return 'Đã hủy';
        case 3: return 'Đã kết thúc';
        default: return 'Đang tuyển';
      }
    }
    
    return 'Đang tuyển';
  }

  getStatusClass(event: any): string {
    const status = this.getStatusText(event);
    
    if (status === 'Sự kiện đã kết thúc' || status === 'Đã kết thúc') {
      return 'bg-secondary';
    } else if (status === 'Đang diễn ra') {
      return 'bg-success';
    } else if (status === 'Đang tuyển') {
      return 'bg-warning';
    } else if (status === 'Sắp diễn ra') {
      return 'bg-info';
    } else if (status === 'Đã hủy' || status === 'Hủy bỏ') {
      return 'bg-danger';
    }
    
    return 'bg-secondary';
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  getOrgDefaultImage(): string {
    return getOrgDefaultImageUtil();
  }

  loadOrganizationEvaluations(orgId: number): void {
    this.isLoadingEvaluations = true;
    
    // Lấy tất cả đánh giá từ các sự kiện của tổ chức
    // Lấy danh sách event IDs trước
    this.eventService.getEventsByOrganization(orgId).subscribe({
      next: (eventsResponse: any) => {
        const orgEvents = eventsResponse.data || eventsResponse || [];
        const eventIds = orgEvents.map((e: any) => e.maSuKien).filter((id: any) => id);
        
        if (eventIds.length === 0) {
          this.evaluations = [];
          this.isLoadingEvaluations = false;
          return;
        }
        
        // Load đánh giá từ tất cả các sự kiện
        // Lọc chỉ lấy đánh giá từ TNV đến tổ chức (vaiTroNguoiDanhGia = 'User', vaiTroNguoiDuocDanhGia = 'Organization')
        const allEvaluations: any[] = [];
        let loadedCount = 0;
        
        eventIds.forEach((eventId: number) => {
          this.evaluationService.getEvaluationsByEvent(eventId).subscribe({
            next: (response: any) => {
              const evals = response.data || response || [];
              // Lọc chỉ lấy đánh giá từ User đến Organization
              const filteredEvals = evals.filter((e: any) => 
                e.vaiTroNguoiDanhGia === 'User' && 
                e.vaiTroNguoiDuocDanhGia === 'Organization'
              );
              allEvaluations.push(...filteredEvals);
              
              loadedCount++;
              if (loadedCount === eventIds.length) {
                // Sắp xếp theo ngày tạo mới nhất
                this.evaluations = allEvaluations.sort((a, b) => {
                  const dateA = new Date(a.ngayTao || 0).getTime();
                  const dateB = new Date(b.ngayTao || 0).getTime();
                  return dateB - dateA;
                });
                this.isLoadingEvaluations = false;
              }
            },
            error: (err) => {
              console.error(`Lỗi khi tải đánh giá cho sự kiện ${eventId}:`, err);
              loadedCount++;
              if (loadedCount === eventIds.length) {
                this.evaluations = allEvaluations.sort((a, b) => {
                  const dateA = new Date(a.ngayTao || 0).getTime();
                  const dateB = new Date(b.ngayTao || 0).getTime();
                  return dateB - dateA;
                });
                this.isLoadingEvaluations = false;
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách sự kiện để lấy đánh giá:', err);
        this.isLoadingEvaluations = false;
      }
    });
  }

  formatDateTime(dateStr?: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

