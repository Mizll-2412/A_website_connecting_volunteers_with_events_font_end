import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CertificateService } from '../../services/certificate.service';
import { environment } from '../../../environments/environment';
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
  selector: 'app-certificate-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificate-viewer.html',
  styleUrls: ['./certificate-viewer.css']
})
export class CertificateViewerComponent implements OnInit, AfterViewInit {
  @Input() certificateId?: number;
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  
  isLoading: boolean = false;
  errorMessage: string = '';
  certificateData: any = null;
  backgroundImageUrl: string = '';
  canvasWidth: number = 1200;
  canvasHeight: number = 800;

  constructor(
    private certificateService: CertificateService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const routeId = this.route.snapshot.params['id'];
    if (routeId) {
      this.certificateId = +routeId;
      this.loadCertificate();
    } else if (this.certificateId) {
      this.loadCertificate();
    } else {
      this.errorMessage = 'Không tìm thấy ID chứng nhận';
      this.isLoading = false;
    }
  }

  ngAfterViewInit(): void {
    // Đợi view init xong mới render canvas
    if (this.certificateData) {
      setTimeout(() => this.drawCanvas(), 100);
    }
  }

  loadCertificate(): void {
    if (!this.certificateId || this.certificateId <= 0) {
      this.errorMessage = 'ID chứng nhận không hợp lệ';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.certificateService.getCertificateById(this.certificateId).subscribe({
      next: (response: any) => {
        this.certificateData = response.data || response;
        
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

  shareCertificate(): void {
    if (navigator.share) {
      navigator.share({
        title: 'Giấy chứng nhận tình nguyện',
        text: 'Xem giấy chứng nhận của tôi',
        url: window.location.href
      }).catch((err) => console.error('Lỗi chia sẻ:', err));
    } else {
      // Fallback: Copy link to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Đã copy link vào clipboard');
      });
    }
  }
}

