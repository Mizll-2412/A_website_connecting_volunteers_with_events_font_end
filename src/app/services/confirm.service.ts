import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

export interface ConfirmRequest {
  id: string;
  message: string;
  options?: ConfirmOptions;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private requestSubject = new Subject<ConfirmRequest>();
  public request$ = this.requestSubject.asObservable();

  confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const req: ConfirmRequest = {
        id: `confirm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message,
        options,
        resolve
      };
      this.requestSubject.next(req);
    });
  }
}

