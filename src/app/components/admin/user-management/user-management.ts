import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var bootstrap: any;

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css'],
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class UserManagement implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  selectedUser: any = null;
  newRole: string = '';
  newPassword: string = '';
  
  // Bộ lọc
  searchTerm: string = '';
  roleFilter: string = '';
  statusFilter: string = '';

  // Biến cho modals
  roleModal: any;
  deleteModal: any;
  resetPasswordModal: any;
  userDetailModal: any;
  
  // Chi tiết người dùng
  selectedUserDetail: any = null;
  volunteerDetail: any = null;
  organizationDetail: any = null;

  constructor(
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.roleModal = new bootstrap.Modal(document.getElementById('roleModal'));
    this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    this.resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    this.userDetailModal = new bootstrap.Modal(document.getElementById('userDetailModal'));
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe(
      (data) => {
        this.users = data;
        this.filteredUsers = [...this.users];
      },
      (error) => {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        this.showToast('Không thể tải danh sách người dùng', 'Lỗi');
      }
    );
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      // Lọc theo từ khóa tìm kiếm
      const searchMatch = !this.searchTerm || 
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        (user.hoTen && user.hoTen.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      // Lọc theo vai trò
      const roleMatch = !this.roleFilter || user.vaiTro === this.roleFilter;
      
      // Lọc theo trạng thái
      const statusMatch = this.statusFilter === '' || 
        user.trangThai.toString() === this.statusFilter;
      
      return searchMatch && roleMatch && statusMatch;
    });
  }

  openRoleModal(user: any): void {
    this.selectedUser = user;
    this.newRole = user.vaiTro;
    this.roleModal.show();
  }

  updateUserRole(): void {
    if (!this.selectedUser || this.selectedUser.vaiTro === this.newRole) {
      this.roleModal.hide();
      return;
    }

    this.adminService.updateUserRole(this.selectedUser.maTaiKhoan, this.newRole).subscribe(
      (response) => {
        this.selectedUser.vaiTro = this.newRole;
        this.showToast('Vai trò đã được cập nhật', 'Thành công');
        this.roleModal.hide();
      },
      (error) => {
        console.error('Lỗi khi cập nhật vai trò:', error);
        this.showToast('Không thể cập nhật vai trò', 'Lỗi');
      }
    );
  }

  toggleUserStatus(user: any): void {
    const newStatus = !user.trangThai;
    
    this.adminService.updateUserStatus(user.maTaiKhoan, newStatus).subscribe(
      (response) => {
        user.trangThai = newStatus;
        this.showToast(
          newStatus ? 'Tài khoản đã được kích hoạt' : 'Tài khoản đã bị khóa', 
          'Thành công'
        );
      },
      (error) => {
        console.error('Lỗi khi cập nhật trạng thái:', error);
        this.showToast('Không thể cập nhật trạng thái tài khoản', 'Lỗi');
      }
    );
  }

  confirmDeleteUser(user: any): void {
    this.selectedUser = user;
    this.deleteModal.show();
  }

  deleteUser(): void {
    if (!this.selectedUser) {
      this.deleteModal.hide();
      return;
    }

    this.adminService.deleteUser(this.selectedUser.maTaiKhoan).subscribe(
      (response) => {
        this.users = this.users.filter(u => u.maTaiKhoan !== this.selectedUser.maTaiKhoan);
        this.filterUsers();
        this.showToast('Tài khoản đã được xóa', 'Thành công');
        this.deleteModal.hide();
      },
      (error) => {
        console.error('Lỗi khi xóa tài khoản:', error);
        this.showToast('Không thể xóa tài khoản', 'Lỗi');
      }
    );
  }

  openResetPasswordModal(user: any): void {
    this.selectedUser = user;
    this.newPassword = '';
    this.resetPasswordModal.show();
  }

  adminResetPassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.showToast('Mật khẩu phải có ít nhất 6 ký tự', 'Lỗi');
      return;
    }

    this.adminService.adminResetPassword(this.selectedUser.maTaiKhoan, this.newPassword).subscribe(
      (response) => {
        this.showToast('Đặt lại mật khẩu thành công', 'Thành công');
        this.resetPasswordModal.hide();
        this.newPassword = '';
      },
      (error) => {
        console.error('Lỗi khi đặt lại mật khẩu:', error);
        this.showToast('Không thể đặt lại mật khẩu', 'Lỗi');
      }
    );
  }

  // Xem chi tiết người dùng
  viewUserDetail(user: any): void {
    this.selectedUserDetail = user;
    this.volunteerDetail = null;
    this.organizationDetail = null;

    // Nếu là TNV, lấy chi tiết TNV
    if (user.vaiTro === 'User' && user.maTNV) {
      this.adminService.getVolunteerDetails(user.maTNV).subscribe({
        next: (response) => {
          this.volunteerDetail = response.data || response;
          this.userDetailModal.show();
        },
        error: (error) => {
          console.error('Lỗi khi tải chi tiết TNV:', error);
          this.userDetailModal.show();
        }
      });
    } 
    // Nếu là Tổ chức, lấy chi tiết tổ chức
    else if (user.vaiTro === 'Organization' && user.maToChuc) {
      this.adminService.getOrganizationDetails(user.maToChuc).subscribe({
        next: (response) => {
          this.organizationDetail = response.data || response;
          this.userDetailModal.show();
        },
        error: (error) => {
          console.error('Lỗi khi tải chi tiết tổ chức:', error);
          this.userDetailModal.show();
        }
      });
    } else {
      // Admin hoặc không có thông tin bổ sung
      this.userDetailModal.show();
    }
  }

  getOrganizationPhone(org: any): string {
    if (!org) return 'Chưa cập nhật';
    return org.soDienThoai || org.soDienThoại || 'Chưa cập nhật';
  }

  getUserAvatar(user: any): string {
    if (user.volunteer?.anhDaiDien) {
      return 'http://localhost:5000' + user.volunteer.anhDaiDien;
    } else if (user.organization?.anhDaiDien) {
      return 'http://localhost:5000' + user.organization.anhDaiDien;
    }
    return 'assets/default-avatar.png';
  }

  getUserName(user: any): string {
    if (user.volunteer?.hoTen) {
      return user.volunteer.hoTen;
    } else if (user.organization?.tenToChuc) {
      return user.organization.tenToChuc;
    } else if (user.hoTen) {
      return user.hoTen;
    }
    return 'Chưa cập nhật';
  }

  // Thay thế toastr bằng phương thức hiển thị thông báo đơn giản
  showToast(message: string, type: string): void {
    alert(`${type}: ${message}`);
  }
}