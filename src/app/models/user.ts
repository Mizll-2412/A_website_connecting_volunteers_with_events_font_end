export interface User {
    maTaiKhoan: number;
    hoTen: string;
    email: string;
    password: string;
    passwordSalt: string;
    vaiTro: string;
    trangThai: number;
    ngayTao: Date;
    lanDangNhapCuoi: Date;
}
