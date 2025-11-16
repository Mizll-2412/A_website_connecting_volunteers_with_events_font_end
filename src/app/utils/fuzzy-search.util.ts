/**
 * Utility functions for fuzzy search (tìm kiếm gần đúng)
 * Hỗ trợ tìm kiếm không phân biệt dấu tiếng Việt
 */

/**
 * Normalize chuỗi tiếng Việt để tìm kiếm fuzzy
 * - Chuyển về chữ thường
 * - Bỏ dấu
 * - Chuẩn hóa đ/Đ thành d
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();
}

/**
 * Kiểm tra fuzzy match
 * - Không phân biệt dấu
 * - Không phân biệt hoa thường
 * - Hỗ trợ tìm kiếm theo từng từ
 */
export function fuzzyMatch(text: string, searchTerm: string): boolean {
  if (!text || !searchTerm) return false;

  const normalizedText = normalizeVietnamese(text);
  const normalizedSearch = normalizeVietnamese(searchTerm);

  // Kiểm tra exact match sau khi normalize
  if (normalizedText.includes(normalizedSearch)) {
    return true;
  }

  // Kiểm tra từng từ trong searchTerm
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
  if (searchWords.length === 0) return false;

  // Nếu tất cả các từ trong searchTerm đều xuất hiện trong text (theo thứ tự hoặc không)
  return searchWords.every(word => normalizedText.includes(word));
}
