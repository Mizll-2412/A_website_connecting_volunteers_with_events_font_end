import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConfirmRequest, ConfirmService } from '../../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.css']
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  isOpen = false;
  current?: ConfirmRequest;

  private sub?: Subscription;

  constructor(private confirmService: ConfirmService) {}

  ngOnInit(): void {
    this.sub = this.confirmService.request$.subscribe((req) => {
      this.current = req;
      this.isOpen = true;
      document.body.classList.add('modal-open');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onCancel(): void {
    if (this.current) {
      this.current.resolve(false);
    }
    this.close();
  }

  onOk(): void {
    if (this.current) {
      this.current.resolve(true);
    }
    this.close();
  }

  private close(): void {
    this.isOpen = false;
    this.current = undefined;
    document.body.classList.remove('modal-open');
  }

  get title(): string {
    return this.current?.options?.title || 'Xác nhận';
  }

  get okText(): string {
    return this.current?.options?.okText || 'OK';
  }

  get cancelText(): string {
    return this.current?.options?.cancelText || 'Hủy';
  }

  get isDanger(): boolean {
    return this.current?.options?.variant === 'danger';
  }
}

