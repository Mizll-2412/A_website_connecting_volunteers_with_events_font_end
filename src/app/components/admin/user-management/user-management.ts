import { Component, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { AdminService } from '../../../services/admin';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getImageUrl } from '../../../utils/image-url.util';
import { ToastService } from '../../../services/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';
import { AuthService, RegisterRequest } from '../../../services/auth';

declare var bootstrap: any;

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css'],
  imports: [CommonModule, FormsModule, PaginationComponent, TableComponent],
  standalone: true
})
export class UserManagement implements OnInit, AfterViewInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  paginatedUsers: any[] = [];
  selectedUser: any = null;
  newRole: string = '';
  newPassword: string = '';
  
  // Bộ lọc
  searchTerm: string = '';
  roleFilter: string = '';
  statusFilter: string = '';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('avatarTemplate') avatarTemplate!: TemplateRef<any>;
  @ViewChild('tenTemplate') tenTemplate!: TemplateRef<any>;
  @ViewChild('idTemplate') idTemplate!: TemplateRef<any>;
  @ViewChild('vaiTroTemplate') vaiTroTemplate!: TemplateRef<any>;
  @ViewChild('trangThaiTemplate') trangThaiTemplate!: TemplateRef<any>;
  @ViewChild('ngayTaoTemplate') ngayTaoTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  // Biến cho modals
  roleModal: any;
  deleteModal: any;
  resetPasswordModal: any;
  userDetailModal: any;
  
  // Chi tiết người dùng
  selectedUserDetail: any = null;
  volunteerDetail: any = null;
  organizationDetail: any = null;
  
  // Tạo tài khoản mới
  showCreateUserModal: boolean = false;
  newUserData: RegisterRequest = {
    hoTen: '',
    email: '',
    password: '',
    confirmPassword: '',
    vaiTro: ''
  };
  fieldErrors: {
    hoTen?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    vaiTro?: string;
  } = {};
  isCreatingUser: boolean = false;
  private passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeTableColumns();
    this.loadUsers();
  }

  initializeTableColumns(): void {
    // Columns sẽ được cập nhật trong ngAfterViewInit sau khi template được load
    this.tableColumns = [
      { key: 'maTaiKhoan', title: 'ID', width: '80px', sortable: true, resizable: true },
      { key: 'ten', title: 'Tên', sortable: true, resizable: true },
      { key: 'avatar', title: 'Ảnh', width: '80px', resizable: true },
      { key: 'email', title: 'Email', sortable: true, resizable: true },
      { key: 'vaiTro', title: 'Vai trò', width: '120px', resizable: true },
      { key: 'trangThai', title: 'Trạng thái', width: '120px', resizable: true },
      { key: 'ngayTao', title: 'Ngày tạo', width: '150px', sortable: true, resizable: true },
      { key: 'actions', title: 'Thao tác', width: '200px', align: 'center', resizable: true }
    ];
  }
  
  ngAfterViewInit(): void {
    // Gán template vào columns sau khi view được khởi tạo
    this.tableColumns[0].template = this.idTemplate;
    this.tableColumns[1].template = this.tenTemplate;
    this.tableColumns[2].template = this.avatarTemplate;
    this.tableColumns[4].template = this.vaiTroTemplate;
    this.tableColumns[5].template = this.trangThaiTemplate;
    this.tableColumns[6].template = this.ngayTaoTemplate;
    this.tableColumns[7].template = this.actionsTemplate;
    
    // Khởi tạo modals
    this.roleModal = new bootstrap.Modal(document.getElementById('roleModal'));
    this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    this.resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    this.userDetailModal = new bootstrap.Modal(document.getElementById('userDetailModal'));
  }

  openCreateUserModal(): void {
    this.showCreateUserModal = true;
    this.newUserData = {
      hoTen: '',
      email: '',
      password: '',
      confirmPassword: '',
      vaiTro: ''
    };
    this.fieldErrors = {};
    // Đảm bảo modal hiển thị
    setTimeout(() => {
      const modal = document.getElementById('createUserModal');
      if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
      }
    }, 0);
  }

  closeCreateUserModal(): void {
    this.showCreateUserModal = false;
    this.newUserData = {
      hoTen: '',
      email: '',
      password: '',
      confirmPassword: '',
      vaiTro: ''
    };
    this.fieldErrors = {};
    // Đóng modal
    const modal = document.getElementById('createUserModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
    }
  }

  validateHoTen(): void {
    if (!this.newUserData.hoTen || this.newUserData.hoTen.trim() === '') {
      this.fieldErrors.hoTen = 'Họ tên là bắt buộc';
    } else {
      this.fieldErrors.hoTen = undefined;
    }
  }

  validateEmail(): void {
    if (!this.newUserData.email || this.newUserData.email.trim() === '') {
      this.fieldErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newUserData.email)) {
      this.fieldErrors.email = 'Email không hợp lệ';
    } else {
      this.fieldErrors.email = undefined;
    }
  }

  validatePassword(): void {
    if (!this.newUserData.password || this.newUserData.password.trim() === '') {
      this.fieldErrors.password = 'Mật khẩu là bắt buộc';
    } else if (!this.passwordRegex.test(this.newUserData.password)) {
      this.fieldErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số';
    } else {
      this.fieldErrors.password = undefined;
    }
  }

  validateConfirmPassword(): void {
    if (!this.newUserData.confirmPassword || this.newUserData.confirmPassword.trim() === '') {
      this.fieldErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (this.newUserData.password !== this.newUserData.confirmPassword) {
      this.fieldErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    } else {
      this.fieldErrors.confirmPassword = undefined;
    }
  }

  validateVaiTro(): void {
    if (!this.newUserData.vaiTro || this.newUserData.vaiTro.trim() === '') {
      this.fieldErrors.vaiTro = 'Vui lòng chọn vai trò';
    } else {
      this.fieldErrors.vaiTro = undefined;
    }
  }

  hasValidationErrors(): boolean {
    return !!(this.fieldErrors.hoTen || this.fieldErrors.email || 
              this.fieldErrors.password || this.fieldErrors.confirmPassword || 
              this.fieldErrors.vaiTro);
  }

  createUser(): void {
    // Validate tất cả các trường
    this.validateHoTen();
    this.validateEmail();
    this.validatePassword();
    this.validateConfirmPassword();
    this.validateVaiTro();

    // Kiểm tra nếu có lỗi
    if (this.fieldErrors.hoTen || this.fieldErrors.email || this.fieldErrors.password || 
        this.fieldErrors.confirmPassword || this.fieldErrors.vaiTro) {
      this.toastService.warning('Vui lòng điền đầy đủ và đúng thông tin');
      return;
    }

    this.isCreatingUser = true;
    this.authService.register(this.newUserData).subscribe({
      next: (response) => {
        this.toastService.success('Tạo tài khoản thành công!');
        this.closeCreateUserModal();
        this.loadUsers(); // Tải lại danh sách
        this.isCreatingUser = false;
      },
      error: (error) => {
        console.error('Lỗi khi tạo tài khoản:', error);
        const errorMsg = error.error?.message || 'Không thể tạo tài khoản. Vui lòng thử lại sau.';
        this.toastService.error(errorMsg);
        this.isCreatingUser = false;
      }
    });
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe(
      (data) => {
        this.users = data;
        this.filteredUsers = [...this.users];
        this.updatePaginatedUsers();
      },
      (error) => {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        this.toastService.error('Không thể tải danh sách người dùng');
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
    this.currentPage = 1; // Reset về trang đầu khi filter
    this.updatePaginatedUsers();
  }

  updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedUsers();
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  onSortChange(sortInfo: { key: string; direction: 'asc' | 'desc' | null }): void {
    if (!sortInfo.direction) {
      // Reset về thứ tự ban đầu
      this.filteredUsers = [...this.users];
      this.filterUsers();
      return;
    }

    this.filteredUsers.sort((a, b) => {
      let aVal = this.getNestedValue(a, sortInfo.key);
      let bVal = this.getNestedValue(b, sortInfo.key);
      
      // Xử lý các kiểu dữ liệu khác nhau
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (sortInfo.direction === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) return '';
    }
    return value;
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
        this.toastService.success('Vai trò đã được cập nhật');
        this.roleModal.hide();
      },
      (error) => {
        console.error('Lỗi khi cập nhật vai trò:', error);
        this.toastService.error('Không thể cập nhật vai trò');
      }
    );
  }

  toggleUserStatus(user: any): void {
    const newStatus = !user.trangThai;
    
    this.adminService.updateUserStatus(user.maTaiKhoan, newStatus).subscribe(
      (response) => {
        user.trangThai = newStatus;
        this.toastService.success(
          newStatus ? 'Tài khoản đã được kích hoạt' : 'Tài khoản đã bị khóa'
        );
      },
      (error) => {
        console.error('Lỗi khi cập nhật trạng thái:', error);
        this.toastService.error('Không thể cập nhật trạng thái tài khoản');
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
        this.toastService.success('Tài khoản đã được xóa');
        this.deleteModal.hide();
      },
      (error) => {
        console.error('Lỗi khi xóa tài khoản:', error);
        this.toastService.error('Không thể xóa tài khoản');
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
      this.toastService.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    this.adminService.adminResetPassword(this.selectedUser.maTaiKhoan, this.newPassword).subscribe(
      (response) => {
        this.toastService.success('Đặt lại mật khẩu thành công');
        this.resetPasswordModal.hide();
        this.newPassword = '';
      },
      (error) => {
        console.error('Lỗi khi đặt lại mật khẩu:', error);
        this.toastService.error('Không thể đặt lại mật khẩu');
      }
    );
  }

  // Xem chi tiết người dùng
  viewUserDetail(user: any): void {
    // Hiển thị modal chi tiết thay vì navigate
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
    // Kiểm tra volunteer trước (vì User role có thể có volunteer)
    if (user.volunteer && user.volunteer.anhDaiDien) {
      return getImageUrl(user.volunteer.anhDaiDien);
    } 
    // Sau đó kiểm tra organization
    else if (user.organization && user.organization.anhDaiDien) {
      return getImageUrl(user.organization.anhDaiDien);
    }
    return 'assets/default-avatar.png';
  }

  getUserName(user: any): string {
    // Kiểm tra volunteer trước (vì User role có thể có volunteer)
    if (user.volunteer && user.volunteer.hoTen) {
      return user.volunteer.hoTen;
    } 
    // Sau đó kiểm tra organization
    else if (user.organization && user.organization.tenToChuc) {
      return user.organization.tenToChuc;
    } 
    // Nếu không có, dùng email làm tên hiển thị
    else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Chưa cập nhật';
  }


  getImageUrl(path: string | null | undefined): string {
    return getImageUrl(path);
  }

  // Xử lý click vào ID để chuyển trang và mở modal
  onIdClick(user: any, event: Event): void {
    event.stopPropagation();
    
    if (user.vaiTro === 'User' && user.volunteer?.maTNV) {
      // Chuyển tới trang volunteer và mở modal
      this.router.navigate(['/admin/tinhnguyenvien'], { 
        queryParams: { id: user.volunteer.maTNV } 
      }).then(() => {
        // Sau khi navigate, trigger mở modal (cần component volunteer hỗ trợ)
        setTimeout(() => {
          // Có thể cần emit event hoặc dùng service để trigger mở modal
        }, 100);
      });
    } else if (user.vaiTro === 'Organization' && user.organization?.maToChuc) {
      // Chuyển tới trang organization và mở modal
      this.router.navigate(['/admin/tochuc'], { 
        queryParams: { id: user.organization.maToChuc } 
      }).then(() => {
        // Sau khi navigate, trigger mở modal
        setTimeout(() => {
          // Có thể cần emit event hoặc dùng service để trigger mở modal
        }, 100);
      });
    } else {
      // Nếu không có thông tin, chỉ mở modal chi tiết
      this.viewUserDetail(user);
    }
  }
}