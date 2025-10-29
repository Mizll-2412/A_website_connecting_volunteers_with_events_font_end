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
  
  // Bộ lọc
  searchTerm: string = '';
  roleFilter: string = '';
  statusFilter: string = '';

  // Biến cho modals
  roleModal: any;
  deleteModal: any;

  constructor(
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.roleModal = new bootstrap.Modal(document.getElementById('roleModal'));
    this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
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

  // Thay thế toastr bằng phương thức hiển thị thông báo đơn giản
  showToast(message: string, type: string): void {
    alert(`${type}: ${message}`);
  }
}