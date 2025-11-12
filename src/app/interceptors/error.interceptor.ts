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

      // Nếu không có message từ API, sử dụng message tiếng Việt dựa trên HTTP status code
      if (message === 'Lỗi kết nối đến server' || !message || message.trim() === '') {
        switch (error.status) {
          case 400:
            message = 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
            break;
          case 401:
            message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            break;
          case 403:
            message = 'Bạn không có quyền thực hiện thao tác này.';
            break;
          case 404:
            message = 'Không tìm thấy tài nguyên yêu cầu.';
            break;
          case 500:
            message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
            break;
          case 0:
            message = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
            break;
          default:
            if (error.status >= 500) {
              message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
            } else if (error.status >= 400) {
              message = 'Yêu cầu không hợp lệ. Vui lòng thử lại.';
            }
            break;
        }
      }

      return throwError(() => ({ ...error, normalizedMessage: message }));
    })
  );
};


