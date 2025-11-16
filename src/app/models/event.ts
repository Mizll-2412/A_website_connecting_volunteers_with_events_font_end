export interface SuKien {
  maSuKien: number;
  maToChuc: number | undefined;
  tenSuKien: string;
  noiDung: string;
  soLuong?: number;
  diaChi?: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  ngayTao?: Date;
  tuyenBatDau?: Date;
  tuyenKetThuc?: Date;
  ngayDienRaBatDau?: Date;
  ngayDienRaKetThuc?: Date;
  thoiGianKhoaHuy?: number;
  trangThai?: string;
  hinhAnh?: string;
  linhVucIds?: number[];
  kyNangIds?: number[];
}

export interface CreateSuKienDto {
  maToChuc: number;
  tenSuKien: string;
  noiDung: string;
  soLuong?: number;
  diaChi?: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  tuyenBatDau?: Date;
  tuyenKetThuc?: Date;
  ngayDienRaBatDau?: Date;
  ngayDienRaKetThuc?: Date;
  thoiGianKhoaHuy?: number;
  trangThai?: string;
  hinhAnh?: string;
  linhVucIds?: number[];
  kyNangIds?: number[];
}

export interface UpdateSuKienDto {
  tenSuKien: string;
  noiDung: string;
  soLuong?: number;
  diaChi?: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  tuyenBatDau?: Date;
  tuyenKetThuc?: Date;
  ngayDienRaBatDau?: Date;
  ngayDienRaKetThuc?: Date;
  thoiGianKhoaHuy?: number;
  trangThai?: string;
  hinhAnh?: string;
  linhVucIds?: number[];
  kyNangIds?: number[];
}

export interface SuKienResponseDto {
  maSuKien: number;
  maToChuc: number;
  tenSuKien: string;
  noiDung: string;
  soLuong?: number;
  diaChi?: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  ngayTao?: Date;
  tuyenBatDau?: Date;
  tuyenKetThuc?: Date;
  trangThai?: string;
  hinhAnh?: string;
  linhVucIds?: number[];
  kyNangIds?: number[];
  // Thêm các trường cần thiết cho giao diện người dùng
  matchRate?: number;
  isFeatured?: boolean;
  isOngoing?: boolean;
  soLuongDaDangKy?: number; // Số lượng đã đăng ký (đã duyệt)
  // Thêm các trường formatted và date format pattern từ backend
  dateFormat?: string;
  ngayBatDauFormatted?: string;
  ngayKetThucFormatted?: string;
  tuyenBatDauFormatted?: string;
  tuyenKetThucFormatted?: string;
  ngayTaoFormatted?: string;
  
  // 2 trạng thái độc lập
  trangThaiTuyen?: string;        // "Chưa mở đăng ký", "Đang tuyển", "Đã đủ người", "Hết hạn tuyển", "Đóng"
  trangThaiTuyenMau?: string;     // CSS class: "info", "success", "warning", "danger", "secondary"
  trangThaiSuKien?: string;       // "Sắp diễn ra", "Đang diễn ra", "Đã kết thúc"
  trangThaiSuKienMau?: string;    // CSS class
  
  // Thông tin chi tiết
  choPhepDangKy?: boolean;        // true/false - cho phép đăng ký hay không
  soLuongConLai?: number;         // soLuong - soLuongDaDangKy
  
  // Thời gian diễn ra thực tế
  ngayDienRaBatDau?: string;
  ngayDienRaKetThuc?: string;
  ngayDienRaBatDauFormatted?: string;
  ngayDienRaKetThucFormatted?: string;
  thoiGianKhoaHuy?: number; // Giờ
  
  // Thống kê chi tiết
  soLuongDaDuyet?: number;
  soLuongChoDuyet?: number;
  tongSoDangKy?: number;
  gioiHanDangKy?: number;
  
  // Thông tin hủy đăng ký
  coTheHuyDangKy?: boolean;
  soGioConLaiDeHuy?: number;
}

// Enum cho trạng thái sự kiện
export enum TrangThaiSuKien {
  DangTuyen = 'Đang tuyển',
  SapDienRa = 'Sắp diễn ra',
  DangDienRa = 'Đang diễn ra',
  KetThuc = 'Kết thúc',
  HuyBo = 'Hủy bỏ'
}
