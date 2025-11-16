import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { getImageUrl } from '../../utils/image-url.util';

interface EventRecommendation {
  maSuKien: number;
  tenSuKien: string;
  hinhAnh: string;
  diaChi: string;
  diemPhuHop: number;
  linhVucs?: any[];
  kyNangs?: any[];
}

interface MatchingFactor {
  name: string;
  type: 'field' | 'skill';
}

@Component({
  selector: 'app-event-recommendations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-recommendations.html',
  styleUrls: ['./event-recommendations.css']
})
export class EventRecommendations implements OnInit {
  isLoading = true;
  recommendations: EventRecommendation[] = [];
  volunteer: any = null;
  
  private apiUrl = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadUserInfo();
  }
  
  loadUserInfo(): void {
    // Sử dụng authService.getUser() để lấy user từ cả localStorage và sessionStorage
    const user = this.authService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    if (user.maTaiKhoan) {
      // Lấy thông tin tình nguyện viên
      this.http.get<any>(`${this.apiUrl}/tinhnguyenvien/by-account/${user.maTaiKhoan}`).subscribe({
        next: (response) => {
          this.volunteer = response.data || response;
          if (this.volunteer?.maTNV) {
            this.loadRecommendations();
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Lỗi tải thông tin tình nguyện viên:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }
  
  loadRecommendations(): void {
    if (!this.volunteer?.maTNV) {
      this.isLoading = false;
      return;
    }
    
    this.http.get<any>(`${this.apiUrl}/recommendation/volunteer/${this.volunteer.maTNV}`).subscribe({
      next: (response) => {
        this.recommendations = response.data || response;
        
        // Lấy thêm thông tin chi tiết về lĩnh vực và kỹ năng cho mỗi sự kiện
        this.loadEventDetails();
      },
      error: (err) => {
        console.error('Lỗi tải gợi ý sự kiện:', err);
        this.isLoading = false;
      }
    });
  }
  
  loadEventDetails(): void {
    // Tạo mảng promise để tải thông tin chi tiết cho từng sự kiện
    const promises = this.recommendations.map(event => {
      return new Promise<void>((resolve) => {
        this.http.get<any>(`${this.apiUrl}/sukien/${event.maSuKien}`).subscribe({
          next: (response) => {
            const eventDetail = response.data || response;
            event.linhVucs = eventDetail.linhVucs || [];
            event.kyNangs = eventDetail.kyNangs || [];
            resolve();
          },
          error: () => {
            resolve(); // Vẫn giải quyết promise ngay cả khi có lỗi
          }
        });
      });
    });
    
    // Đợi tất cả các promise hoàn thành
    Promise.all(promises).then(() => {
      this.isLoading = false;
    });
  }
  
  getScoreColor(score: number): string {
    if (score >= 0.8) {
      return '#28a745'; // Xanh lá - rất phù hợp
    } else if (score >= 0.6) {
      return '#17a2b8'; // Xanh dương - khá phù hợp
    } else if (score >= 0.4) {
      return '#fd7e14'; // Cam - trung bình
    } else {
      return '#6c757d'; // Xám - ít phù hợp
    }
  }
  
  getMatchingFactors(event: EventRecommendation): MatchingFactor[] {
    const factors: MatchingFactor[] = [];
    
    // Thêm lĩnh vực phù hợp
    if (event.linhVucs && this.volunteer?.linhVucs) {
      const userFieldIds = this.volunteer.linhVucs.map((f: any) => f.maLinhVuc);
      
      event.linhVucs.forEach(field => {
        if (userFieldIds.includes(field.maLinhVuc)) {
          factors.push({
            name: field.tenLinhVuc,
            type: 'field'
          });
        }
      });
    }
    
    // Thêm kỹ năng phù hợp
    if (event.kyNangs && this.volunteer?.kyNangs) {
      const userSkillIds = this.volunteer.kyNangs.map((s: any) => s.maKyNang);
      
      event.kyNangs.forEach(skill => {
        if (userSkillIds.includes(skill.maKyNang)) {
          factors.push({
            name: skill.tenKyNang,
            type: 'skill'
          });
        }
      });
    }
    
    // Giới hạn số lượng yếu tố hiển thị
    return factors.slice(0, 4);
  }
  
  viewEventDetails(eventId: number): void {
    this.router.navigate(['/su-kien', eventId]);
  }

  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }
}
