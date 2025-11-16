import { Component, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldService, Field } from '../../../services/field';
import { HttpErrorResponse } from '@angular/common/http';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { TableComponent, TableColumn } from '../../shared/table/table';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-field-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TableComponent],
  templateUrl: './field-management.html',
  styleUrls: ['./field-management.css']
})
export class FieldManagement implements OnInit, AfterViewInit {
  fields: Field[] = [];
  paginatedFields: Field[] = [];
  newField: Field = { tenLinhVuc: '', moTa: '' };
  editingField: Field | null = null;
  isLoading = false;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Table columns
  tableColumns: TableColumn[] = [];
  
  // Template references
  @ViewChild('tenLinhVucTemplate') tenLinhVucTemplate!: TemplateRef<any>;
  @ViewChild('moTaTemplate') moTaTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  constructor(
    private fieldService: FieldService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initializeTableColumns();
    this.loadFields();
  }

  ngAfterViewInit(): void {
    // Gán template vào columns sau khi view được khởi tạo
    this.tableColumns[1].template = this.tenLinhVucTemplate;
    this.tableColumns[2].template = this.moTaTemplate;
    this.tableColumns[3].template = this.actionsTemplate;
  }

  initializeTableColumns(): void {
    this.tableColumns = [
      { key: 'maLinhVuc', title: 'ID', width: '80px', sortable: true, resizable: true },
      { key: 'tenLinhVuc', title: 'Tên lĩnh vực', sortable: true, resizable: true },
      { key: 'moTa', title: 'Mô tả', resizable: true },
      { key: 'actions', title: 'Thao tác', width: '200px', align: 'center', resizable: true }
    ];
  }

  loadFields(): void {
    this.isLoading = true;
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.fields = response.data || response;
        this.currentPage = 1;
        this.updatePaginatedFields();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error('Không thể tải danh sách lĩnh vực. Vui lòng thử lại sau.');
        console.error('Lỗi khi tải lĩnh vực:', err);
        this.isLoading = false;
      }
    });
  }

  addField(): void {
    if (!this.newField.tenLinhVuc.trim()) {
      this.toastService.warning('Vui lòng nhập tên lĩnh vực');
      return;
    }

    this.isLoading = true;
    // Đảm bảo gửi moTa nếu có, hoặc gửi empty string nếu không có
    const fieldToCreate: Field = {
      tenLinhVuc: this.newField.tenLinhVuc.trim(),
      moTa: this.newField.moTa?.trim() || ''
    };
    
    console.log('Creating field with data:', fieldToCreate);
    
    this.fieldService.createField(fieldToCreate).subscribe({
      next: (response: any) => {
        this.toastService.success('Thêm lĩnh vực thành công');
        this.loadFields();
        this.newField = { tenLinhVuc: '', moTa: '' };
        this.isLoading = false;
        this.currentPage = 1; // Reset về trang đầu
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.message || 'Không thể thêm lĩnh vực. Vui lòng thử lại sau.');
        console.error('Lỗi khi thêm lĩnh vực:', err);
        this.isLoading = false;
      }
    });
  }

  startEditing(field: Field): void {
    this.editingField = { 
      ...field,
      moTa: field.moTa || '' // Đảm bảo moTa luôn có giá trị
    };
  }

  cancelEditing(): void {
    this.editingField = null;
  }

  updateField(): void {
    if (!this.editingField || !this.editingField.tenLinhVuc.trim() || !this.editingField.maLinhVuc) {
      this.toastService.warning('Dữ liệu không hợp lệ');
      return;
    }

    this.isLoading = true;
    // Đảm bảo gửi moTa nếu có, hoặc gửi empty string nếu không có
    const fieldToUpdate: Field = {
      tenLinhVuc: this.editingField.tenLinhVuc.trim(),
      moTa: this.editingField.moTa?.trim() || ''
    };
    
    console.log('Updating field with data:', fieldToUpdate);
    
    this.fieldService.updateField(this.editingField.maLinhVuc, fieldToUpdate).subscribe({
      next: (response: any) => {
        this.toastService.success('Cập nhật lĩnh vực thành công');
        this.loadFields();
        this.editingField = null;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.message || 'Không thể cập nhật lĩnh vực. Vui lòng thử lại sau.');
        console.error('Lỗi khi cập nhật lĩnh vực:', err);
        this.isLoading = false;
      }
    });
  }

  deleteField(id: number): void {
    if (!confirm('Bạn có chắc chắn muốn xóa lĩnh vực này?')) {
      return;
    }

    this.isLoading = true;
    this.fieldService.deleteField(id).subscribe({
      next: (response: any) => {
        this.toastService.success('Xóa lĩnh vực thành công');
        this.loadFields();
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastService.error(err.error?.message || 'Không thể xóa lĩnh vực. Vui lòng thử lại sau.');
        console.error('Lỗi khi xóa lĩnh vực:', err);
        this.isLoading = false;
      }
    });
  }

  get paginatedFieldsList(): Field[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.fields.slice(startIndex, endIndex);
  }

  updatePaginatedFields(): void {
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
