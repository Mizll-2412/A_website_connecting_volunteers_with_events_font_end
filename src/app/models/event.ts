export interface SuKien {
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
}

// Enum cho trạng thái sự kiện
export enum TrangThaiSuKien {
  DangTuyen = 'Đang tuyển',
  SapDienRa = 'Sắp diễn ra',
  DangDienRa = 'Đang diễn ra',
  KetThuc = 'Kết thúc',
  HuyBo = 'Hủy bỏ'
}