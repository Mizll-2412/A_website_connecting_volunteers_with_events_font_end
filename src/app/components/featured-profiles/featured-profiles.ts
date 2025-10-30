import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { TinhNguyenVienService } from '../../services/volunteer';
import { SkillService } from '../../services/skill';
import { FieldService } from '../../services/field';

interface Volunteer {
  maTNV: number;
  maTaiKhoan: number;
  hoTen: string;
  anhDaiDien?: string;
  email: string;
  soDienThoai?: string;
  gioiThieu?: string;
  ngaySinh?: string;
  diaChi?: string;
  kyNangs?: any[];
  linhVucs?: any[];
  danhGiaTrungBinh?: number;
}

@Component({
  selector: 'app-featured-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './featured-profiles.html',
  styleUrls: ['./featured-profiles.css']
})
export class FeaturedProfilesComponent implements OnInit {
  volunteers: Volunteer[] = [];
  filteredVolunteers: Volunteer[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Lọc
  searchQuery: string = '';
  selectedSkills: number[] = [];
  selectedFields: number[] = [];
  
  // Danh sách kỹ năng và lĩnh vực để lọc
  skills: any[] = [];
  fields: any[] = [];
  
  // Phân trang đơn giản
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  constructor(
    private volunteerService: TinhNguyenVienService,
    private skillService: SkillService,
    private fieldService: FieldService
  ) { }

  ngOnInit(): void {
    this.loadSkills();
    this.loadFields();
    this.loadFeaturedVolunteers();
  }

  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.skills = response.data || response;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách kỹ năng:', err);
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.fields = response.data || response;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách lĩnh vực:', err);
      }
    });
  }

  loadFeaturedVolunteers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.volunteerService.getFeaturedVolunteers().subscribe({
      next: (response: any) => {
        if (response && response.data && Array.isArray(response.data)) {
          this.volunteers = response.data;
        } else if (Array.isArray(response)) {
          this.volunteers = response;
        } else {
          this.volunteers = [];
          this.errorMessage = 'Không thể tải danh sách tình nguyện viên';
        }
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Lỗi khi tải danh sách tình nguyện viên:', err);
        this.errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
        this.isLoading = false;
        
        // Dữ liệu mẫu cho mục đích phát triển
        this.loadMockData();
      }
    });
  }

  loadMockData(): void {
    // Dữ liệu mẫu để hiển thị khi API lỗi
    this.volunteers = [
      {
        maTNV: 1,
        maTaiKhoan: 101,
        hoTen: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        soDienThoai: '0123456789',
        diaChi: 'Hà Nội',
        gioiThieu: 'Tôi là sinh viên năm cuối đại học, có nhiều kinh nghiệm trong các hoạt động tình nguyện.',
        danhGiaTrungBinh: 4.5,
        kyNangs: [
          { maKyNang: 1, tenKyNang: 'Dạy học' },
          { maKyNang: 3, tenKyNang: 'Tổ chức sự kiện' }
        ],
        linhVucs: [
          { maLinhVuc: 2, tenLinhVuc: 'Giáo dục' }
        ]
      },
      {
        maTNV: 2,
        maTaiKhoan: 102,
        hoTen: 'Trần Thị B',
        email: 'tranthib@example.com',
        soDienThoai: '0987654321',
        diaChi: 'TP HCM',
        gioiThieu: 'Tôi có 5 năm kinh nghiệm trong các dự án cộng đồng và hoạt động xã hội.',
        danhGiaTrungBinh: 4.8,
        kyNangs: [
          { maKyNang: 2, tenKyNang: 'Y tế' },
          { maKyNang: 5, tenKyNang: 'Quản lý dự án' }
        ],
        linhVucs: [
          { maLinhVuc: 1, tenLinhVuc: 'Y tế' },
          { maLinhVuc: 3, tenLinhVuc: 'Phát triển cộng đồng' }
        ]
      }
    ];
    
    this.applyFilters();
  }

  applyFilters(): void {
    let results = [...this.volunteers];
    
    // Lọc theo từ khóa tìm kiếm
    if (this.searchQuery) {
      const keyword = this.searchQuery.toLowerCase();
      results = results.filter(vol => 
        vol.hoTen?.toLowerCase().includes(keyword) || 
        vol.email?.toLowerCase().includes(keyword) || 
        vol.diaChi?.toLowerCase().includes(keyword) ||
        vol.gioiThieu?.toLowerCase().includes(keyword)
      );
    }
    
    // Lọc theo kỹ năng
    if (this.selectedSkills.length > 0) {
      results = results.filter(vol => {
        if (!vol.kyNangs || !Array.isArray(vol.kyNangs)) return false;
        return this.selectedSkills.some(skillId => 
          vol.kyNangs!.some(skill => skill.maKyNang === skillId)
        );
      });
    }
    
    // Lọc theo lĩnh vực
    if (this.selectedFields.length > 0) {
      results = results.filter(vol => {
        if (!vol.linhVucs || !Array.isArray(vol.linhVucs)) return false;
        return this.selectedFields.some(fieldId => 
          vol.linhVucs!.some(field => field.maLinhVuc === fieldId)
        );
      });
    }
    
    // Cập nhật danh sách đã lọc và tính toán phân trang
    this.filteredVolunteers = results;
    this.totalPages = Math.ceil(results.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  toggleSkill(skillId: number): void {
    const index = this.selectedSkills.indexOf(skillId);
    if (index === -1) {
      this.selectedSkills.push(skillId);
    } else {
      this.selectedSkills.splice(index, 1);
    }
    this.applyFilters();
  }

  toggleField(fieldId: number): void {
    const index = this.selectedFields.indexOf(fieldId);
    if (index === -1) {
      this.selectedFields.push(fieldId);
    } else {
      this.selectedFields.splice(index, 1);
    }
    this.applyFilters();
  }

  search(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedSkills = [];
    this.selectedFields = [];
    this.applyFilters();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getCurrentPageItems(): Volunteer[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVolunteers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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

  viewVolunteerProfile(volunteerId: number): void {
    // Điều hướng đến trang profile của tình nguyện viên (nếu có)
    console.log('Xem chi tiết tình nguyện viên:', volunteerId);
    // Có thể thêm điều hướng sau này
  }
}
