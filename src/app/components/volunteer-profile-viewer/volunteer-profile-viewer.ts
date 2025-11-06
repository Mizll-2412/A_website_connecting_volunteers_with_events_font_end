import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TinhNguyenVienService } from '../../services/volunteer';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';

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

  constructor(
    private volunteerService: TinhNguyenVienService,
    private skillService: SkillService,
    private fieldService: FieldService
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
}

