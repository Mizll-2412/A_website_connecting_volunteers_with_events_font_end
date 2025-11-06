import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reputation-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reputation-badge.html',
  styleUrls: ['./reputation-badge.css']
})
export class ReputationBadge implements OnChanges {
  @Input() rank: string | null = null;
  @Input() rating: number | null = null;
  
  ngOnChanges(changes: SimpleChanges): void {
    // Cập nhật khi có thay đổi input
  }
  
  getRankClass(): string {
    if (!this.rank) return 'rank-none';
    
    const rankLower = this.rank.toLowerCase();
    
    if (rankLower.includes('đồng') || rankLower.includes('bronze')) {
      return 'rank-bronze';
    } else if (rankLower.includes('bạc') || rankLower.includes('silver')) {
      return 'rank-silver';
    } else if (rankLower.includes('vàng') || rankLower.includes('gold')) {
      return 'rank-gold';
    } else if (rankLower.includes('bạch kim') || rankLower.includes('platinum')) {
      return 'rank-platinum';
    } else if (rankLower.includes('kim cương') || rankLower.includes('diamond')) {
      return 'rank-diamond';
    }
    
    return 'rank-none';
  }
  
  getRankIcon(): string {
    if (!this.rank) return 'bi-person';
    
    const rankLower = this.rank.toLowerCase();
    
    if (rankLower.includes('đồng') || rankLower.includes('bronze')) {
      return 'bi-award';
    } else if (rankLower.includes('bạc') || rankLower.includes('silver')) {
      return 'bi-award-fill';
    } else if (rankLower.includes('vàng') || rankLower.includes('gold')) {
      return 'bi-trophy';
    } else if (rankLower.includes('bạch kim') || rankLower.includes('platinum')) {
      return 'bi-trophy-fill';
    } else if (rankLower.includes('kim cương') || rankLower.includes('diamond')) {
      return 'bi-gem';
    }
    
    return 'bi-person';
  }
  
  getStars(): string[] {
    const stars: string[] = [];
    const rating = this.rating || 0;
    
    // Tính số sao đầy và nửa sao
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    // Thêm sao đầy
    for (let i = 0; i < fullStars; i++) {
      stars.push('bi-star-fill');
    }
    
    // Thêm nửa sao nếu có
    if (halfStar) {
      stars.push('bi-star-half');
    }
    
    // Thêm sao rỗng
    for (let i = 0; i < emptyStars; i++) {
      stars.push('bi-star');
    }
    
    return stars;
  }
}
