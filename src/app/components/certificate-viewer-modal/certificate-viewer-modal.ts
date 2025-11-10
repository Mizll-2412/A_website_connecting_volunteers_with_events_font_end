import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { CertificateService } from '../../services/certificate.service';
import { jsPDF } from 'jspdf';

interface TemplateField {
  key: string;
  value: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: string;
  fontWeight: string;
}

@Component({
  selector: 'app-certificate-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificate-viewer-modal.html',
  styleUrls: ['./certificate-viewer-modal.css']
})
export class CertificateViewerModalComponent implements OnChanges {
  @Input() certificateId: number | null = null;
  @Input() show: boolean = false;
  @Output() close = new EventEmitter<void>();
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  
  certificateData: any = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  backgroundImageUrl: string = '';
  canvasWidth: number = 1200;
  canvasHeight: number = 800;

  constructor(
    private certificateService: CertificateService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show']) {
      if (this.show && this.certificateId) {
        this.loadCertificate();
        this.openModal();
      } else if (!this.show) {
        this.closeModal();
      }
    }
  }

  loadCertificate(): void {
    if (!this.certificateId) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.certificateService.getCertificateById(this.certificateId).subscribe({
      next: (response: any) => {
        this.certificateData = response?.data || response;
        
        if (!this.certificateData.certificateData) {
          this.errorMessage = 'Chứng nhận chưa có dữ liệu template';
          this.isLoading = false;
          return;
        }

        // Load background image
        if (this.certificateData.backgroundImage) {
          this.backgroundImageUrl = `${environment.baseUrl}/uploads/${this.certificateData.backgroundImage}`;
        }

        // Set canvas size từ certificate data
        if (this.certificateData.width) {
          this.canvasWidth = this.certificateData.width;
        }
        if (this.certificateData.height) {
          this.canvasHeight = this.certificateData.height;
        }

        this.isLoading = false;
        setTimeout(() => this.drawCanvas(), 100);
      },
      error: (err: any) => {
        console.error('Lỗi tải chứng nhận:', err);
        this.errorMessage = err.error?.message || err.message || 'Không thể tải chứng nhận';
        this.isLoading = false;
      }
    });
  }

  drawCanvas(): void {
    if (!this.canvas || !this.certificateData) return;
    
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Parse CertificateData (TemplateConfig đã điền data)
    let fields: TemplateField[] = [];
    try {
      const config = JSON.parse(this.certificateData.certificateData);
      if (config.fields && Array.isArray(config.fields)) {
        fields = config.fields.map((f: any) => ({
          key: f.key || '',
          value: f.value || '',
          x: typeof f.x === 'number' ? f.x : parseFloat(f.x) || 0,
          y: typeof f.y === 'number' ? f.y : parseFloat(f.y) || 0,
          fontSize: typeof f.fontSize === 'number' ? f.fontSize : parseInt(f.fontSize) || 24,
          fontFamily: f.fontFamily || 'Arial',
          color: f.color || '#000000',
          align: f.align || 'center',
          fontWeight: f.fontWeight || 'normal'
        }));
      }
    } catch (e) {
      console.error('Error parsing certificate data:', e);
      this.errorMessage = 'Không thể parse dữ liệu chứng nhận';
      return;
    }

    // Set canvas size
    this.canvas.nativeElement.width = this.canvasWidth;
    this.canvas.nativeElement.height = this.canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw background image
    if (this.backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Nếu chưa có width/height, lấy từ ảnh
        if (!this.certificateData.width || !this.certificateData.height) {
          this.canvasWidth = img.width;
          this.canvasHeight = img.height;
          this.canvas.nativeElement.width = this.canvasWidth;
          this.canvas.nativeElement.height = this.canvasHeight;
        }
        ctx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
        this.drawFields(ctx, fields);
      };
      img.onerror = () => {
        // Nếu load ảnh lỗi, vẽ nền trắng
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.drawFields(ctx, fields);
      };
      img.src = this.backgroundImageUrl;
    } else {
      // Nền trắng nếu không có ảnh
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.drawFields(ctx, fields);
    }
  }

  drawFields(ctx: CanvasRenderingContext2D, fields: TemplateField[]): void {
    fields.forEach(field => {
      if (!field.value) return;

      ctx.font = `${field.fontWeight === 'bold' ? 'bold' : 'normal'} ${field.fontSize}px ${field.fontFamily}`;
      ctx.fillStyle = field.color;
      ctx.textAlign = field.align as CanvasTextAlign;
      ctx.textBaseline = 'top';

      ctx.fillText(field.value, field.x, field.y);
    });
  }

  openModal(): void {
    setTimeout(() => {
      const modalEl = document.getElementById('certificateViewerModal');
      if (!modalEl) return;
      
      // Cleanup modal cũ nếu có
      this.cleanupModal();
      
      if ((window as any).bootstrap) {
        const modal = new (window as any).bootstrap.Modal(modalEl, {
          backdrop: true,
          keyboard: true,
          focus: true
        });
        
        // Listen cho event khi modal đóng (ESC, backdrop click, etc)
        modalEl.addEventListener('hidden.bs.modal', () => {
          this.certificateData = null;
          this.isLoading = false;
          this.errorMessage = '';
          this.close.emit();
        }, { once: true });
        
        modal.show();
      }
    }, 100);
  }

  closeModal(): void {
    const modalEl = document.getElementById('certificateViewerModal');
    if (modalEl && (window as any).bootstrap) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
        modal.dispose(); // Dispose modal instance
      }
    }
    
    // Cleanup thủ công
    this.cleanupModal();
    
    // Reset data
    this.certificateData = null;
    this.isLoading = false;
    this.errorMessage = '';
    
    this.close.emit();
  }
  
  private cleanupModal(): void {
    // Xóa tất cả backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Xóa class modal-open khỏi body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Dispose instance cũ nếu có
    const modalEl = document.getElementById('certificateViewerModal');
    if (modalEl && (window as any).bootstrap) {
      const existingModal = (window as any).bootstrap.Modal.getInstance(modalEl);
      if (existingModal) {
        existingModal.dispose();
      }
      
      // Xóa các class và style trên modal element
      modalEl.classList.remove('show');
      modalEl.style.display = '';
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.removeAttribute('aria-modal');
      modalEl.removeAttribute('role');
    }
  }

  downloadImage(): void {
    if (!this.canvas) {
      alert('Canvas chưa được khởi tạo');
      return;
    }

    // Export canvas thành PNG
    this.canvas.nativeElement.toBlob((blob: Blob | null) => {
      if (!blob) {
        alert('Không thể tạo file ảnh');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ChungNhan_${this.certificateId}.png`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    }, 'image/png');
  }

  downloadPDF(): void {
    if (!this.canvas) {
      alert('Canvas chưa được khởi tạo');
      return;
    }

    try {
      // Convert canvas thành image data URL
      const imgData = this.canvas.nativeElement.toDataURL('image/png', 1.0);
      
      // Tạo PDF với kích thước đúng (tính theo mm)
      // 1 inch = 25.4mm, 96 DPI = 1 pixel = 0.264583mm
      const widthMM = (this.canvasWidth * 0.264583);
      const heightMM = (this.canvasHeight * 0.264583);
      
      // Tạo PDF với orientation phù hợp
      const pdf = new jsPDF({
        orientation: widthMM > heightMM ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [widthMM, heightMM]
      });
      
      // Thêm ảnh vào PDF (fill toàn bộ page)
      pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM, undefined, 'FAST');
      
      // Download PDF
      pdf.save(`ChungNhan_${this.certificateId}.pdf`);
    } catch (error) {
      console.error('Lỗi tạo PDF:', error);
      alert('Không thể tạo PDF: ' + (error instanceof Error ? error.message : 'Đã xảy ra lỗi'));
    }
  }
}
