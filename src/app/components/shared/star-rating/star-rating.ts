import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.css'
})
export class StarRatingComponent implements OnInit, OnDestroy {
  private _rating: number = 0;
  
  @Input() 
  get rating(): number {
    return this._rating;
  }
  set rating(value: number) {
    this._rating = value || 0;
  }
  
  @Input() readonly: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showLabel: boolean = true;
  
  @Output() ratingChange = new EventEmitter<number>();
  
  hoveredRating: number = 0;
  isHoldingSixthStar: boolean = false;
  isLocked: boolean = false; // Lock trạng thái để inspect trong DevTools
  
  // Đường dẫn ảnh T1 - người dùng cần đưa ảnh vào thư mục assets/images/t1-logo.png
  // Hoặc có thể thay đổi đường dẫn này
  t1ImagePath: string = 'assets/images/t1-logo.png';
  
  ngOnInit(): void {
    // Nếu chưa có rating, set về 0
    if (!this.rating) {
      this.rating = 0;
    }
  }
  
  setRating(value: number): void {
    if (this.readonly) return;
    
    // Chỉ cho phép set từ 1-5 (sao thứ 6 chỉ để giữ và xem ảnh)
    if (value >= 1 && value <= 5) {
      this._rating = value;
      this.ratingChange.emit(this._rating);
    }
  }
  
  onMouseEnter(star: number): void {
    if (this.readonly || star === 6) return; // Sao thứ 6 không dùng hover
    this.hoveredRating = star;
  }
  
  onMouseLeave(): void {
    if (this.readonly) return;
    this.hoveredRating = 0;
  }
  
  onMouseDownSixthStar(event: MouseEvent): void {
    if (this.readonly) return;
    event.preventDefault();
    event.stopPropagation();
    
    // Nếu đã lock thì không làm gì
    if (this.isLocked) return;
    
    this.isHoldingSixthStar = true;
    
    // Lắng nghe mouseup trên document để đảm bảo luôn bắt được khi thả chuột
    document.addEventListener('mouseup', this.handleGlobalMouseUp);
  }
  
  private handleGlobalMouseUp = (): void => {
    // Nếu đã lock thì không tắt
    if (this.isLocked) return;
    
    if (this.isHoldingSixthStar) {
      this.isHoldingSixthStar = false;
      document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    }
  };
  
  onMouseUpSixthStar(): void {
    if (this.readonly) return;
    
    // Nếu đã lock thì không tắt
    if (this.isLocked) return;
    
    this.isHoldingSixthStar = false;
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
  }
  
  // Double click để lock/unlock trạng thái (để inspect trong DevTools)
  onDoubleClickSixthStar(event: MouseEvent): void {
    if (this.readonly) return;
    event.preventDefault();
    event.stopPropagation();
    
    this.isLocked = !this.isLocked;
    
    if (this.isLocked) {
      // Lock: Giữ trạng thái hold
      this.isHoldingSixthStar = true;
      console.log('🔒 T1 Star locked - Bạn có thể mở DevTools để inspect ảnh');
    } else {
      // Unlock: Tắt trạng thái hold
      this.isHoldingSixthStar = false;
      document.removeEventListener('mouseup', this.handleGlobalMouseUp);
      console.log('🔓 T1 Star unlocked');
    }
  }
  
  onMouseLeaveSixthStar(): void {
    // Không làm gì khi mouseleave để tránh nháy ảnh
    // Chỉ dùng mouseup để tắt
  }
  
  getStarClass(star: number): string {
    if (star === 6) {
      // Sao thứ 6 chỉ hiển thị khi đang giữ
      if (this.isHoldingSixthStar) {
        return 'bi-star-fill t1-red-star';
      }
      return 'bi-star text-secondary';
    }
    
    // Khi đang giữ sao thứ 6, tất cả sao (1-5) chuyển màu T1 (#e2012d)
    if (this.isHoldingSixthStar) {
      return 'bi-star-fill t1-red-star';
    }
    
    const isActive = star <= this._rating;
    const isHovered = !this.readonly && this.hoveredRating >= star;
    
    if (isActive || isHovered) {
      return 'bi-star-fill text-warning';
    }
    return 'bi-star text-secondary';
  }
  
  getSizeClass(): string {
    switch (this.size) {
      case 'sm': return 'fs-4';
      case 'lg': return 'fs-1';
      default: return 'fs-2';
    }
  }
  
  getRatingLabel(): string {
    switch (this._rating) {
      case 1: return 'Rất không hài lòng';
      case 2: return 'Không hài lòng';
      case 3: return 'Bình thường';
      case 4: return 'Hài lòng';
      case 5: return 'Rất hài lòng';
      default: return '';
    }
  }
  
  // Kiểm tra có nên hiển thị ảnh T1 không
  showT1Image(): boolean {
    return this.isHoldingSixthStar;
  }
  
  // Kiểm tra có nên ẩn label không (khi đang giữ sao thứ 6)
  shouldHideLabel(): boolean {
    return this.isHoldingSixthStar;
  }
  
  // Kiểm tra có đang lock không
  isT1Locked(): boolean {
    return this.isLocked;
  }
  
  ngOnDestroy(): void {
    // Cleanup: Remove event listener khi component bị destroy
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
  }
}
