import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldService, Field } from '../../../services/field';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-field-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './field-management.html',
  styleUrls: ['./field-management.css']
})
export class FieldManagement implements OnInit {
  fields: Field[] = [];
  newField: Field = { tenLinhVuc: '' };
  editingField: Field | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private fieldService: FieldService) {}

  ngOnInit(): void {
    this.loadFields();
  }

  loadFields(): void {
    this.isLoading = true;
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.fields = response.data || response;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Không thể tải danh sách lĩnh vực. Vui lòng thử lại sau.';
        console.error('Lỗi khi tải lĩnh vực:', err);
        this.isLoading = false;
      }
    });
  }

  addField(): void {
    if (!this.newField.tenLinhVuc.trim()) {
      this.errorMessage = 'Vui lòng nhập tên lĩnh vực';
      return;
    }

    this.isLoading = true;
    this.fieldService.createField(this.newField).subscribe({
      next: (response: any) => {
        this.successMessage = 'Thêm lĩnh vực thành công';
        this.loadFields();
        this.newField = { tenLinhVuc: '' };
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Không thể thêm lĩnh vực. Vui lòng thử lại sau.';
        console.error('Lỗi khi thêm lĩnh vực:', err);
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  startEditing(field: Field): void {
    this.editingField = { ...field };
  }

  cancelEditing(): void {
    this.editingField = null;
  }

  updateField(): void {
    if (!this.editingField || !this.editingField.tenLinhVuc.trim() || !this.editingField.maLinhVuc) {
      this.errorMessage = 'Dữ liệu không hợp lệ';
      return;
    }

    this.isLoading = true;
    this.fieldService.updateField(this.editingField.maLinhVuc, this.editingField).subscribe({
      next: (response: any) => {
        this.successMessage = 'Cập nhật lĩnh vực thành công';
        this.loadFields();
        this.editingField = null;
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Không thể cập nhật lĩnh vực. Vui lòng thử lại sau.';
        console.error('Lỗi khi cập nhật lĩnh vực:', err);
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
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
        this.successMessage = 'Xóa lĩnh vực thành công';
        this.loadFields();
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Không thể xóa lĩnh vực. Vui lòng thử lại sau.';
        console.error('Lỗi khi xóa lĩnh vực:', err);
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }
}
