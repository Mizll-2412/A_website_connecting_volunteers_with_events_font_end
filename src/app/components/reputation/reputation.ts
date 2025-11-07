import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { ReputationBadge } from '../reputation-badge/reputation-badge';
import { environment } from '../../../environments/environment';

interface RankInfo {
  name: string;
  cssClass: string;
  icon: string;
  minRating: number;
  description: string;
  privileges: string;
}

@Component({
  selector: 'app-reputation',
  standalone: true,
  imports: [CommonModule, ReputationBadge],
  templateUrl: './reputation.html',
  styleUrls: ['./reputation.css']
})
export class Reputation implements OnInit {
  isLoggedIn = false;
  userRank: string | null = null;
  userRating: number | null = null;
  eventsCompleted = 0;
  evaluationsReceived = 0;
  
  ranks: RankInfo[] = [
    {
      name: 'Tình nguyện viên Đồng',
      cssClass: 'bronze',
      icon: 'bi-award',
      minRating: 0,
      description: 'Cấp bậc khởi đầu cho tình nguyện viên mới.',
      privileges: 'Tham gia các sự kiện cơ bản'
    },
    {
      name: 'Tình nguyện viên Bạc',
      cssClass: 'silver',
      icon: 'bi-award-fill',
      minRating: 3,
      description: 'Tình nguyện viên có kinh nghiệm và đánh giá tốt.',
      privileges: 'Ưu tiên đăng ký sự kiện'
    },
    {
      name: 'Tình nguyện viên Vàng',
      cssClass: 'gold',
      icon: 'bi-trophy',
      minRating: 4,
      description: 'Tình nguyện viên có nhiều kinh nghiệm và đánh giá rất tốt.',
      privileges: 'Ưu tiên cao đăng ký sự kiện, được đề xuất cho sự kiện đặc biệt'
    },
    {
      name: 'Tình nguyện viên Bạch Kim',
      cssClass: 'platinum',
      icon: 'bi-trophy-fill',
      minRating: 4.5,
      description: 'Tình nguyện viên xuất sắc với nhiều đóng góp.',
      privileges: 'Ưu tiên cao nhất, được đề xuất làm đội trưởng'
    },
    {
      name: 'Tình nguyện viên Kim Cương',
      cssClass: 'diamond',
      icon: 'bi-gem',
      minRating: 4.8,
      description: 'Tình nguyện viên tiêu biểu, có đóng góp nổi bật.',
      privileges: 'Tất cả đặc quyền trên, được mời tham gia các sự kiện đặc biệt'
    }
  ];
  
  private apiUrl = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      this.loadUserReputation();
    }
  }
  
  loadUserReputation(): void {
    const user = this.authService.getUser();
    if (!user || !user.maTaiKhoan) return;
    
    // Lấy thông tin tình nguyện viên
    this.http.get<any>(`${this.apiUrl}/tinhnguyenvien/by-account/${user.maTaiKhoan}`).subscribe({
      next: (response) => {
        const volunteer = response.data || response;
        if (volunteer) {
          this.userRank = volunteer.capBac;
          this.userRating = volunteer.diemTrungBinh;
          this.eventsCompleted = volunteer.tongSuKienThamGia || 0;
          
          // Lấy số lượng đánh giá đã nhận
          this.loadEvaluationsCount(volunteer.maTNV);
        }
      },
      error: (err) => {
        console.error('Lỗi tải thông tin tình nguyện viên:', err);
      }
    });
  }
  
  loadEvaluationsCount(maTNV: number): void {
    this.http.get<any>(`${this.apiUrl}/danhgia/volunteer/${maTNV}`).subscribe({
      next: (response) => {
        const evaluations = response.data || response;
        this.evaluationsReceived = evaluations.length;
      },
      error: (err) => {
        console.error('Lỗi tải thông tin đánh giá:', err);
      }
    });
  }
}
