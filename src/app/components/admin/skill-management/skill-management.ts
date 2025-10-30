import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkillService, Skill } from '../../../services/skill';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-skill-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skill-management.html',
  styleUrls: ['./skill-management.css']
})
export class SkillManagement implements OnInit {
  skills: Skill[] = [];
  newSkill: Skill = { tenKyNang: '' };
  editingSkill: Skill | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private skillService: SkillService) {}

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.isLoading = true;
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.skills = response.data || response;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = 'Không thể tải danh sách kỹ năng. Vui lòng thử lại sau.';
        console.error('Lỗi khi tải kỹ năng:', err);
        this.isLoading = false;
      }
    });
  }

  addSkill(): void {
    if (!this.newSkill.tenKyNang.trim()) {
      this.errorMessage = 'Vui lòng nhập tên kỹ năng';
      return;
    }

    this.isLoading = true;
    this.skillService.createSkill(this.newSkill).subscribe({
      next: (response: any) => {
        this.successMessage = 'Thêm kỹ năng thành công';
        this.loadSkills();
        this.newSkill = { tenKyNang: '' };
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Không thể thêm kỹ năng. Vui lòng thử lại sau.';
        console.error('Lỗi khi thêm kỹ năng:', err);
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  startEditing(skill: Skill): void {
    this.editingSkill = { ...skill };
  }

  cancelEditing(): void {
    this.editingSkill = null;
  }

  updateSkill(): void {
    if (!this.editingSkill || !this.editingSkill.tenKyNang.trim() || !this.editingSkill.maKyNang) {
      this.errorMessage = 'Dữ liệu không hợp lệ';
      return;
    }

    this.isLoading = true;
    this.skillService.updateSkill(this.editingSkill.maKyNang, this.editingSkill).subscribe({
      next: (response: any) => {
        this.successMessage = 'Cập nhật kỹ năng thành công';
        this.loadSkills();
        this.editingSkill = null;
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Không thể cập nhật kỹ năng. Vui lòng thử lại sau.';
        console.error('Lỗi khi cập nhật kỹ năng:', err);
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
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
        this.successMessage = 'Xóa kỹ năng thành công';
        this.loadSkills();
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'Không thể xóa kỹ năng. Vui lòng thử lại sau.';
        console.error('Lỗi khi xóa kỹ năng:', err);
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }
}
