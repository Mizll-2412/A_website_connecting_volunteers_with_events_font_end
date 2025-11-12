/**
 * Utility functions để format datetime thống nhất trong toàn bộ ứng dụng
 * Format: dd/MM/yyyy HH:mm (múi giờ Việt Nam)
 */

/**
 * Format datetime thành chuỗi dd/MM/yyyy HH:mm
 * @param date - Date object, ISO string, hoặc bất kỳ giá trị nào có thể parse thành Date
 * @returns Chuỗi formatted hoặc empty string nếu invalid
 */
export function formatDateTime(date: any): string {
  if (!date) return '';
  
  try {
    let d: Date;
    
    // Nếu là string ISO (ví dụ: "2025-11-13T14:30:00"), parse trực tiếp
    if (typeof date === 'string') {
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/);
      if (isoMatch) {
        const [, year, month, day, hour = '00', minute = '00'] = isoMatch;
        d = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );
      } else {
        d = new Date(date);
      }
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Format datetime thành chuỗi yyyy-MM-ddTHH:mm cho input type="datetime-local"
 * @param date - Date object, ISO string, hoặc bất kỳ giá trị nào có thể parse thành Date
 * @returns Chuỗi formatted yyyy-MM-ddTHH:mm hoặc empty string nếu invalid
 */
export function formatDateTimeForInput(date: any): string {
  if (!date) return '';
  
  try {
    let d: Date;
    
    // Nếu đã là format yyyy-MM-ddTHH:mm
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) {
      return date;
    }
    
    // Nếu là string ISO, extract và parse thủ công để tránh timezone issues
    if (typeof date === 'string') {
      // Match ISO format: yyyy-MM-ddTHH:mm hoặc yyyy-MM-ddTHH:mm:ss hoặc có timezone
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/);
      if (isoMatch) {
        const [, year, month, day, hour, minute] = isoMatch;
        // Parse thủ công để sử dụng local timezone
        d = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${dy}T${h}:${min}`;
      }
      
      // Nếu là format dd/MM/yyyy HH:mm hoặc dd-MM-yyyy HH:mm
      const ddMMyyyyMatch = date.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2})/);
      if (ddMMyyyyMatch) {
        const [, day, month, year, hour, minute] = ddMMyyyyMatch;
        return `${year}-${month}-${day}T${hour}:${minute}`;
      }
      
      // Fallback: parse qua new Date() và sử dụng local methods
      d = new Date(date);
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Format chỉ ngày thành chuỗi dd/MM/yyyy (không có giờ)
 * @param date - Date object, ISO string, hoặc bất kỳ giá trị nào có thể parse thành Date
 * @returns Chuỗi formatted hoặc empty string nếu invalid
 */
export function formatDateOnly(date: any): string {
  if (!date) return '';
  
  try {
    let d: Date;
    
    if (typeof date === 'string') {
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        d = new Date(date);
      }
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Parse datetime từ input type="datetime-local" thành Date object
 * @param dateTimeString - Chuỗi format yyyy-MM-ddTHH:mm
 * @returns Date object hoặc null nếu invalid
 */
export function parseDateTimeFromInput(dateTimeString: string): Date | null {
  if (!dateTimeString) return null;
  
  try {
    const match = dateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return null;
    
    const [, year, month, day, hour, minute] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
  } catch {
    return null;
  }
}

