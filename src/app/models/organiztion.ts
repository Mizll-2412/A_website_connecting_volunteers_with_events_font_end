
export interface ToChuc {
  maToChuc: number;
  maTaiKhoan: number;
  tenToChuc: string;
  email: string;
  soDienThoai?: string;
  diaChi?: string;
  ngayTao?: Date;
  gioiThieu?: string;
  anhDaiDien?: string;
  trangThaiXacMinh: TrangThaiXacMinh;
  lyDoTuChoi?: string;
  diemTrungBinh?: number;
  giayToPhapLyIds?: number[];
}

export enum TrangThaiXacMinh {
  ChoDuyet = 0,
  DaDuyet = 1,
  TuChoi = 2
}

export interface ToChucResponseDto {
  maToChuc: number;
  tenToChuc: string;
  email: string;
  soDienThoai?: string;
  diaChi?: string;
  ngayTao?: Date;
  gioiThieu?: string;
  anhDaiDien?: string;
  trangThaiXacMinh: TrangThaiXacMinh;
  lyDoTuChoi?: string;
  diemTrungBinh?: number;
  giayToPhapLyIds?: number[];
}

export interface UpdateToChucDto {
  tenToChuc: string;
  email: string;
  soDienThoai?: string;
  diaChi?: string;
  gioiThieu?: string;
  anhDaiDien?: string;
}

export interface DuyetToChucRequest {
  trangThaiXacMinh: TrangThaiXacMinh;
  lyDoTuChoi?: string;
}