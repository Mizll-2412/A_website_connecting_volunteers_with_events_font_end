export interface TinhNguyenVien {
  maTNV: number;
  maTaiKhoan?: number;
  hoTen: string;
  ngaySinh?: string; // DateOnly từ C# -> string trong TypeScript
  gioiTinh?: string;
  email: string;
  cccd?: string;
  diaChi?: string;
  gioiThieu?: string;
  anhDaiDien?: string;
  diemTrungBinh?: number;
  linhVucIds?: number[];
  kyNangIds?: number[];
}
export interface TinhNguyenVienResponeDTos {
  maTNV: number;
  maTaiKhoan?: number;
  hoTen: string;
  ngaySinh?: string; 
  gioiTinh?: string;
  email: string;
  cccd?: string;
  soDienThoai?: string;
  diaChi?: string;
  gioiThieu?: string;
  anhDaiDien?: string;
  diemTrungBinh?: number;
  linhVucIds?: number[];
  kyNangIds?: number[];
  kyNangs?: KyNang[];
  linhVucs?: LinhVuc[];
  suKienDaThamGia?: number;
}

export interface KyNang {
  maKyNang: number;
  tenKyNang?: string;
}

export interface LinhVuc {
  maLinhVuc: number;
  tenLinhVuc?: string;
}

