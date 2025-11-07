export interface Notification {
  maThongBao: number;
  maNguoiTao: number;
  tenNguoiTao?: string;
  phanLoai: number;
  phanLoaiText?: string;
  noiDung: string;
  ngayGui: Date;
  daDoc: boolean;
}

export interface CreateNotificationDto {
  phanLoai: number; // 0: Hệ thống, 1: Sự kiện, 2: Cá nhân
  noiDung: string;
  nguoiNhanIds?: number[]; // Danh sách MaTaiKhoan của người nhận cụ thể
}

export enum NotificationType {
  System = 0,
  Event = 1,
  Personal = 2
}
