import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EventService } from '../../../services/event';
import { FieldService } from '../../../services/field';
import { SkillService } from '../../../services/skill';
import { ToChucService } from '../../../services/organization';
import { ToastService } from '../../../services/toast.service';
import { formatDateTimeForInput } from '../../../utils/date-format.util';
import { getImageUrl } from '../../../utils/image-url.util';

export interface EventFormData {
  maSuKien?: number;
  tenSuKien: string;
  noiDung: string;
  ngayBatDau: any;
  ngayKetThuc: any;
  tuyenBatDau: any;
  tuyenKetThuc: any;
  ngayDienRaBatDau?: any;
  ngayDienRaKetThuc?: any;
  thoiGianKhoaHuy?: number;
  diaChi: string;
  soLuong: number;
  maToChuc?: number;
  hinhAnh?: string;
  linhVucIds?: number[];
  kyNangIds?: number[];
}

@Component({
  selector: 'app-event-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './event-form-modal.html',
  styleUrls: ['./event-form-modal.css']
})
export class EventFormModalComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() isEditing: boolean = false;
  @Input() eventData: EventFormData | null = null;
  @Input() showOrganizationSelector: boolean = true; // true for admin, false for organization
  @Input() defaultOrganizationId?: number; // For organization mode
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  suKienMoi: EventFormData = this.createEmptyEvent();
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isSaving: boolean = false;
  soLuongError: string = '';

  // Data
  linhVucs: any[] = [];
  kyNangs: any[] = [];
  organizations: any[] = [];
  selectedLinhVucs: number[] = [];
  selectedKyNangs: number[] = [];

  constructor(
    private eventService: EventService,
    private fieldService: FieldService,
    private skillService: SkillService,
    private toChucService: ToChucService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadFields();
    this.loadSkills();
    if (this.showOrganizationSelector) {
      this.loadOrganizations();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      if (this.eventData) {
        this.loadEventData(this.eventData);
      } else {
        this.resetForm();
      }
    }
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (response: any) => {
        this.linhVucs = response.data || response || [];
      },
      error: (err) => console.error('Lỗi tải lĩnh vực:', err)
    });
  }

  loadSkills(): void {
    this.skillService.getAllSkills().subscribe({
      next: (response: any) => {
        this.kyNangs = response.data || response || [];
      },
      error: (err) => console.error('Lỗi tải kỹ năng:', err)
    });
  }

  loadOrganizations(): void {
    this.toChucService.getAllOrganizations().subscribe({
      next: (response: any) => {
        this.organizations = response.data || response || [];
      },
      error: (err: any) => console.error('Lỗi tải tổ chức:', err)
    });
  }

  loadEventData(data: EventFormData): void {
    this.suKienMoi = {
      ...data,
      ngayBatDau: formatDateTimeForInput(data.ngayBatDau),
      ngayKetThuc: formatDateTimeForInput(data.ngayKetThuc),
      tuyenBatDau: formatDateTimeForInput(data.tuyenBatDau),
      tuyenKetThuc: formatDateTimeForInput(data.tuyenKetThuc),
      ngayDienRaBatDau: data.ngayDienRaBatDau ? formatDateTimeForInput(data.ngayDienRaBatDau) : null,
      ngayDienRaKetThuc: data.ngayDienRaKetThuc ? formatDateTimeForInput(data.ngayDienRaKetThuc) : null,
    };
    this.selectedLinhVucs = data.linhVucIds || [];
    this.selectedKyNangs = data.kyNangIds || [];
    if (data.hinhAnh) {
      this.previewUrl = getImageUrl(data.hinhAnh);
    }
  }

  resetForm(): void {
    this.suKienMoi = this.createEmptyEvent();
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedLinhVucs = [];
    this.selectedKyNangs = [];
    this.soLuongError = '';
  }

  createEmptyEvent(): EventFormData {
    return {
      tenSuKien: '',
      noiDung: '',
      ngayBatDau: '',
      ngayKetThuc: '',
      tuyenBatDau: '',
      tuyenKetThuc: '',
      ngayDienRaBatDau: null,
      ngayDienRaKetThuc: null,
      thoiGianKhoaHuy: 24,
      diaChi: '',
      soLuong: 1,
      maToChuc: this.defaultOrganizationId || undefined,
      linhVucIds: [],
      kyNangIds: []
    };
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSoLuongChange(): void {
    if (this.suKienMoi.soLuong !== null && this.suKienMoi.soLuong !== undefined) {
      if (this.suKienMoi.soLuong <= 0) {
        this.soLuongError = 'Số lượng phải lớn hơn 0';
      } else {
        this.soLuongError = '';
      }
    }
  }

  onSelectLinhVucChange(values: number[]): void {
    this.selectedLinhVucs = values;
  }

  onSelectKyNangChange(values: number[]): void {
    this.selectedKyNangs = values;
  }

  // Dynamic min/max date methods
  getMinDateForNgayBatDau(): string {
    const now = new Date();
    return formatDateTimeForInput(now);
  }

  getMinDateForNgayKetThuc(): string {
    if (this.suKienMoi.ngayBatDau) {
      return this.suKienMoi.ngayBatDau;
    }
    return this.getMinDateForNgayBatDau();
  }

  getMinDateForTuyenBatDau(): string {
    if (this.suKienMoi.ngayBatDau) {
      return this.suKienMoi.ngayBatDau;
    }
    return this.getMinDateForNgayBatDau();
  }

  getMaxDateForTuyenBatDau(): string {
    if (this.suKienMoi.ngayKetThuc) {
      return this.suKienMoi.ngayKetThuc;
    }
    return '';
  }

  getMinDateForTuyenKetThuc(): string {
    if (this.suKienMoi.tuyenBatDau) {
      return this.suKienMoi.tuyenBatDau;
    }
    if (this.suKienMoi.ngayBatDau) {
      return this.suKienMoi.ngayBatDau;
    }
    return this.getMinDateForNgayBatDau();
  }

  getMaxDateForTuyenKetThuc(): string {
    if (this.suKienMoi.ngayKetThuc) {
      return this.suKienMoi.ngayKetThuc;
    }
    return '';
  }

  getMinDateForNgayDienRaBatDau(): string {
    if (this.suKienMoi.ngayBatDau) {
      return this.suKienMoi.ngayBatDau;
    }
    return this.getMinDateForNgayBatDau();
  }

  getMaxDateForNgayDienRaBatDau(): string {
    if (this.suKienMoi.ngayKetThuc) {
      return this.suKienMoi.ngayKetThuc;
    }
    return '';
  }

  getMinDateForNgayDienRaKetThuc(): string {
    if (this.suKienMoi.ngayDienRaBatDau) {
      return this.suKienMoi.ngayDienRaBatDau;
    }
    if (this.suKienMoi.ngayBatDau) {
      return this.suKienMoi.ngayBatDau;
    }
    return this.getMinDateForNgayBatDau();
  }

  getMaxDateForNgayDienRaKetThuc(): string {
    if (this.suKienMoi.ngayKetThuc) {
      return this.suKienMoi.ngayKetThuc;
    }
    return '';
  }

  onNgayBatDauChange(): void {
    // Auto-adjust other dates if needed
  }

  onNgayKetThucChange(): void {
    // Auto-adjust other dates if needed
  }

  onTuyenBatDauChange(): void {
    // Auto-adjust other dates if needed
  }

  onTuyenKetThucChange(): void {
    // Auto-adjust other dates if needed
  }

  getTrangThaiTuDong(): string {
    const now = new Date();
    const ngayBatDau = this.suKienMoi.ngayBatDau ? new Date(this.suKienMoi.ngayBatDau) : null;
    const ngayKetThuc = this.suKienMoi.ngayKetThuc ? new Date(this.suKienMoi.ngayKetThuc) : null;

    if (!ngayBatDau || !ngayKetThuc) {
      return 'Chưa xác định';
    }

    if (now < ngayBatDau) {
      return 'Sắp diễn ra';
    } else if (now >= ngayBatDau && now <= ngayKetThuc) {
      return 'Đang diễn ra';
    } else {
      return 'Đã kết thúc';
    }
  }

  validate(): boolean {
    // Validate required fields
    if (!this.suKienMoi.tenSuKien || !this.suKienMoi.noiDung || !this.suKienMoi.diaChi) {
      this.toastService.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
      return false;
    }

    if (!this.suKienMoi.ngayBatDau || !this.suKienMoi.ngayKetThuc || 
        !this.suKienMoi.tuyenBatDau || !this.suKienMoi.tuyenKetThuc) {
      this.toastService.warning('Vui lòng điền đầy đủ thông tin thời gian');
      return false;
    }

    if (!this.suKienMoi.soLuong || this.suKienMoi.soLuong <= 0) {
      this.toastService.warning('Số lượng tình nguyện viên phải lớn hơn 0');
      return false;
    }

    if (this.showOrganizationSelector && !this.suKienMoi.maToChuc) {
      this.toastService.warning('Vui lòng chọn tổ chức phụ trách');
      return false;
    }

    if (!this.selectedFile && !this.suKienMoi.hinhAnh) {
      this.toastService.warning('Vui lòng chọn hình ảnh cho sự kiện');
      return false;
    }

    if (this.selectedLinhVucs.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất 1 lĩnh vực');
      return false;
    }

    if (this.selectedKyNangs.length === 0) {
      this.toastService.warning('Vui lòng chọn ít nhất 1 kỹ năng');
      return false;
    }

    const ngayBatDau = new Date(this.suKienMoi.ngayBatDau);
    const ngayKetThuc = new Date(this.suKienMoi.ngayKetThuc);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset giờ để so sánh chỉ ngày
    ngayBatDau.setHours(0, 0, 0, 0);
    ngayKetThuc.setHours(0, 0, 0, 0);

    // Kiểm tra nếu là tạo mới (không phải chỉnh sửa), ngày bắt đầu phải >= thời gian hiện tại
    if (!this.isEditing && ngayBatDau < now) {
      this.toastService.warning('Ngày bắt đầu phải bằng hoặc lớn hơn thời gian hiện tại');
      return false;
    }

    // Kiểm tra ngày kết thúc không được trong quá khứ khi tạo mới
    if (!this.isEditing && ngayKetThuc < now) {
      this.toastService.warning('Ngày kết thúc phải bằng hoặc lớn hơn thời gian hiện tại');
      return false;
    }

    if (ngayBatDau > ngayKetThuc) {
      this.toastService.warning('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      return false;
    }

    if (this.suKienMoi.ngayDienRaBatDau) {
      const ngayDienRaBatDau = new Date(this.suKienMoi.ngayDienRaBatDau);
      if (ngayDienRaBatDau < ngayBatDau || ngayDienRaBatDau > ngayKetThuc) {
        this.toastService.warning('Ngày bắt đầu diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện');
        return false;
      }
    }

    if (this.suKienMoi.ngayDienRaKetThuc) {
      const ngayDienRaKetThuc = new Date(this.suKienMoi.ngayDienRaKetThuc);
      if (ngayDienRaKetThuc < ngayBatDau || ngayDienRaKetThuc > ngayKetThuc) {
        this.toastService.warning('Ngày kết thúc diễn ra phải nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc sự kiện');
        return false;
      }

      if (this.suKienMoi.ngayDienRaBatDau) {
        const ngayDienRaBatDau = new Date(this.suKienMoi.ngayDienRaBatDau);
        if (ngayDienRaKetThuc < ngayDienRaBatDau) {
          this.toastService.warning('Ngày kết thúc diễn ra phải sau hoặc bằng ngày bắt đầu diễn ra');
          return false;
        }
      }
    }

    return true;
  }

  luuSuKien(): void {
    if (!this.validate()) {
      return;
    }

    this.isSaving = true;

    const eventData = {
      ...this.suKienMoi,
      linhVucIds: this.selectedLinhVucs,
      kyNangIds: this.selectedKyNangs,
      maToChuc: this.showOrganizationSelector ? this.suKienMoi.maToChuc : this.defaultOrganizationId
    };

    const apiCall = this.isEditing
      ? this.eventService.updateSuKien(this.suKienMoi.maSuKien!, eventData, this.selectedFile || undefined)
      : this.eventService.createSuKien(eventData, this.selectedFile || undefined);

    apiCall.subscribe({
      next: (response) => {
        this.isSaving = false;
        this.toastService.success(this.isEditing ? 'Cập nhật sự kiện thành công!' : 'Tạo sự kiện thành công!');
        this.saved.emit();
        this.close();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Lỗi lưu sự kiện:', err);
        this.toastService.error(err.error?.message || 'Không thể lưu sự kiện. Vui lòng thử lại.');
      }
    });
  }

  huyBo(): void {
    if (this.isSaving) return;
    this.cancelled.emit();
    this.close();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  getImageUrl(path: string): string {
    return getImageUrl(path);
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/event-default.jpg';
  }
}

