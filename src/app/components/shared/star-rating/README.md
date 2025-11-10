# Star Rating Component với T1 Easter Egg

## Tính năng

Component đánh giá sao với tính năng đặc biệt:
- 5 sao đánh giá bình thường (1-5)
- Sao thứ 6 (T1) - Click để đánh giá T1
- Khi chọn sao thứ 6, hiển thị ảnh T1 logo ở dưới label

## Cách thêm ảnh T1 Logo

### Bước 1: Chuẩn bị ảnh
- Format: PNG, JPG, SVG (khuyến nghị PNG với nền trong suốt)
- Kích thước: 200x200px hoặc lớn hơn (tỷ lệ 1:1)
- Tên file: `t1-logo.png` (hoặc thay đổi trong code)

### Bước 2: Đưa ảnh vào thư mục

**Vị trí đặt ảnh:**
```
src/assets/images/t1-logo.png
```

**Cách làm:**
1. Copy ảnh T1 logo của bạn
2. Paste vào thư mục: `src/assets/images/`
3. Đặt tên file: `t1-logo.png` (hoặc format khác: `.jpg`, `.svg`)

### Bước 3: Cập nhật đường dẫn (nếu cần)

Nếu bạn đặt tên file khác hoặc ở vị trí khác, mở file:
```
src/app/components/shared/star-rating/star-rating.ts
```

Tìm dòng:
```typescript
t1ImagePath: string = 'assets/images/t1-logo.png';
```

Thay đổi thành đường dẫn của bạn, ví dụ:
```typescript
t1ImagePath: string = 'assets/images/t1-logo.jpg';  // Nếu dùng JPG
// hoặc
t1ImagePath: string = 'assets/images/my-t1-logo.png';  // Nếu tên khác
```

## Cách sử dụng

```html
<app-star-rating 
  [(rating)]="myRating"
  [size]="'md'"
  [showLabel]="true">
</app-star-rating>
```

### Inputs:
- `rating: number` - Giá trị rating (0-6, 6 là T1)
- `readonly: boolean` - Chế độ chỉ đọc
- `size: 'sm' | 'md' | 'lg'` - Kích thước sao
- `showLabel: boolean` - Hiển thị label mô tả

### Outputs:
- `ratingChange: EventEmitter<number>` - Event khi rating thay đổi

## Lưu ý

- Khi rating = 6, ảnh T1 sẽ tự động hiển thị ở dưới label
- Ảnh sẽ có animation fade-in và glow effect
- Nếu ảnh không load được, sẽ tự động ẩn (không hiển thị lỗi)

