import { Component, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkillService, Skill } from '../../../services/skill';
import { HttpErrorResponse } from '@angular/common/http';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-skill-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TableComponent],
  templateUrl: './skill-management.html',
  styleUrls: ['./skill-management.css']
})
export class SkillManagement implements OnInit, AfterViewInit {
  skills: Skill[] = [];
  paginatedSkills: Skill[] = [];
  newSkill: Skill = { tenKyNang: '', moTa: '' };
  editingSkill: Skill | null = null;
  isLoading = false;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('tenKyNangTemplate') tenKyNangTemplate!: TemplateRef<any>;
  @ViewChild('moTaTemplate') moTaTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  constructor(
    private skillService: SkillService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeTableColumns();
    this.loadSkills();
  }

  ngAfterViewInit(): void {
    // Gán template vào columns sau khi view được khởi tạo
    this.tableColumns[1].template = this.tenKyNangTemplate;
    this.tableColumns[2].template = this.moTaTemplate;
    this.tableColumns[3].template = this.actionsTemplate;
  }

  initializeTableColumns(): void {
    this.tableColumns = [
      { key: 'maKyNang', title: 'ID', width: '80px', sortable: true, resizable: true },
      { key: 'tenKyNang', title: 'Tên kỹ năng', sortable: true, resizable: true },
      { key: 'moTa', title: 'Mô tả', resizable: true },
      { key: 'actions', title: 'Thao tác', width: '200px', align: 'center', resizable: true }
    ];
  }

  loadSkills(): void {
    this.isLoading = true;
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.skills = response.data || response;
        this.currentPage = 1;
        this.updatePaginatedSkills();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error('Không thể tải danh sách kỹ năng. Vui lòng thử lại sau.');
        console.error('Lỗi khi tải kỹ năng:', err);
        this.isLoading = false;
      }
    });
  }

  addSkill(): void {
    if (!this.newSkill.tenKyNang.trim()) {
      this.toastService.warning('Vui lòng nhập tên kỹ năng');
      return;
    }

    this.isLoading = true;
    // Đảm bảo gửi moTa nếu có, hoặc gửi empty string nếu không có
    const skillToCreate: Skill = {
      tenKyNang: this.newSkill.tenKyNang.trim(),
      moTa: this.newSkill.moTa?.trim() || ''
    };
    
    console.log('Creating skill with data:', skillToCreate);
    
    this.skillService.createSkill(skillToCreate).subscribe({
      next: (response: any) => {
        this.toastService.success('Thêm kỹ năng thành công');
        this.loadSkills();
        this.newSkill = { tenKyNang: '', moTa: '' };
        this.isLoading = false;
        this.currentPage = 1; // Reset về trang đầu
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.message || 'Không thể thêm kỹ năng. Vui lòng thử lại sau.');
        console.error('Lỗi khi thêm kỹ năng:', err);
        this.isLoading = false;
      }
    });
  }

  startEditing(skill: Skill): void {
    this.editingSkill = { 
      ...skill,
      moTa: skill.moTa || '' // Đảm bảo moTa luôn có giá trị
    };
  }

  cancelEditing(): void {
    this.editingSkill = null;
  }

  updateSkill(): void {
    if (!this.editingSkill || !this.editingSkill.tenKyNang.trim() || !this.editingSkill.maKyNang) {
      this.toastService.warning('Dữ liệu không hợp lệ');
      return;
    }

    this.isLoading = true;
    // Đảm bảo gửi moTa nếu có, hoặc gửi empty string nếu không có
    const skillToUpdate: Skill = {
      tenKyNang: this.editingSkill.tenKyNang.trim(),
      moTa: this.editingSkill.moTa?.trim() || ''
    };
    
    console.log('Updating skill with data:', skillToUpdate);
    
    this.skillService.updateSkill(this.editingSkill.maKyNang, skillToUpdate).subscribe({
      next: (response: any) => {
        this.toastService.success('Cập nhật kỹ năng thành công');
        this.loadSkills();
        this.editingSkill = null;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.message || 'Không thể cập nhật kỹ năng. Vui lòng thử lại sau.');
        console.error('Lỗi khi cập nhật kỹ năng:', err);
        this.isLoading = false;
      }
    });
  }

  deleteSkill(id: number): void {
    if (!confirm('Bạn có chắc chắn muốn xóa kỹ năng này?')) {
      return;
    }

    this.isLoading = true;
    this.skillService.deleteSkill(id).subscribe({
      next: (response: any) => {
        this.toastService.success('Xóa kỹ năng thành công');
        this.loadSkills();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.message || 'Không thể xóa kỹ năng. Vui lòng thử lại sau.');
        console.error('Lỗi khi xóa kỹ năng:', err);
        this.isLoading = false;
      }
    });
  }

  get paginatedSkillsList(): Skill[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.skills.slice(startIndex, endIndex);
  }

  updatePaginatedSkills(): void {
    // Getter sẽ tự động tính toán
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
  }
}
