export interface Certificate {
  maChungNhan: number;
  maSuKien: number;
  maTNV: number;
  tenSuKien: string;
  tenToChuc: string;
  ngayThamGia: Date | string;
  diaDiem: string;
  trangThai: number; // 0: Chờ duyệt, 1: Đã duyệt, 2: Từ chối
  lyDoTuChoi?: string;
  duongDanFile?: string;
  ngayTao: Date | string;
  previewUrl?: string;
}
