import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocalDataService, Event, Field, Skill } from '../../services/local-data';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card border-0 shadow-sm p-4 mb-4">
      <h4 class="fw-semibold mb-4">{{ event ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới' }}</h4>
      
      <form [formGroup]="eventForm" (ngSubmit)="onSubmit()">
        <div class="row g-3">
          <div class="col-md-12">
            <label class="form-label">Tên sự kiện *</label>
            <input type="text" formControlName="title" class="form-control" placeholder="Nhập tên sự kiện">
            <div *ngIf="submitted && f['title'].errors" class="text-danger mt-1 small">
              <div *ngIf="f['title'].errors && f['title'].errors['required']">Vui lòng nhập tên sự kiện</div>
            </div>
          </div>

          <div class="col-md-12">
            <label class="form-label">Mô tả *</label>
            <textarea formControlName="description" class="form-control" rows="3" placeholder="Mô tả chi tiết về sự kiện"></textarea>
            <div *ngIf="submitted && f['description'].errors" class="text-danger mt-1 small">
              <div *ngIf="f['description'].errors && f['description'].errors['required']">Vui lòng nhập mô tả sự kiện</div>
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label">Thời gian bắt đầu *</label>
            <input type="datetime-local" formControlName="startDate" class="form-control">
            <div *ngIf="submitted && f['startDate'].errors" class="text-danger mt-1 small">
              <div *ngIf="f['startDate'].errors && f['startDate'].errors['required']">Vui lòng chọn thời gian bắt đầu</div>
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label">Thời gian kết thúc *</label>
            <input type="datetime-local" formControlName="endDate" class="form-control">
            <div *ngIf="submitted && f['endDate'].errors" class="text-danger mt-1 small">
              <div *ngIf="f['endDate'].errors && f['endDate'].errors['required']">Vui lòng chọn thời gian kết thúc</div>
            </div>
          </div>

          <div class="col-md-12">
            <label class="form-label">Địa điểm *</label>
            <input type="text" formControlName="location" class="form-control" placeholder="Nhập địa điểm tổ chức">
            <div *ngIf="submitted && f['location'].errors" class="text-danger mt-1 small">
              <div *ngIf="f['location'].errors && f['location'].errors['required']">Vui lòng nhập địa điểm</div>
            </div>
          </div>

          <div class="col-md-6">
            <label class="form-label">Số lượng tình nguyện viên tối đa *</label>
            <input type="number" formControlName="maxVolunteers" class="form-control" min="1">
            <div *ngIf="submitted && f['maxVolunteers'].errors" class="text-danger mt-1 small">
              <div *ngIf="f['maxVolunteers'].errors && f['maxVolunteers'].errors['required']">Vui lòng nhập số lượng TNV tối đa</div>
              <div *ngIf="f['maxVolunteers'].errors && f['maxVolunteers'].errors['min']">Số lượng TNV phải lớn hơn 0</div>
            </div>
          </div>

          <div class="col-md-12">
            <label class="form-label">Kỹ năng yêu cầu</label>
            <div class="row g-2">
              <div class="col-md-6" *ngFor="let skill of skills; let i = index">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" [id]="'skill-' + skill.id"
                         [checked]="isSkillSelected(skill.id)"
                         (change)="toggleSkill(skill.id)">
                  <label class="form-check-label" [for]="'skill-' + skill.id">
                    {{ skill.name }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-12">
            <label class="form-label">Lĩnh vực</label>
            <div class="row g-2">
              <div class="col-md-6" *ngFor="let field of fields; let i = index">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" [id]="'field-' + field.id"
                         [checked]="isFieldSelected(field.id)"
                         (change)="toggleField(field.id)">
                  <label class="form-check-label" [for]="'field-' + field.id">
                    {{ field.name }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isActive" formControlName="isActive">
              <label class="form-check-label" for="isActive">Công khai sự kiện</label>
            </div>
          </div>

          <div class="col-md-12 text-end">
            <button type="button" class="btn btn-secondary me-2" (click)="onCancel()">Hủy</button>
            <button type="submit" class="btn btn-primary">{{ event ? 'Cập nhật' : 'Tạo sự kiện' }}</button>
          </div>
        </div>
      </form>
    </div>
  `
})
export class EventFormComponent implements OnInit {
  @Input() event: Event | null = null;
  @Output() formSubmit = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  eventForm!: FormGroup;
  submitted = false;
  skills: Skill[] = [];
  fields: Field[] = [];
  
  selectedSkills: number[] = [];
  selectedFields: number[] = [];

  constructor(
    private fb: FormBuilder,
    private dataService: LocalDataService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadSkillsAndFields();
    
    if (this.event) {
      this.populateForm();
    }
  }

  get f(): any { return this.eventForm.controls; }

  private initForm(): void {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      location: ['', Validators.required],
      maxVolunteers: [10, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  private loadSkillsAndFields(): void {
    this.skills = this.dataService.getSkills();
    this.fields = this.dataService.getFields();
  }

  private populateForm(): void {
    if (!this.event) return;

    this.eventForm.patchValue({
      title: this.event.title,
      description: this.event.description,
      startDate: this.formatDateForInput(this.event.startDate),
      endDate: this.formatDateForInput(this.event.endDate),
      location: this.event.location,
      maxVolunteers: this.event.maxVolunteers,
      isActive: this.event.status === 'active'
    });

    // Load selected skills and fields
    this.selectedSkills = this.event.requireSkills.map(skill => Number(skill)) || [];
    this.selectedFields = this.event.fields.map(field => Number(field)) || [];
  }

  private formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    // Format to YYYY-MM-DDThh:mm (format accepted by datetime-local input)
    return date.toISOString().slice(0, 16);
  }

  isSkillSelected(skillId: number): boolean {
    return this.selectedSkills.includes(skillId);
  }

  toggleSkill(skillId: number): void {
    const index = this.selectedSkills.indexOf(skillId);
    if (index === -1) {
      this.selectedSkills.push(skillId);
    } else {
      this.selectedSkills.splice(index, 1);
    }
  }

  isFieldSelected(fieldId: number): boolean {
    return this.selectedFields.includes(fieldId);
  }

  toggleField(fieldId: number): void {
    const index = this.selectedFields.indexOf(fieldId);
    if (index === -1) {
      this.selectedFields.push(fieldId);
    } else {
      this.selectedFields.splice(index, 1);
    }
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.eventForm.invalid) {
      return;
    }
    
    const formValue = this.eventForm.value;
    
    const eventData = {
      title: formValue.title,
      description: formValue.description,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      location: formValue.location,
      maxVolunteers: formValue.maxVolunteers,
      requireSkills: this.selectedSkills,
      fields: this.selectedFields,
      status: formValue.isActive ? 'active' : 'draft'
    };
    
    this.formSubmit.emit({
      eventData,
      id: this.event?.id
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}