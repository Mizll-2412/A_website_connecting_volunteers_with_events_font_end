import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  template?: TemplateRef<any>;
  resizable?: boolean;
  valueGetter?: (row: any) => any;
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.html',
  styleUrls: ['./table.css']
})
export class TableComponent implements OnInit, OnDestroy, OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() loading: boolean = false;
  @Input() emptyText: string = 'Không có dữ liệu';
  @Input() bordered: boolean = true;
  @Input() striped: boolean = true;
  @Input() hoverable: boolean = true;
  @Input() size: 'small' | 'middle' | 'large' = 'middle';
  @Input() storageKey?: string; // Key để lưu vào localStorage
  
  @Output() rowClick = new EventEmitter<any>();
  @Output() sortChange = new EventEmitter<{ key: string; direction: 'asc' | 'desc' | null }>();
  
  sortKey: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;
  
  // Resize state
  resizingColumnIndex: number | null = null;
  startX: number = 0;
  startWidth: number = 0;
  columnWidths: Map<number, number> = new Map();
  defaultColumnWidths: Map<number, string> = new Map();
  
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: (e: MouseEvent) => void;

  onSort(column: TableColumn): void {
    if (!column.sortable) return;
    
    if (this.sortKey === column.key) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = null;
        this.sortKey = null;
      }
    } else {
      this.sortKey = column.key;
      this.sortDirection = 'asc';
    }
    
    this.sortChange.emit({ 
      key: this.sortKey || '', 
      direction: this.sortDirection 
    });
  }

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  getSortIcon(column: TableColumn): string {
    if (this.sortKey !== column.key || !this.sortDirection) {
      return 'bi-arrow-down-up';
    }
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  getCellValue(row: any, column: TableColumn): any {
    // Nếu có valueGetter, sử dụng nó
    if (column.valueGetter) {
      return column.valueGetter(row) ?? '-';
    }
    
    // Ngược lại, sử dụng logic mặc định với key
    const keys = column.key.split('.');
    let value = row;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined || value === null) return '-';
    }
    return value ?? '-';
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngOnInit(): void {
    if (this.columns && this.columns.length > 0) {
      this.initializeColumnWidths();
      this.loadColumnWidthsFromStorage();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] && this.columns && this.columns.length > 0) {
      this.initializeColumnWidths();
      this.loadColumnWidthsFromStorage();
    }
  }

  ngOnDestroy(): void {
    this.removeResizeListeners();
  }

  initializeColumnWidths(): void {
    // Lưu giá trị width mặc định
    this.defaultColumnWidths.clear();
    this.columns.forEach((col, index) => {
      if (col.width) {
        this.defaultColumnWidths.set(index, col.width);
      }
    });
  }

  loadColumnWidthsFromStorage(): void {
    if (!this.storageKey) return;
    
    try {
      const saved = localStorage.getItem(`table-column-widths-${this.storageKey}`);
      if (saved) {
        const widths = JSON.parse(saved);
        Object.keys(widths).forEach(key => {
          const index = parseInt(key);
          if (!isNaN(index)) {
            this.columnWidths.set(index, widths[key]);
          }
        });
      }
    } catch (error) {
      console.error('Lỗi khi load column widths từ localStorage:', error);
    }
  }

  saveColumnWidthsToStorage(): void {
    if (!this.storageKey) return;
    
    try {
      const widths: { [key: number]: number } = {};
      this.columnWidths.forEach((width, index) => {
        widths[index] = width;
      });
      localStorage.setItem(`table-column-widths-${this.storageKey}`, JSON.stringify(widths));
    } catch (error) {
      console.error('Lỗi khi lưu column widths vào localStorage:', error);
    }
  }

  resetColumnWidths(): void {
    this.columnWidths.clear();
    if (this.storageKey) {
      localStorage.removeItem(`table-column-widths-${this.storageKey}`);
    }
  }

  getColumnWidth(index: number): string {
    if (this.columnWidths.has(index)) {
      return `${this.columnWidths.get(index)}px`;
    }
    return this.columns[index]?.width || 'auto';
  }

  isColumnResizable(index: number): boolean {
    const column = this.columns[index];
    if (!column) return false;
    // Mặc định cho phép resize nếu có width hoặc resizable = true
    if (column.resizable === false) return false;
    return column.resizable === true || !!column.width;
  }

  onResizeStart(event: MouseEvent, columnIndex: number, thElement: HTMLElement): void {
    if (!this.isColumnResizable(columnIndex)) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.resizingColumnIndex = columnIndex;
    this.startX = event.clientX;
    
    // Lấy width thực tế từ DOM element
    const rect = thElement.getBoundingClientRect();
    this.startWidth = rect.width;
    
    // Nếu chưa có trong columnWidths, lưu giá trị hiện tại
    if (!this.columnWidths.has(columnIndex)) {
      this.columnWidths.set(columnIndex, this.startWidth);
    }
    
    this.addResizeListeners();
  }

  private addResizeListeners(): void {
    this.mouseMoveListener = (e: MouseEvent) => this.onResizeMove(e);
    this.mouseUpListener = () => this.onResizeEnd();
    
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private removeResizeListeners(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  private onResizeMove(event: MouseEvent): void {
    if (this.resizingColumnIndex === null) return;
    
    const diff = event.clientX - this.startX;
    const newWidth = Math.max(50, this.startWidth + diff); // Min width 50px
    
    this.columnWidths.set(this.resizingColumnIndex, newWidth);
  }

  private onResizeEnd(): void {
    if (this.resizingColumnIndex !== null) {
      this.saveColumnWidthsToStorage();
    }
    this.resizingColumnIndex = null;
    this.removeResizeListeners();
  }
}

