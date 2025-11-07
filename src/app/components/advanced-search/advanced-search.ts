import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { getImageUrl, getOrgDefaultImage as getOrgDefaultImageUtil } from '../../utils/image-url.util';

interface Skill {
  maKyNang: number;
  tenKyNang: string;
}

interface Field {
  maLinhVuc: number;
  tenLinhVuc: string;
}

@Component({
  selector: 'app-advanced-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './advanced-search.html',
  styleUrls: ['./advanced-search.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdvancedSearchComponent implements OnInit {
  searchForm: FormGroup;
  showAdvancedFilters = false;
  isSearched = false;
  searchResults: any[] = [];
  
  // Danh sách dữ liệu cho các dropdown
  skills: Skill[] = [];
  fields: Field[] = [];
  locations = ['Hà Nội', 'Tp. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Khác'];
  organizations: any[] = [];
  
  private apiUrl = environment.apiUrl;
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      keyword: [''],
      searchType: ['event'],
      
      // Bộ lọc cho sự kiện
      upcoming: [false],
      ongoing: [false],
      completed: [false],
      startDate: [''],
      endDate: [''],
      location: [''],
      organization: [''],
      field: [''],
      skill: [''],
      
      // Bộ lọc cho tổ chức
      verified: [false],
      unverified: [false],
      eventCount: [''],
      
      // Bộ lọc cho tình nguyện viên
      rank: [''],
      participationCount: [''],
      rating: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
    this.loadOrganizations();
    
    // Lắng nghe thay đổi loại tìm kiếm để reset form
    this.searchForm.get('searchType')?.valueChanges.subscribe(() => {
      this.resetFilters();
    });
  }
  
  loadSkills(): void {
    this.http.get<any>(`${this.apiUrl}/kynang`).subscribe({
      next: (response) => {
        this.skills = response.data || [];
      },
      error: (err) => {
        console.error('Lỗi tải danh sách kỹ năng:', err);
        // Dữ liệu mẫu nếu API lỗi
        this.skills = [
          { maKyNang: 1, tenKyNang: 'Giao tiếp' },
          { maKyNang: 2, tenKyNang: 'Ngoại ngữ' },
          { maKyNang: 3, tenKyNang: 'Kỹ năng máy tính' },
          { maKyNang: 4, tenKyNang: 'Sơ cấp cứu' },
          { maKyNang: 5, tenKyNang: 'Tổ chức sự kiện' }
        ];
      }
    });
  }
  
  loadFields(): void {
    this.http.get<any>(`${this.apiUrl}/linhvuc`).subscribe({
      next: (response) => {
        this.fields = response.data || [];
      },
      error: (err) => {
        console.error('Lỗi tải danh sách lĩnh vực:', err);
        // Dữ liệu mẫu nếu API lỗi
        this.fields = [
          { maLinhVuc: 1, tenLinhVuc: 'Giáo dục' },
          { maLinhVuc: 2, tenLinhVuc: 'Y tế' },
          { maLinhVuc: 3, tenLinhVuc: 'Môi trường' },
          { maLinhVuc: 4, tenLinhVuc: 'Cộng đồng' },
          { maLinhVuc: 5, tenLinhVuc: 'Thể thao' }
        ];
      }
    });
  }
  
  loadOrganizations(): void {
    this.http.get<any>(`${this.apiUrl}/tochuc`).subscribe({
      next: (response) => {
        this.organizations = response.data || [];
      },
      error: (err) => {
        console.error('Lỗi tải danh sách tổ chức:', err);
        // Dữ liệu mẫu nếu API lỗi
        this.organizations = [
          { maToChuc: 1, tenToChuc: 'Quỹ Hy Vọng' },
          { maToChuc: 2, tenToChuc: 'Trái Tim Nhân Ái' },
          { maToChuc: 3, tenToChuc: 'Vì Môi Trường Xanh' }
        ];
      }
    });
  }
  
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }
  
  resetForm(): void {
    const searchType = this.searchForm.get('searchType')?.value;
    this.searchForm.reset();
    this.searchForm.patchValue({ searchType });
    this.resetFilters();
  }
  
  resetFilters(): void {
    const searchType = this.searchForm.get('searchType')?.value;
    
    // Reset các bộ lọc theo loại tìm kiếm
    if (searchType === 'event') {
      this.searchForm.patchValue({
        upcoming: false,
        ongoing: false,
        completed: false,
        startDate: '',
        endDate: '',
        location: '',
        organization: '',
        field: '',
        skill: ''
      });
    } else if (searchType === 'organization') {
      this.searchForm.patchValue({
        verified: false,
        unverified: false,
        location: '',
        field: '',
        eventCount: ''
      });
    } else if (searchType === 'volunteer') {
      this.searchForm.patchValue({
        rank: '',
        skill: '',
        field: '',
        participationCount: '',
        rating: ''
      });
    }
  }
  
  onSubmit(): void {
    this.isSearched = true;
    const formValues = this.searchForm.value;
    const searchType = formValues.searchType;
    
    // Xây dựng query params cho API
    let params: any = { keyword: formValues.keyword };
    
    if (searchType === 'event') {
      // Thêm params cho tìm kiếm sự kiện
      if (formValues.upcoming || formValues.ongoing || formValues.completed) {
        params.status = [];
        if (formValues.upcoming) params.status.push('upcoming');
        if (formValues.ongoing) params.status.push('ongoing');
        if (formValues.completed) params.status.push('completed');
      }
      
      if (formValues.startDate) params.startDate = formValues.startDate;
      if (formValues.endDate) params.endDate = formValues.endDate;
      if (formValues.location) params.location = formValues.location;
      if (formValues.organization) params.organizationId = formValues.organization;
      if (formValues.field) params.fieldId = formValues.field;
      if (formValues.skill) params.skillId = formValues.skill;
      
      this.searchEvents(params);
    } else if (searchType === 'organization') {
      // Thêm params cho tìm kiếm tổ chức
      if (formValues.verified || formValues.unverified) {
        params.verificationStatus = [];
        if (formValues.verified) params.verificationStatus.push('verified');
        if (formValues.unverified) params.verificationStatus.push('unverified');
      }
      
      if (formValues.location) params.location = formValues.location;
      if (formValues.field) params.fieldId = formValues.field;
      if (formValues.eventCount) params.eventCount = formValues.eventCount;
      
      this.searchOrganizations(params);
    } else if (searchType === 'volunteer') {
      // Thêm params cho tìm kiếm tình nguyện viên
      if (formValues.rank) params.rank = formValues.rank;
      if (formValues.skill) params.skillId = formValues.skill;
      if (formValues.field) params.fieldId = formValues.field;
      if (formValues.participationCount) params.participationCount = formValues.participationCount;
      if (formValues.rating) params.rating = formValues.rating;
      
      this.searchVolunteers(params);
    }
  }
  
  searchEvents(params: any): void {
    this.http.get<any>(`${this.apiUrl}/sukien/search`, { params }).subscribe({
      next: (response) => {
        this.searchResults = response.data || [];
        
        // Thêm tên tổ chức vào kết quả
        this.searchResults.forEach(event => {
          const org = this.organizations.find(o => o.maToChuc === event.maToChuc);
          event.tenToChuc = org ? org.tenToChuc : 'Tổ chức không xác định';
        });
      },
      error: (err) => {
        console.error('Lỗi tìm kiếm sự kiện:', err);
        this.searchResults = [];
      }
    });
  }
  
  searchOrganizations(params: any): void {
    this.http.get<any>(`${this.apiUrl}/tochuc/search`, { params }).subscribe({
      next: (response) => {
        this.searchResults = response.data || [];
      },
      error: (err) => {
        console.error('Lỗi tìm kiếm tổ chức:', err);
        this.searchResults = [];
      }
    });
  }
  
  searchVolunteers(params: any): void {
    this.http.get<any>(`${this.apiUrl}/tinhnguyenvien/search`, { params }).subscribe({
      next: (response) => {
        this.searchResults = response.data || [];
      },
      error: (err) => {
        console.error('Lỗi tìm kiếm tình nguyện viên:', err);
        this.searchResults = [];
      }
    });
  }
  
  viewDetails(type: string, id: number): void {
    if (type === 'event') {
      this.router.navigate(['/su-kien', id]);
    } else if (type === 'organization') {
      // Giả sử có trang chi tiết tổ chức
      this.router.navigate(['/organization', id]);
    } else if (type === 'volunteer') {
      // Giả sử có trang hồ sơ tình nguyện viên
      this.router.navigate(['/volunteer', id]);
    }
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  getOrgDefaultImage(): string {
    return getOrgDefaultImageUtil();
  }
}
