import { environment } from '../../environments/environment';

/**
 * Builds a full image URL from a relative path
 * @param path - Relative path to the image (e.g., '/uploads/image.jpg')
 * @returns Full URL (e.g., 'http://localhost:5000/uploads/image.jpg' or 'https://api.tinhnguyenvien.io.vn/uploads/image.jpg')
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }
  
  // If path already starts with http:// or https://, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${environment.baseUrl}${normalizedPath}`;
}

/**
 * Returns a data URI SVG placeholder for organization default image
 * This avoids 404 errors when org-default.png doesn't exist
 */
export function getOrgDefaultImage(): string {
  // SVG placeholder: blue circle with white text "Tổ chức"
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Ub1x1MDBmMGMgY2hcdTAwZjBjYzwvdGV4dD48L3N2Zz4=';
}

export function getImageUrll(path: string | null | undefined): string {
  if (!path) return 'assets/default-event.jpg';
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const baseUrl = environment.apiUrl.replace('/api', '');
  return `${baseUrl}${path}`;
}

export function getEventImageUrl(path: string | null | undefined): string {
  return getImageUrl(path);
}