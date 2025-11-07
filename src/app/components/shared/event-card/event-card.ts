import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { getImageUrl } from '../../../utils/image-url.util';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-card.html',
  styleUrls: ['./event-card.css']
})
export class EventCardComponent implements OnInit, OnChanges {
  @Input() event: any;
  @Input() showOrganization: boolean = true;
  @Input() showSkills: boolean = true;
  @Input() showFields: boolean = true;

  skills: any[] = [];
  fields: any[] = [];
  allSkills: any[] = [];
  allFields: any[] = [];
  masterDataLoaded = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadMasterData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['event'] && this.masterDataLoaded) {
      this.updateSkillsAndFields();
    }
  }

  loadMasterData() {
    // Load skills
    this.http.get<any>(`${environment.apiUrl}/kynang`).subscribe({
      next: (response) => {
        this.allSkills = response.data || response || [];
        this.checkMasterDataLoaded();
      }
    });

    // Load fields
    this.http.get<any>(`${environment.apiUrl}/linhvuc`).subscribe({
      next: (response) => {
        this.allFields = response.data || response || [];
        this.checkMasterDataLoaded();
      }
    });
  }

  checkMasterDataLoaded() {
    if (this.allSkills.length > 0 && this.allFields.length > 0) {
      this.masterDataLoaded = true;
      this.updateSkillsAndFields();
    }
  }

  updateSkillsAndFields() {
    // Nếu có kyNangs object thì dùng trực tiếp
    if (this.event?.kyNangs && Array.isArray(this.event.kyNangs)) {
      this.skills = this.event.kyNangs.slice(0, 2);
    } 
    // Nếu chỉ có kyNangIds thì map từ allSkills
    else if (this.event?.kyNangIds && Array.isArray(this.event.kyNangIds) && this.allSkills.length > 0) {
      this.skills = this.event.kyNangIds
        .slice(0, 2)
        .map((id: number) => this.allSkills.find(s => s.maKyNang === id))
        .filter((s: any) => s != null);
    } else {
      this.skills = [];
    }

    // Tương tự cho fields
    if (this.event?.linhVucs && Array.isArray(this.event.linhVucs)) {
      this.fields = this.event.linhVucs.slice(0, 2);
    } 
    else if (this.event?.linhVucIds && Array.isArray(this.event.linhVucIds) && this.allFields.length > 0) {
      this.fields = this.event.linhVucIds
        .slice(0, 2)
        .map((id: number) => this.allFields.find(f => f.maLinhVuc === id))
        .filter((f: any) => f != null);
    } else {
      this.fields = [];
    }
  }

  getImageUrl(path: string | null | undefined): string {
    if (!path) return 'assets/event-default.jpg';
    if (path.startsWith('http')) return path;
    return getImageUrl(path);
  }

  getEventStatus(event: any): string {
    if (!event?.ngayBatDau) return 'Sắp diễn ra';
    const now = new Date();
    const start = new Date(event.ngayBatDau);
    const end = event.ngayKetThuc ? new Date(event.ngayKetThuc) : start;

    if (now < start) return 'Sắp diễn ra';
    if (now >= start && now <= end) return 'Đang diễn ra';
    return 'Đã kết thúc';
  }

  getEventStatusClass(event: any): string {
    const status = this.getEventStatus(event);
    if (status === 'Sắp diễn ra') return 'badge bg-info';
    if (status === 'Đang diễn ra') return 'badge bg-success';
    return 'badge bg-secondary';
  }

  formatDate(dateStr?: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  }

  getSkills(): any[] {
    return this.skills;
  }

  getFields(): any[] {
    return this.fields;
  }
}

