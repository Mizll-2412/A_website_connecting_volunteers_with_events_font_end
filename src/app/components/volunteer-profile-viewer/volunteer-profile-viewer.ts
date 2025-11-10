import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TinhNguyenVienService } from '../../services/volunteer';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';
import { EvaluationService } from '../../services/evaluation.service';
import { RegistrationService } from '../../services/registration';
import { CertificateService } from '../../services/certificate.service';
import { getImageUrl } from '../../utils/image-url.util';
import { environment } from '../../../environments/environment';

interface Volunteer {
  maTNV: number;
  hoTen?: string;
  email?: string;
  soDienThoai?: string;
  diaChi?: string;
  ngaySinh?: string;
  gioiThieu?: string;
  anhDaiDien?: string;
  danhGiaTrungBinh?: number;
  kyNangIds?: number[];
  linhVucIds?: number[];
  kyNangs?: any[];
  linhVucs?: any[];
}

@Component({
  selector: 'app-volunteer-profile-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './volunteer-profile-viewer.html',
  styleUrls: ['./volunteer-profile-viewer.css']
})
export class VolunteerProfileViewerComponent implements OnInit {
  @Input() maTNV?: number;
  @Input() volunteer?: Volunteer;

  volunteerDetail: any = null;
  isLoading = false;
  skills: any[] = [];
  fields: any[] = [];
  modalId = `volunteerProfileModal_${Math.random().toString(36).substr(2, 9)}`;
  
  // Tab navigation
  activeTab: string = 'info';
  
  // Data cho các tabs
  evaluations: any[] = [];
  activeEvents: any[] = [];
  finishedEvents: any[] = [];
  certificates: any[] = [];
  
  // Loading states
  isLoadingEvaluations = false;
  isLoadingEvents = false;
  isLoadingCertificates = false;
  
  // API URL
  private apiUrl = environment.apiUrl;

  constructor(
    private volunteerService: TinhNguyenVienService,
    private skillService: SkillService,
    private fieldService: FieldService,
    private evaluationService: EvaluationService,
    private registrationService: RegistrationService,
    private certificateService: CertificateService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
  }

  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.skills = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách kỹ năng:', err);
        this.skills = [];
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.fields = response.data || response || [];
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách lĩnh vực:', err);
        this.fields = [];
      }
    });
  }

  open(maTNV?: number, volunteer?: Volunteer): void {
    const targetMaTNV = maTNV || this.maTNV || volunteer?.maTNV;
    
    if (!targetMaTNV) {
      console.error('Không có maTNV để hiển thị hồ sơ');
      return;
    }

    this.isLoading = true;
    this.volunteerDetail = null;
    this.activeTab = 'info'; // Reset về tab thông tin

    // Load thông tin chi tiết TNV
    this.volunteerService.getVolunteerById(targetMaTNV).subscribe({
      next: (response: any) => {
        this.volunteerDetail = response.data || response;
        this.isLoading = false;
        
        // Mở modal
        const modalEl = document.getElementById(this.modalId);
        if (modalEl && (window as any).bootstrap) {
          const modal = new (window as any).bootstrap.Modal(modalEl);
          modal.show();
        }
      },
      error: (err) => {
        console.error('Lỗi tải chi tiết TNV:', err);
        this.isLoading = false;
        alert('Không thể tải thông tin chi tiết');
      }
    });
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
    
    // Load dữ liệu cho tab tương ứng
    if (tab === 'evaluations' && this.evaluations.length === 0) {
      this.loadEvaluations();
    } else if (tab === 'active-events' && this.activeEvents.length === 0) {
      this.loadEvents();
    } else if (tab === 'finished-events' && this.finishedEvents.length === 0) {
      this.loadEvents();
    } else if (tab === 'certificates' && this.certificates.length === 0) {
      this.loadCertificates();
    }
  }

  loadEvaluations(): void {
    if (!this.volunteerDetail?.maTaiKhoan) return;
    
    this.isLoadingEvaluations = true;
    this.evaluationService.getEvaluationsForUser(this.volunteerDetail.maTaiKhoan).subscribe({
      next: (response: any) => {
        this.evaluations = response.data || response || [];
        this.isLoadingEvaluations = false;
      },
      error: (err) => {
        console.error('Lỗi tải đánh giá:', err);
        this.isLoadingEvaluations = false;
      }
    });
  }

  loadEvents(): void {
    if (!this.volunteerDetail?.maTNV) return;
    
    this.isLoadingEvents = true;
    this.registrationService.getRegistrationsByVolunteer(this.volunteerDetail.maTNV).subscribe({
      next: (response: any) => {
        const registrations = response.data || response || [];
        console.log('Danh sách đăng ký gốc:', registrations);
        
        const now = new Date();
        
        // Phân loại sự kiện - backend đã trả về thông tin event đầy đủ
        this.activeEvents = registrations.filter((reg: any) => {
          if (!reg.event || !reg.event.ngayKetThuc) return false;
          const endDate = new Date(reg.event.ngayKetThuc);
          // Bao gồm cả trạng thái chờ duyệt (0) và đã duyệt (1)
          return endDate >= now && (reg.trangThai === 0 || reg.trangThai === 1);
        });
        
        this.finishedEvents = registrations.filter((reg: any) => {
          if (!reg.event || !reg.event.ngayKetThuc) return false;
          const endDate = new Date(reg.event.ngayKetThuc);
          // Chỉ hiển thị sự kiện đã duyệt (1) và đã kết thúc
          return endDate < now && reg.trangThai === 1;
        });
        
        console.log('Sự kiện đang tham gia:', this.activeEvents);
        console.log('Sự kiện đã tham gia:', this.finishedEvents);
        
        this.isLoadingEvents = false;
      },
      error: (err) => {
        console.error('Lỗi tải sự kiện:', err);
        this.isLoadingEvents = false;
      }
    });
  }

  loadCertificates(): void {
    if (!this.volunteerDetail?.maTNV) return;
    
    this.isLoadingCertificates = true;
    this.certificateService.getCertificatesByVolunteer(this.volunteerDetail.maTNV).subscribe({
      next: (response: any) => {
        this.certificates = response.data || response || [];
        this.isLoadingCertificates = false;
      },
      error: (err) => {
        console.error('Lỗi tải chứng nhận:', err);
        this.isLoadingCertificates = false;
      }
    });
  }

  getStarRating(rating: number | undefined): string[] {
    if (!rating) rating = 0;
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return [
      ...Array(fullStars).fill('full'),
      ...(halfStar ? ['half'] : []),
      ...Array(emptyStars).fill('empty')
    ];
  }

  getDetailSkills(detail: any): any[] {
    if (detail?.kyNangs && Array.isArray(detail.kyNangs)) {
      return detail.kyNangs; // Nếu đã có objects
    }
    if (detail?.kyNangIds && Array.isArray(detail.kyNangIds)) {
      return detail.kyNangIds
        .map((id: number) => this.skills.find(s => s.maKyNang === id))
        .filter((skill: any) => skill != null);
    }
    return [];
  }

  getDetailFields(detail: any): any[] {
    if (detail?.linhVucs && Array.isArray(detail.linhVucs)) {
      return detail.linhVucs; // Nếu đã có objects
    }
    if (detail?.linhVucIds && Array.isArray(detail.linhVucIds)) {
      return detail.linhVucIds
        .map((id: number) => this.fields.find(f => f.maLinhVuc === id))
        .filter((field: any) => field != null);
    }
    return [];
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }
}

