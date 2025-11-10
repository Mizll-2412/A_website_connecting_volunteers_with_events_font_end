import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CertificateService } from '../../services/certificate.service';
import { environment } from '../../../environments/environment';

interface TemplateField {
  key: string;
  label: string;
  x: number;
  y: number;
  fontSize: number | string;
  fontFamily: string;
  color: string;
  align: string;
  fontWeight: string;
}

interface TemplateConfig {
  fields: TemplateField[];
}

@Component({
  selector: 'app-certificate-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './certificate-template-editor.html',
  styleUrls: ['./certificate-template-editor.css']
})
export class CertificateTemplateEditorComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrapper', { static: false }) canvasWrapper!: ElementRef<HTMLDivElement>;
  
  templateId: number = 0;
  backgroundImage: string = '';
  backgroundImageFile: File | null = null;
  backgroundImagePreview: string = '';
  private cachedBackground: HTMLImageElement | null = null;
  private isBackgroundLoaded: boolean = false;
  private hoverField: TemplateField | null = null;
  canvasWidth: number = 1200;
  canvasHeight: number = 800;
  zoomLevel: number = 1;
  minZoom: number = 0.25;
  maxZoom: number = 3;
  
  config: TemplateConfig = {
    fields: []
  };
  
  selectedField: TemplateField | null = null;
  isDragging: boolean = false;
  dragOffset = { x: 0, y: 0 };
  isPanning: boolean = false;
  panOffset = { x: 0, y: 0 };
  panStart = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private needsRedraw: boolean = false;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private backgroundCacheDirty: boolean = true;
  
  availableFields = [
    { key: 'TenTNV', label: 'Tên tình nguyện viên' },
    { key: 'TenSuKien', label: 'Tên sự kiện' },
    { key: 'TenToChuc', label: 'Tên tổ chức' },
    { key: 'NgayCap', label: 'Ngày cấp' },
    { key: 'ThoiGian', label: 'Thời gian sự kiện' },
    { key: 'DiaChi', label: 'Địa điểm' },
    { key: 'SoGioThamGia', label: 'Số giờ tham gia' },
    { key: 'MaChungNhan', label: 'Mã chứng nhận' }
  ];
  
  fontFamilies = ['Times New Roman', 'Arial', 'Roboto', 'Courier New'];
  fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
  alignments = ['left', 'center', 'right'];
  
  sampleData = {
    TenTNV: 'Nguyễn Văn A',
    TenSuKien: 'Chiến dịch Mùa Hè Xanh 2024',
    TenToChuc: 'Hội Sinh viên Việt Nam',
    NgayCap: '01/12/2024',
    ThoiGian: '15/07/2024 - 30/08/2024',
    DiaChi: 'Hà Nội',
    SoGioThamGia: '120',
    MaChungNhan: 'CERT-2024-001'
  };
  
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  isDefault: boolean = false;
  isSettingDefault: boolean = false;

  get availableFieldsFiltered() {
    return this.availableFields.filter(field => !this.config.fields.some(f => f.key === field.key));
  }
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private certificateService: CertificateService
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.templateId = +params['id'];
        this.loadTemplate();
      }
    });
  }
  
  loadTemplate(): void {
    this.isLoading = true;
    
    // Load template info
    this.certificateService.getCertificateSampleById(this.templateId).subscribe({
      next: (response: any) => {
        const template = response.data || response;
        this.backgroundImage = template.backgroundImage || '';
        this.backgroundImagePreview = template.backgroundImage 
          ? `${environment.baseUrl}/uploads/${template.backgroundImage}` 
          : '';
        
        // Luôn ưu tiên lấy kích thước từ ảnh để tránh méo ảnh
        // Nếu có ảnh, load ảnh để lấy kích thước chính xác
        if (this.backgroundImagePreview) {
          // Load ảnh và lấy kích thước từ ảnh (sẽ override width/height từ template nếu có)
          this.preloadBackgroundAndSetSize(this.backgroundImagePreview);
        } else {
          // Nếu không có ảnh, dùng kích thước từ template hoặc mặc định
          this.canvasWidth = template.width || 1200;
          this.canvasHeight = template.height || 800;
        }
        
        this.isDefault = !!template.isDefault;
        
        // Load config
        if (template.templateConfig) {
          try {
            this.config = JSON.parse(template.templateConfig);
          } catch (e) {
            console.error('Error parsing config:', e);
          }
        }
        
        this.isLoading = false;
        setTimeout(() => this.drawCanvas(), 100);
      },
      error: (err: any) => {
        console.error('Error loading template:', err);
        this.errorMessage = 'Không thể tải mẫu chứng nhận';
        this.isLoading = false;
      }
    });
  }
  
  addField(fieldKey: string): void {
    if (this.config.fields.some(f => f.key === fieldKey)) {
      return;
    }

    const fieldInfo = this.availableFields.find(f => f.key === fieldKey);
    if (!fieldInfo) return;
    
    const newField: TemplateField = {
      key: fieldKey,
      label: fieldInfo.label,
      x: this.canvasWidth / 2,
      y: this.canvasHeight / 2,
      fontSize: 24,
      fontFamily: 'Times New Roman',
      color: '#000000',
      align: 'center',
      fontWeight: 'normal'
    };
    
    this.config.fields.push(newField);
    this.selectedField = newField;
    this.drawCanvas();
  }
  
  removeField(field: TemplateField): void {
    const index = this.config.fields.indexOf(field);
    if (index > -1) {
      this.config.fields.splice(index, 1);
      if (this.selectedField === field) {
        this.selectedField = null;
      }
      this.drawCanvas();
    }
  }
  
  selectField(field: TemplateField): void {
    this.selectedField = field;
    this.drawCanvas();
  }
  
  private updateCursor(cursor: 'default' | 'grab' | 'grabbing'): void {
    if (this.canvas?.nativeElement) {
      this.canvas.nativeElement.style.cursor = cursor;
    }
  }

  onCanvasMouseDown(event: MouseEvent): void {
    // Kiểm tra chuột phải để pan canvas
    if (event.button === 2 || event.which === 3) {
      event.preventDefault(); // Ngăn context menu
      this.isPanning = true;
      this.panStart = {
        x: event.clientX - this.panOffset.x,
        y: event.clientY - this.panOffset.y
      };
      this.updateCursor('grabbing');
      // Thêm event listener trên document để bắt mouse move và mouse up khi đang pan
      document.addEventListener('mousemove', this.handleDocumentPanMove);
      document.addEventListener('mouseup', this.handleDocumentPanUp);
      document.addEventListener('contextmenu', this.preventContextMenu);
      return;
    }
    
    // Chuột trái để drag field
    // Lấy tọa độ từ wrapper (đã được scale bằng CSS transform)
    const wrapper = this.canvasWrapper?.nativeElement;
    const canvas = this.canvas.nativeElement;
    
    // Lấy rect từ wrapper nếu có, nếu không thì lấy từ canvas
    // Lưu ý: getBoundingClientRect() của wrapper đã bao gồm cả translate, nên không cần trừ panOffset
    const rect = wrapper ? wrapper.getBoundingClientRect() : canvas.getBoundingClientRect();
    // Tính toán tọa độ trên canvas gốc (chưa scale) - chia cho zoomLevel
    const x = (event.clientX - rect.left) / this.zoomLevel;
    const y = (event.clientY - rect.top) / this.zoomLevel;
    
    // Find field at click position
    for (let i = this.config.fields.length - 1; i >= 0; i--) {
      const field = this.config.fields[i];
      const text = this.getFieldValue(field.key);
      const bounds = this.getFieldBoundingBox(field, text);
      
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        this.selectedField = field;
        this.isDragging = true;
        this.dragOffset = {
          x: x - field.x,
          y: y - field.y
        };
        this.updateCursor('grabbing');
        // Thêm event listener trên document để bắt mouse move và mouse up khi đang drag
        document.addEventListener('mousemove', this.handleDocumentMouseMove);
        document.addEventListener('mouseup', this.handleDocumentMouseUp);
        this.drawCanvas();
        break;
      }
    }
  }
  
  onCanvasMouseMove(event: MouseEvent): void {
    // Nếu đang pan, không xử lý hover
    if (this.isPanning) {
      return;
    }
    
    // Lấy tọa độ từ wrapper (đã được scale bằng CSS transform)
    const wrapper = this.canvasWrapper?.nativeElement;
    const canvas = this.canvas.nativeElement;
    
    // Lấy rect từ wrapper nếu có, nếu không thì lấy từ canvas
    // Lưu ý: getBoundingClientRect() của wrapper đã bao gồm cả translate, nên không cần trừ panOffset
    const rect = wrapper ? wrapper.getBoundingClientRect() : canvas.getBoundingClientRect();
    // Tính toán tọa độ trên canvas gốc (chưa scale) - chia cho zoomLevel
    const x = (event.clientX - rect.left) / this.zoomLevel;
    const y = (event.clientY - rect.top) / this.zoomLevel;
    
    if (this.isDragging && this.selectedField) {
      this.selectedField.x = x - this.dragOffset.x;
      this.selectedField.y = y - this.dragOffset.y;
      
      // Keep within bounds
      this.selectedField.x = Math.max(0, Math.min(this.canvasWidth, this.selectedField.x));
      this.selectedField.y = Math.max(20, Math.min(this.canvasHeight, this.selectedField.y));
      
      this.drawCanvas();
      return;
    }

    let hovering = false;
    let hoverField: TemplateField | null = null;
    for (let i = this.config.fields.length - 1; i >= 0; i--) {
      const field = this.config.fields[i];
      const text = this.getFieldValue(field.key);
      const bounds = this.getFieldBoundingBox(field, text);
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        hoverField = field;
        hovering = true;
        this.updateCursor('grab');
        break;
      }
    }
    if (hovering && this.hoverField !== hoverField) {
      this.hoverField = hoverField;
      this.drawCanvas();
    } else if (!hovering) {
      if (this.hoverField) {
        this.hoverField = null;
        this.drawCanvas();
      }
      this.updateCursor('default');
    }
  }
  
  onCanvasMouseUp(): void {
    this.stopDragging();
  }

  onCanvasWheel(event: WheelEvent): void {
    // Chỉ zoom khi Ctrl được nhấn (hoặc Cmd trên Mac)
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    
    event.preventDefault(); // Ngăn scroll trang
    
    const wrapper = this.canvasWrapper?.nativeElement;
    if (!wrapper) return;
    
    // Lấy vị trí chuột trên canvas container
    const container = wrapper.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    // Lấy vị trí hiện tại của wrapper (đã bao gồm pan và zoom)
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Tính toán vị trí chuột trên canvas gốc (chưa zoom, chưa pan)
    // Vị trí trên wrapper (tương đối với wrapper)
    const wrapperX = mouseX - (wrapperRect.left - containerRect.left);
    const wrapperY = mouseY - (wrapperRect.top - containerRect.top);
    
    // Vị trí trên canvas gốc (chưa transform)
    const canvasX = (wrapperX - this.panOffset.x) / this.zoomLevel;
    const canvasY = (wrapperY - this.panOffset.y) / this.zoomLevel;
    
    // Tính zoom mới
    const oldZoom = this.zoomLevel;
    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1; // Zoom out nếu scroll down, zoom in nếu scroll up
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, oldZoom * scaleFactor));
    
    if (newZoom === oldZoom) return; // Không thay đổi nếu đã đạt giới hạn
    
    // Cập nhật zoom
    this.zoomLevel = newZoom;
    
    // Điều chỉnh panOffset để điểm dưới chuột giữ nguyên vị trí trên màn hình
    // Sau khi zoom, vị trí mới của điểm đó trên wrapper
    const newWrapperX = canvasX * newZoom + this.panOffset.x;
    const newWrapperY = canvasY * newZoom + this.panOffset.y;
    
    // Điều chỉnh panOffset để điểm đó vẫn ở vị trí chuột
    this.panOffset.x += wrapperX - newWrapperX;
    this.panOffset.y += wrapperY - newWrapperY;
  }

  private stopDragging(): void {
    this.isDragging = false;
    this.updateCursor('default');
    // Xóa event listener trên document
    document.removeEventListener('mousemove', this.handleDocumentMouseMove);
    document.removeEventListener('mouseup', this.handleDocumentMouseUp);
    
    // Đảm bảo vẽ lại ngay lập tức khi dừng drag (không qua requestAnimationFrame)
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.needsRedraw = false;
    this.backgroundCacheDirty = true; // Đánh dấu cache cần cập nhật
    this.drawCanvas();
  }

  // Handler cho mouse move trên document (khi đang drag)
  private handleDocumentMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging || !this.selectedField) return;
    
    // Lấy tọa độ từ wrapper (đã được scale bằng CSS transform)
    const wrapper = this.canvasWrapper?.nativeElement;
    if (!wrapper) return;
    
    // Lấy rect từ wrapper - chỉ gọi một lần để tối ưu
    const rect = wrapper.getBoundingClientRect();
    
    // Tính toán tọa độ trên canvas gốc (chưa scale) - chia cho zoomLevel
    const x = (event.clientX - rect.left) / this.zoomLevel;
    const y = (event.clientY - rect.top) / this.zoomLevel;
    
    // Cập nhật vị trí field ngay lập tức (không chờ render)
    this.selectedField.x = x - this.dragOffset.x;
    this.selectedField.y = y - this.dragOffset.y;
    
    // Keep within bounds
    this.selectedField.x = Math.max(0, Math.min(this.canvasWidth, this.selectedField.x));
    this.selectedField.y = Math.max(20, Math.min(this.canvasHeight, this.selectedField.y));
    
    // Đánh dấu cần vẽ lại và sử dụng requestAnimationFrame để render mượt
    this.needsRedraw = true;
    this.scheduleRedraw();
  };

  // Handler cho mouse up trên document (khi đang drag)
  private handleDocumentMouseUp = (): void => {
    this.stopDragging();
  };

  // Handler cho pan move trên document
  private handleDocumentPanMove = (event: MouseEvent): void => {
    if (!this.isPanning) return;
    
    this.panOffset = {
      x: event.clientX - this.panStart.x,
      y: event.clientY - this.panStart.y
    };
  };

  // Handler cho pan up trên document
  private handleDocumentPanUp = (): void => {
    this.stopPanning();
  };

  // Ngăn context menu khi đang pan
  private preventContextMenu = (event: Event): void => {
    if (this.isPanning) {
      event.preventDefault();
    }
  };

  private stopPanning(): void {
    this.isPanning = false;
    this.updateCursor('default');
    // Xóa event listener trên document
    document.removeEventListener('mousemove', this.handleDocumentPanMove);
    document.removeEventListener('mouseup', this.handleDocumentPanUp);
    document.removeEventListener('contextmenu', this.preventContextMenu);
  }
  
  onFieldStyleChange(): void {
    this.backgroundCacheDirty = true; // Đánh dấu cache cần cập nhật
    this.drawCanvas();
  }

  // Sử dụng requestAnimationFrame để render mượt mà
  private scheduleRedraw(): void {
    // Nếu đang drag, vẽ ngay lập tức để đảm bảo mượt mà
    if (this.isDragging) {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.needsRedraw = false;
      this.drawCanvasFast();
      return;
    }
    
    // Nếu không đang drag, sử dụng requestAnimationFrame để tối ưu
    if (this.animationFrameId !== null) {
      return; // Đã có frame đang chờ
    }
    
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      if (this.needsRedraw) {
        this.needsRedraw = false;
        this.drawCanvas();
      }
    });
  }
  
  // Khởi tạo offscreen canvas để cache
  private initOffscreenCanvas(): void {
    // Tạo mới hoặc cập nhật kích thước nếu cần
    if (!this.offscreenCanvas || 
        this.offscreenCanvas.width !== this.canvasWidth || 
        this.offscreenCanvas.height !== this.canvasHeight) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.canvasWidth;
      this.offscreenCanvas.height = this.canvasHeight;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      this.backgroundCacheDirty = true;
    }
  }

  // Vẽ nhanh khi đang drag - chỉ vẽ lại field đang được drag
  private drawCanvasFast(): void {
    if (!this.canvas || !this.selectedField) {
      this.drawCanvas();
      return;
    }
    
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Khởi tạo offscreen canvas nếu chưa có
    this.initOffscreenCanvas();
    
    // Nếu cache bị dirty, vẽ lại toàn bộ vào offscreen canvas
    if (this.backgroundCacheDirty || !this.offscreenCtx) {
      this.updateOffscreenCanvas();
      this.backgroundCacheDirty = false;
    }
    
    // Copy từ offscreen canvas sang canvas chính
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    if (this.offscreenCanvas) {
      ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
    
    // Chỉ vẽ lại field đang được drag
    this.drawSingleField(ctx, this.selectedField, true);
  }

  // Cập nhật offscreen canvas với background và tất cả fields (trừ field đang drag)
  private updateOffscreenCanvas(): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;
    
    const ctx = this.offscreenCtx;
    
    // Clear offscreen canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw background
    if (this.cachedBackground && this.isBackgroundLoaded) {
      const img = this.cachedBackground;
      ctx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
    
    // Draw all fields except the one being dragged
    this.config.fields.forEach(field => {
      if (field !== this.selectedField) {
        this.drawSingleField(ctx, field, false);
      }
    });
  }

  // Vẽ một field
  private drawSingleField(ctx: CanvasRenderingContext2D, field: TemplateField, isSelected: boolean): void {
    const text = this.getFieldValue(field.key);
    const fontSize = this.getFontSize(field);
    ctx.font = `${field.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px ${field.fontFamily}`;
    ctx.fillStyle = field.color;
    ctx.textAlign = field.align as CanvasTextAlign;
    ctx.textBaseline = 'top';
    
    ctx.fillText(text, field.x, field.y);
    
    // Draw selection indicator
    if (isSelected) {
      const bounds = this.getFieldBoundingBox(field, text, ctx);
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
      ctx.setLineDash([]);
    } else if (this.hoverField === field) {
      const bounds = this.getFieldBoundingBox(field, text, ctx);
      ctx.strokeStyle = '#0d6efd';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
      ctx.setLineDash([]);
    }
  }
  
  drawCanvas(): void {
    if (!this.canvas) return;
    
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Đánh dấu cache cần cập nhật
    this.backgroundCacheDirty = true;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw background (use cached to avoid flicker)
    if (this.cachedBackground && this.isBackgroundLoaded) {
      // Vẽ ảnh đúng kích thước canvas, giữ tỷ lệ khung hình
      const img = this.cachedBackground;
      // Vẽ ảnh với kích thước canvas (nếu canvas đã được set đúng từ ảnh thì sẽ không méo)
      ctx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
      this.drawFields(ctx);
    } else if (this.backgroundImagePreview && !this.isBackgroundLoaded) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.drawFields(ctx);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.drawFields(ctx);
    }
  }
  
  drawFields(ctx: CanvasRenderingContext2D): void {
    this.config.fields.forEach(field => {
      const text = this.getFieldValue(field.key);
      
      const fontSize = this.getFontSize(field);
      ctx.font = `${field.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px ${field.fontFamily}`;
      ctx.fillStyle = field.color;
      ctx.textAlign = field.align as CanvasTextAlign;
      ctx.textBaseline = 'top';
      
      ctx.fillText(text, field.x, field.y);
      
      // Draw selection indicator
      if (this.selectedField === field) {
        const bounds = this.getFieldBoundingBox(field, text, ctx);
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
        ctx.setLineDash([]);
      } else if (this.hoverField === field) {
        const bounds = this.getFieldBoundingBox(field, text, ctx);
        ctx.strokeStyle = '#0d6efd';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
        ctx.setLineDash([]);
      }
    });
  }
  
  measureTextWidth(text: string, field: TemplateField): number {
    if (!this.canvas) return 0;
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return 0;
    
    const fontSize = this.getFontSize(field);
    ctx.font = `${field.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px ${field.fontFamily}`;
    return ctx.measureText(text).width;
  }
  
  getFieldValue(key: string): string {
    return (this.sampleData as any)[key] || key;
  }

  private getFontSize(field: TemplateField): number {
    if (typeof field.fontSize === 'number') {
      return field.fontSize;
    }
    if (typeof field.fontSize === 'string') {
      const parsed = parseInt(field.fontSize.replace('px', '').trim(), 10);
      return isNaN(parsed) ? 24 : parsed;
    }
    return 24;
  }

  private getFieldBoundingBox(field: TemplateField, text: string, ctx?: CanvasRenderingContext2D) {
    const canvasCtx = ctx ?? this.canvas?.nativeElement.getContext('2d') ?? undefined;
    let width = 0;
    let height = 0;
    const fontSize = this.getFontSize(field);

    if (canvasCtx) {
      canvasCtx.font = `${field.fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSize}px ${field.fontFamily}`;
      const metrics = canvasCtx.measureText(text);
      width = metrics.width;

      const ascent = (metrics as any).actualBoundingBoxAscent;
      const descent = (metrics as any).actualBoundingBoxDescent;
      if (typeof ascent === 'number' && typeof descent === 'number') {
        height = ascent + descent;
      } else {
        height = fontSize * 1.2;
      }
    } else {
      width = this.measureTextWidth(text, field);
      height = fontSize * 1.2;
    }

    let fieldX = field.x;
    if (field.align === 'center') {
      fieldX -= width / 2;
    } else if (field.align === 'right') {
      fieldX -= width;
    }

    return {
      x: fieldX,
      y: field.y,
      width,
      height
    };
  }
  
  uploadBackground(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG, ...)');
      return;
    }
    
    // Store file for upload later
    this.backgroundImageFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.backgroundImagePreview = e.target.result;
      // Khi upload ảnh mới, lấy kích thước từ ảnh
      this.preloadBackgroundAndSetSize(this.backgroundImagePreview);
      this.drawCanvas();
    };
    reader.readAsDataURL(file);
  }
  
  clearBackground(): void {
    this.backgroundImage = '';
    this.backgroundImagePreview = '';
    this.backgroundImageFile = null;
    this.cachedBackground = null;
    this.isBackgroundLoaded = false;
    this.drawCanvas();
  }

  private preloadBackground(src: string): void {
    if (!src) {
      this.cachedBackground = null;
      this.isBackgroundLoaded = false;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.cachedBackground = img;
      this.isBackgroundLoaded = true;
      this.backgroundCacheDirty = true; // Đánh dấu cache cần cập nhật
      this.drawCanvas();
    };
    img.onerror = () => {
      this.cachedBackground = null;
      this.isBackgroundLoaded = false;
      this.drawCanvas();
    };
    img.src = src;
  }

  private preloadBackgroundAndSetSize(src: string): void {
    if (!src) {
      this.cachedBackground = null;
      this.isBackgroundLoaded = false;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.cachedBackground = img;
      this.isBackgroundLoaded = true;
      // Luôn lấy kích thước từ ảnh gốc để đảm bảo không bị méo
      // Điều này override bất kỳ width/height nào đã được lưu trong template
      this.canvasWidth = img.width;
      this.canvasHeight = img.height;
      this.backgroundCacheDirty = true; // Đánh dấu cache cần cập nhật
      
      // Tự động tính zoom để fit vào viewport nếu canvas quá lớn
      this.calculateInitialZoom();
      
      this.drawCanvas();
    };
    img.onerror = () => {
      this.cachedBackground = null;
      this.isBackgroundLoaded = false;
      this.drawCanvas();
    };
    img.src = src;
  }

  // Tính toán zoom level ban đầu để canvas fit vào viewport và căn giữa
  private calculateInitialZoom(): void {
    // Đợi một chút để DOM render xong
    setTimeout(() => {
      const container = this.canvasWrapper?.nativeElement?.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      // Trừ padding (20px mỗi bên) và một chút margin
      const availableWidth = containerRect.width - 40;
      const availableHeight = containerRect.height - 40;
      
      // Tính tỷ lệ zoom để fit cả chiều rộng và chiều cao
      const scaleX = availableWidth / this.canvasWidth;
      const scaleY = availableHeight / this.canvasHeight;
      
      // Chọn tỷ lệ nhỏ hơn để đảm bảo canvas fit hoàn toàn
      const fitZoom = Math.min(scaleX, scaleY, 1); // Không zoom in quá 100%
      
      // Chỉ auto-zoom nếu canvas lớn hơn viewport
      if (fitZoom < 1) {
        this.zoomLevel = Math.max(fitZoom, this.minZoom);
      } else {
        // Nếu canvas nhỏ hơn viewport, giữ zoom 100%
        this.zoomLevel = 1;
      }
      
      // Tính toán panOffset để căn giữa canvas trong viewport
      const scaledWidth = this.canvasWidth * this.zoomLevel;
      const scaledHeight = this.canvasHeight * this.zoomLevel;
      
      // Lấy vị trí hiện tại của wrapper (sau khi flexbox căn giữa)
      const wrapper = this.canvasWrapper?.nativeElement;
      if (wrapper) {
        // Đợi một frame để flexbox render xong và zoom được áp dụng
        requestAnimationFrame(() => {
          const wrapperRect = wrapper.getBoundingClientRect();
          
          // Center của container
          const containerCenterX = containerRect.width / 2;
          const containerCenterY = containerRect.height / 2;
          
          // Vị trí của wrapper trong container (tương đối)
          const wrapperX = wrapperRect.left - containerRect.left;
          const wrapperY = wrapperRect.top - containerRect.top;
          
          // Để canvas (sau scale) nằm giữa container:
          // wrapperX + panOffset.x + scaledWidth/2 = containerCenterX
          // => panOffset.x = containerCenterX - wrapperX - scaledWidth/2
          this.panOffset = {
            x: containerCenterX - wrapperX - scaledWidth / 2,
            y: containerCenterY - wrapperY - scaledHeight / 2
          };
        });
      } else {
        // Fallback: tính toán đơn giản dựa trên container
        this.panOffset = {
          x: (containerRect.width - scaledWidth) / 2,
          y: (containerRect.height - scaledHeight) / 2
        };
      }
    }, 150);
  }

  // Xử lý khi kích thước canvas thay đổi
  onCanvasSizeChange(): void {
    this.backgroundCacheDirty = true; // Đánh dấu cache cần cập nhật
    // Tính lại zoom để fit vào viewport
    this.calculateInitialZoom();
    this.drawCanvas();
  }

  saveTemplate(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // If there's a new background image file, upload it first
    if (this.backgroundImageFile) {
      this.uploadBackgroundImageAndSaveConfig();
    } else {
      this.saveConfigOnly();
    }
  }
  
  uploadBackgroundImageAndSaveConfig(): void {
    const formData = new FormData();
    formData.append('file', this.backgroundImageFile!);
    
    // Upload image to server
    this.certificateService.uploadBackgroundImage(formData).subscribe({
      next: (response: any) => {
        this.backgroundImage = response.fileName || response.filePath || response;
        this.backgroundImageFile = null; // Clear file after upload
        this.saveConfigOnly();
      },
      error: (err: any) => {
        console.error('Error uploading background:', err);
        this.errorMessage = 'Không thể upload ảnh nền';
        this.isLoading = false;
      }
    });
  }
  
  saveConfigOnly(): void {
    const configData = {
      templateConfig: JSON.stringify(this.config),
      backgroundImage: this.backgroundImage,
      width: this.canvasWidth,
      height: this.canvasHeight
    };
    
    this.certificateService.saveTemplateConfig(this.templateId, configData).subscribe({
      next: () => {
        this.successMessage = 'Đã lưu cấu hình thành công!';
        this.isLoading = false;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err: any) => {
        console.error('Error saving config:', err);
        this.errorMessage = 'Không thể lưu cấu hình';
        this.isLoading = false;
      }
    });
  }
  
  cancel(): void {
    this.router.navigate(['/manage-org']);
  }

  zoomIn(): void {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel = Math.min(this.zoomLevel + 0.25, this.maxZoom);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel = Math.max(this.zoomLevel - 0.25, this.minZoom);
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 }; // Reset pan khi reset zoom
  }

  getZoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  setAsDefault(): void {
    if (this.isDefault || this.isSettingDefault) {
      return;
    }

    this.isSettingDefault = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.certificateService.setDefaultCertificateSample(this.templateId).subscribe({
      next: (res: any) => {
        this.isSettingDefault = false;
        this.isDefault = true;
        this.successMessage = 'Đã đặt mẫu này làm mặc định!';
        setTimeout(() => {
          if (this.successMessage === 'Đã đặt mẫu này làm mặc định!') {
            this.successMessage = '';
          }
        }, 3000);
      },
      error: (err: any) => {
        this.isSettingDefault = false;
        console.error('Error set default template:', err);
        this.errorMessage = err.error?.message || 'Không thể đặt làm mẫu mặc định';
      }
    });
  }

  ngOnDestroy(): void {
    // Đảm bảo xóa event listener khi component bị destroy
    document.removeEventListener('mousemove', this.handleDocumentMouseMove);
    document.removeEventListener('mouseup', this.handleDocumentMouseUp);
    document.removeEventListener('mousemove', this.handleDocumentPanMove);
    document.removeEventListener('mouseup', this.handleDocumentPanUp);
    document.removeEventListener('contextmenu', this.preventContextMenu);
    
    // Hủy animation frame nếu đang chờ
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

