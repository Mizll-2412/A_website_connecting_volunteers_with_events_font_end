import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// Interceptor chuẩn hóa thông điệp lỗi từ API để hiển thị trên UI
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'Lỗi kết nối đến server';

      // Ưu tiên message từ API
      const data = error?.error as any;
      if (data) {
        // Kiểm tra message từ API (thử nhiều trường hợp)
        if (data.message) {
          message = data.message;
        } else if (data.Message) {
          message = data.Message;
        } else if (typeof data === 'string' && data.trim()) {
          message = data;
        } else if (data.errors) {
          // ASP.NET ModelState errors
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          if (Array.isArray(firstErr) && firstErr.length) {
            message = firstErr[0];
          }
        }
      }

      return throwError(() => ({ ...error, normalizedMessage: message }));
    })
  );
};


