/**
 * Chuẩn hóa chuỗi nhập vào (NFC, trim, bỏ ký tự điều khiển vô hình nhưng giữ \n).
 */
export function cleanText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Bỏ ký tự điều khiển vô hình trừ \n (\x0A) và \t (\x09)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Chuẩn hóa danh sách từ khóa: NFC, trim, bỏ rỗng, bỏ trùng (không phân biệt hoa thường).
 */
export function cleanTags(input: unknown): string[] {
  let rawList: unknown[] = [];
  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    rawList = input.split(',');
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const cleaned = cleanText(item).replace(/\n+/g, ' ').trim();
    if (!cleaned) continue;
    const lowerKey = cleaned.toLowerCase();
    if (!seen.has(lowerKey)) {
      seen.add(lowerKey);
      result.push(cleaned);
    }
  }
  return result;
}

/**
 * Bỏ dấu tiếng Việt và hạ chữ thường để tìm kiếm không phân biệt dấu / hoa thường.
 * Chuẩn hóa NFD, bỏ dấu kết hợp, đổi đ/Đ -> d.
 */
export function normalizeForSearch(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Dọn chuỗi JSON trước khi parse:
 * - Bỏ BOM (\uFEFF)
 * - Bỏ rào ```json ... ``` hoặc ``` ... ```
 * - Bỏ chữ thừa trước dấu { đầu tiên và sau dấu } cuối cùng
 */
export function cleanJsonInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  let text = raw.replace(/^\uFEFF/, '').trim();

  // Bỏ rào markdown ```json ... ``` nếu có
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  } else {
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    // Trường hợp JSON bị cụt ở cuối (chưa có dấu } đóng)
    text = text.slice(firstBrace);
  }

  return text.trim();
}

/**
 * Định dạng ngày hiển thị dd/mm/yyyy theo múi giờ Việt Nam.
 */
export function formatDateVN(isoDate?: string | null): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Kiểm tra bài đã từng được cập nhật sau khi tạo hay chưa (chênh lệch > 2 giây).
 */
export function isRecordUpdated(createdAt?: string | null, updatedAt?: string | null): boolean {
  if (!createdAt || !updatedAt) return false;
  const c = new Date(createdAt).getTime();
  const u = new Date(updatedAt).getTime();
  if (Number.isNaN(c) || Number.isNaN(u)) return false;
  return u - c > 2000;
}
