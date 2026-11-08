import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  cleanJsonInput,
  cleanTags,
  cleanText,
  normalizeForSearch,
} from '@/lib/utils/normalize';
import { validateImportJsonString } from '@/lib/schemas';

describe('Hàm chuẩn hóa và bỏ dấu tiếng Việt', () => {
  it('bỏ dấu tiếng Việt và chuyển đ/Đ thành d, hạ chữ thường', () => {
    expect(normalizeForSearch('Điều ước Quốc tế & Tập quán')).toBe(
      'dieu uoc quoc te & tap quan'
    );
    expect(normalizeForSearch('Đường cơ sở thẳng ở Biển Đông')).toBe(
      'duong co so thang o bien dong'
    );
  });

  it('chuẩn hóa NFC, giữ xuống dòng và bỏ ký tự điều khiển vô hình', () => {
    const raw = '  Dòng 1\r\nDòng 2\u200B\u0000  ';
    expect(cleanText(raw)).toBe('Dòng 1\nDòng 2');
  });

  it('chuẩn hóa từ khóa: bỏ rỗng và bỏ trùng không phân biệt hoa thường', () => {
    expect(cleanTags(['UNCLOS', 'unclos', '  Luật biển ', '', '   '])).toEqual([
      'UNCLOS',
      'Luật biển',
    ]);
  });
});

describe('Hàm dọn chuỗi JSON (cleanJsonInput)', () => {
  it('bỏ BOM, bỏ rào ```json và chữ thừa xung quanh', () => {
    const wrapped = '\uFEFFĐây là kết quả:\n```json\n{"schema_version":"1.0","treaties":[]}\n```\nChúc bạn học tốt!';
    expect(cleanJsonInput(wrapped)).toBe('{"schema_version":"1.0","treaties":[]}');
  });
});

describe('Kiểm thử schema import v1.0', () => {
  it('chấp nhận file mẫu reference/du-lieu-mau-import.json và public/du-lieu-ban-dau.json', () => {
    const samplePath = path.resolve(process.cwd(), 'reference/du-lieu-mau-import.json');
    const rawSample = fs.readFileSync(samplePath, 'utf-8');
    const res = validateImportJsonString(rawSample);
    expect(res.valid).toBe(true);
    expect(res.data?.treaties.length).toBe(6);
    expect(res.data?.cases.length).toBe(6);

    const seedPath = path.resolve(process.cwd(), 'public/du-lieu-ban-dau.json');
    const rawSeed = fs.readFileSync(seedPath, 'utf-8');
    const seedRes = validateImportJsonString(rawSeed);
    expect(seedRes.valid).toBe(true);
    expect(seedRes.data?.treaties.length).toBe(2);
    expect(seedRes.data?.cases.length).toBe(2);
  });

  it('chấp nhận JSON được bọc trong rào ```json ... ``` và year dạng chuỗi số', () => {
    const input = `\`\`\`json
    {
      "schema_version": "1.0",
      "cases": [
        {
          "name": "Vụ thử nghiệm",
          "court": "ICJ",
          "year": "1986",
          "facts": "Sự kiện",
          "issues": "Vấn đề",
          "holding": "Phán quyết",
          "significance": "Ý nghĩa"
        }
      ]
    }
    \`\`\``;
    const res = validateImportJsonString(input);
    expect(res.valid).toBe(true);
    expect(res.data?.cases[0].year).toBe(1986);
  });

  it('từ chối khi thiếu trường bắt buộc và chỉ rõ vị trí bài bằng tiếng Việt', () => {
    const input = JSON.stringify({
      treaties: [],
      cases: [
        {
          name: 'Vụ Lotus',
          court: 'PCIJ',
          year: 1927,
          // thiếu facts
          issues: 'Vấn đề',
          holding: 'Phán quyết',
          significance: 'Ý nghĩa',
        },
      ],
    });
    const res = validateImportJsonString(input);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Án lệ số 1 "Vụ Lotus"') && e.includes('facts'))).toBe(
      true
    );
  });

  it('từ chối khi category sai', () => {
    const input = JSON.stringify({
      treaties: [
        {
          name: 'Văn kiện A',
          category: 'Nghị quyết nội bộ',
          date: '1999',
          content: 'Nội dung',
        },
      ],
    });
    const res = validateImportJsonString(input);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Văn kiện số 1') && e.includes('category'))).toBe(
      true
    );
  });

  it('từ chối khi url nguồn không phải http(s)', () => {
    const input = JSON.stringify({
      treaties: [
        {
          name: 'Văn kiện B',
          category: 'Điều ước quốc tế',
          date: '1999',
          content: 'Nội dung',
          sources: [{ title: 'Nguồn lỗi', url: 'javascript:alert(1)' }],
        },
      ],
    });
    const res = validateImportJsonString(input);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('http:// hoặc https://'))).toBe(true);
  });

  it('từ chối khi year ngoài khoảng 1500..2100', () => {
    const input = JSON.stringify({
      cases: [
        {
          name: 'Vụ năm sai',
          court: 'ICJ',
          year: 1200,
          facts: 'F',
          issues: 'I',
          holding: 'H',
          significance: 'S',
        },
      ],
    });
    const res = validateImportJsonString(input);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('1500 đến 2100'))).toBe(true);
  });

  it('từ chối khi tổng số bài vượt quá 200 bài', () => {
    const manyTreaties = Array.from({ length: 201 }, (_, i) => ({
      name: `Văn kiện ${i + 1}`,
      category: 'Điều ước quốc tế',
      date: '2000',
      content: 'Nội dung',
    }));
    const res = validateImportJsonString(JSON.stringify({ treaties: manyTreaties }));
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('200 bài'))).toBe(true);
  });

  it('báo lỗi dễ hiểu khi JSON bị cụt giữa chừng', () => {
    const truncated = '{"schema_version": "1.0", "treaties": [{"name": "Unfinished"';
    const res = validateImportJsonString(truncated);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('JSON bị lỗi cú pháp');
  });
});
