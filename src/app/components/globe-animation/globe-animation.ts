import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rive, StateMachineInput } from '@rive-app/canvas';

@Component({
  selector: 'app-globe-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './globe-animation.html',
  styleUrl: './globe-animation.css'
})
export class GlobeAnimationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('smallGlobeCanvas', { static: false }) smallGlobeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fullGlobeCanvas', { static: false }) fullGlobeCanvas!: ElementRef<HTMLCanvasElement>;

  @Output() globeClick = new EventEmitter<void>();
  @Output() animationComplete = new EventEmitter<void>();

  private smallRive?: Rive;
  private fullRive?: Rive;
  private riveInputs: Map<string, StateMachineInput> = new Map();
  showFullRive = false;
  showSmallGlobe = true;
  private animationTimeout?: ReturnType<typeof setTimeout>;
  private resizeHandler?: () => void;
  private readonly ANIMATION_DURATION = 3000; // Thời gian animation (3 giây)

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    // Đợi một chút để đảm bảo canvas đã render
    setTimeout(() => {
      this.initSmallGlobe();
    }, 200);
  }

  ngOnDestroy(): void {
    // Cleanup timeouts
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    
    // Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    
    // Cleanup Rive instances
    this.smallRive?.cleanup();
    this.fullRive?.cleanup();
  }

  private async initSmallGlobe(): Promise<void> {
    if (!this.smallGlobeCanvas?.nativeElement) {
      console.warn('Small globe canvas not available');
      return;
    }

    const canvas = this.smallGlobeCanvas.nativeElement;
    
    // Đảm bảo canvas có kích thước
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 120;
      canvas.height = 120;
    }

    try {
      this.smallRive = new Rive({
        src: '/assets/rive/c8cefb7b49258078c162ec0c6a8626fd.riv',
        canvas: canvas,
        autoplay: true,
        stateMachines: 'State Machine 1',
        onLoad: () => {
          if (this.smallRive) {
            const stateMachine = this.smallRive.stateMachineInputs('State Machine 1');
            if (stateMachine && stateMachine.length > 0) {
              stateMachine.forEach((input: StateMachineInput) => {
                this.riveInputs.set(input.name, input);
              });
            }
          }
        },
        onLoadError: (error) => {
          console.error('Error loading Rive file:', error);
        }
      });
    } catch (error) {
      console.error('Error initializing small globe animation:', error);
    }
  }

  private async initFullGlobe(): Promise<void> {
    if (!this.fullGlobeCanvas?.nativeElement) {
      console.warn('Full globe canvas not available');
      return;
    }

    const canvas = this.fullGlobeCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Cannot get 2d context from canvas');
      return;
    }
    
    // Set canvas size to fullscreen
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Set CSS size
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    try {
      // Cleanup previous instance if exists
      if (this.fullRive) {
        this.fullRive.cleanup();
        this.fullRive = undefined;
      }

      this.fullRive = new Rive({
        src: '/assets/rive/ea63eccd3888013bc2e29d27247b8220.riv',
        canvas: canvas,
        autoplay: true,
        stateMachines: 'State Machine 1',
        onLoad: () => {
          console.log('Full globe animation loaded successfully');
          
          // Đợi animation chạy hết (dựa trên thời gian animation)
          // Animation fullscreen thường chạy khoảng 2-3 giây
          this.animationTimeout = setTimeout(() => {
            this.animationComplete.emit();
            // Tự động đóng animation sau khi chạy xong
            this.closeFullGlobe();
          }, this.ANIMATION_DURATION);
          
          // Handle window resize để canvas luôn fullscreen
          this.resizeHandler = () => {
            if (this.fullGlobeCanvas?.nativeElement && this.showFullRive) {
              const width = window.innerWidth;
              const height = window.innerHeight;
              const canvas = this.fullGlobeCanvas.nativeElement;
              canvas.width = width;
              canvas.height = height;
              canvas.style.width = width + 'px';
              canvas.style.height = height + 'px';
            }
          };
          window.addEventListener('resize', this.resizeHandler);
        },
        onLoadError: (error) => {
          console.error('Error loading full Rive file:', error);
          // Nếu có lỗi, vẫn emit complete để không bị kẹt
          this.animationComplete.emit();
          this.closeFullGlobe();
        }
      });
    } catch (error) {
      console.error('Error initializing full globe animation:', error);
    }
  }

  onMouseEnter(): void {
    const hoverInput = this.riveInputs.get('onHover');
    if (hoverInput) {
      hoverInput.value = true;
    }
  }

  onMouseLeave(): void {
    const hoverInput = this.riveInputs.get('onHover');
    if (hoverInput) {
      hoverInput.value = false;
    }
  }

  onMouseDown(): void {
    const mouseDownInput = this.riveInputs.get('onMousedown');
    if (mouseDownInput) {
      mouseDownInput.value = true;
    }
  }

  onMouseUp(): void {
    const mouseDownInput = this.riveInputs.get('onMousedown');
    if (mouseDownInput) {
      mouseDownInput.value = false;
    }
    // Emit event để parent component xử lý
    this.globeClick.emit();
  }

  // Method public để có thể gọi từ bên ngoài
  showFullscreenAnimation(): void {
    this.showFullRive = true;
    this.showSmallGlobe = false;
    this.cdr.detectChanges();
    
    // Initialize full globe after DOM is ready
    setTimeout(() => {
      this.initFullGlobe();
    }, 100);
  }

  // Method public để đóng animation
  closeFullGlobe(): void {
    // Clear timeout nếu có
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = undefined;
    }
    
    // Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    
    this.showFullRive = false;
    this.showSmallGlobe = true;
    
    if (this.fullRive) {
      this.fullRive.cleanup();
      this.fullRive = undefined;
    }
    
    this.cdr.detectChanges();
  }
}

