import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.html',
  styleUrls: ['./pagination.css']
})
export class PaginationComponent implements OnChanges {
  @Input() totalItems: number = 0;
  @Input() itemsPerPage: number = 10;
  @Input() currentPage: number = 1;
  @Input() maxSize: number = 5; // Số trang tối đa hiển thị
  @Input() showFirstLast: boolean = true; // Hiển thị nút First/Last
  @Input() showPrevNext: boolean = true; // Hiển thị nút Prev/Next
  
  @Output() pageChange = new EventEmitter<number>();
  @Output() itemsPerPageChange = new EventEmitter<number>();

  totalPages: number = 0;
  pages: number[] = [];

  // Options cho items per page
  itemsPerPageOptions: number[] = [5, 10, 20, 50, 100];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems'] || changes['itemsPerPage'] || changes['currentPage']) {
      this.calculatePages();
    }
  }

  calculatePages(): void {
    // Luôn có ít nhất 1 trang nếu có items
    if (this.totalItems <= 0) {
      this.totalPages = 0;
      this.pages = [];
      return;
    }
    
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));

    // Đảm bảo currentPage hợp lệ
    if (this.currentPage < 1) {
      this.currentPage = 1;
    } else if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    // Tính toán các trang cần hiển thị
    let startPage: number;
    let endPage: number;

    // Luôn hiển thị ít nhất trang 1 nếu có items
    if (this.totalPages === 0) {
      this.pages = [];
      return;
    }

    // Nếu chỉ có 1 trang, luôn hiển thị trang 1
    if (this.totalPages === 1) {
      this.pages = [1];
      return;
    }

    if (this.totalPages <= this.maxSize) {
      // Nếu tổng số trang <= maxSize, hiển thị tất cả
      startPage = 1;
      endPage = this.totalPages;
    } else {
      // Tính toán startPage và endPage
      const halfMaxSize = Math.floor(this.maxSize / 2);
      
      if (this.currentPage <= halfMaxSize) {
        // Gần đầu danh sách
        startPage = 1;
        endPage = this.maxSize;
      } else if (this.currentPage + halfMaxSize >= this.totalPages) {
        // Gần cuối danh sách
        startPage = this.totalPages - this.maxSize + 1;
        endPage = this.totalPages;
      } else {
        // Ở giữa danh sách
        startPage = this.currentPage - halfMaxSize;
        endPage = this.currentPage + halfMaxSize;
      }
    }

    // Tạo mảng các trang
    this.pages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.pageChange.emit(page);
      this.calculatePages();
    }
  }

  goToFirst(): void {
    this.goToPage(1);
  }

  goToLast(): void {
    this.goToPage(this.totalPages);
  }

  goToPrevious(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNext(): void {
    this.goToPage(this.currentPage + 1);
  }

  onItemsPerPageChange(newItemsPerPage: number): void {
    this.itemsPerPage = newItemsPerPage;
    this.currentPage = 1; // Reset về trang đầu
    this.itemsPerPageChange.emit(newItemsPerPage);
    this.calculatePages();
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endIndex(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalItems ? this.totalItems : end;
  }

  get hasItems(): boolean {
    return this.totalItems > 0;
  }
}

