import { z } from 'zod';
import { cleanJsonInput, cleanTags, cleanText } from '@/lib/utils/normalize';

export const SOURCE_CATEGORIES = [
  'Điều ước quốc tế',
  'Tập quán quốc tế',
  'Nguyên tắc pháp lý chung',
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_ITEMS = 200;

// 1. SCHEMA NGUỒN THAM KHẢO
export const sourceLinkSchema = z.object({
  title: z
    .string({ required_error: 'Vui lòng nhập tiêu đề nguồn tham khảo.' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Tiêu đề nguồn tham khảo không được để trống.',
    })
    .refine((v) => v.length <= 200, {
      message: 'Tiêu đề nguồn tham khảo tối đa 200 ký tự.',
    }),
  url: z
    .string({ required_error: 'Vui lòng nhập đường dẫn URL.' })
    .transform((v) => cleanText(v))
    .refine((v) => /^https?:\/\/.+/i.test(v), {
      message: 'Đường dẫn nguồn phải bắt đầu bằng http:// hoặc https://.',
    })
    .refine((v) => {
      try {
        const parsed = new URL(v);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }, {
      message: 'Đường dẫn URL không hợp lệ (ví dụ hợp lệ: https://www.icj-cij.org).',
    })
    .refine((v) => v.length <= 2000, {
      message: 'Đường dẫn URL tối đa 2000 ký tự.',
    }),
});

export type SourceLink = z.infer<typeof sourceLinkSchema>;

// 2. SCHEMA TỪ KHÓA (TAGS)
export const tagsSchema = z
  .union([z.array(z.string()), z.string(), z.undefined(), z.null()])
  .transform((val) => cleanTags(val))
  .refine((tags) => tags.length <= 20, {
    message: 'Tối đa 20 từ khóa cho mỗi bài.',
  })
  .refine((tags) => tags.every((t) => t.length <= 50), {
    message: 'Mỗi từ khóa tối đa 50 ký tự.',
  });

// 3. SCHEMA VĂN KIỆN (ĐIỀU ƯỚC / TẬP QUÁN / NGUYÊN TẮC)
export const treatyInputSchema = z.object({
  name: z
    .string({ required_error: 'Thiếu trường "name" (Tên văn kiện / Nguyên tắc).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Tên văn kiện / Nguyên tắc không được để trống.',
    })
    .refine((v) => v.length <= 300, {
      message: 'Tên văn kiện / Nguyên tắc tối đa 300 ký tự.',
    }),
  category: z
    .string({ required_error: 'Thiếu trường "category" (Phân loại nguồn).' })
    .transform((v) => cleanText(v))
    .refine(
      (v): v is SourceCategory =>
        (SOURCE_CATEGORIES as readonly string[]).includes(v),
      {
        message:
          '"category" phải là một trong 3 giá trị: "Điều ước quốc tế", "Tập quán quốc tế", "Nguyên tắc pháp lý chung".',
      }
    ),
  date: z
    .string({ required_error: 'Thiếu trường "date" (Ngày hiệu lực / Kỷ nguyên hình thành).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Ngày hiệu lực / Kỷ nguyên hình thành không được để trống.',
    })
    .refine((v) => v.length <= 300, {
      message: 'Ngày hiệu lực / Kỷ nguyên hình thành tối đa 300 ký tự.',
    }),
  content: z
    .string({ required_error: 'Thiếu trường "content" (Nội dung cốt lõi).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Nội dung cốt lõi không được để trống.',
    })
    .refine((v) => v.length <= 20000, {
      message: 'Nội dung cốt lõi tối đa 20.000 ký tự.',
    }),
  tags: tagsSchema.optional().default([]),
  sources: z
    .array(sourceLinkSchema, {
      invalid_type_error: 'Danh sách nguồn tham khảo ("sources") phải là một mảng.',
    })
    .max(30, 'Tối đa 30 nguồn tham khảo cho mỗi bài.')
    .optional()
    .default([]),
});

export type TreatyInput = z.infer<typeof treatyInputSchema>;

// 4. SCHEMA ÁN LỆ (IRAC)
export const caseInputSchema = z.object({
  name: z
    .string({ required_error: 'Thiếu trường "name" (Tên vụ việc).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Tên vụ việc không được để trống.',
    })
    .refine((v) => v.length <= 300, {
      message: 'Tên vụ việc tối đa 300 ký tự.',
    }),
  court: z
    .string({ required_error: 'Thiếu trường "court" (Cơ quan tài phán).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Cơ quan tài phán không được để trống.',
    })
    .refine((v) => v.length <= 100, {
      message: 'Cơ quan tài phán tối đa 100 ký tự.',
    }),
  year: z
    .union([z.number(), z.string()], {
      required_error: 'Thiếu trường "year" (Năm phán quyết).',
      invalid_type_error: 'Năm phán quyết phải là một số nguyên từ 1500 đến 2100.',
    })
    .transform((v) => {
      if (typeof v === 'number') return v;
      const cleaned = cleanText(v);
      if (!/^-?\d+$/.test(cleaned)) return Number.NaN;
      return Number.parseInt(cleaned, 10);
    })
    .refine((n) => Number.isInteger(n) && n >= 1500 && n <= 2100, {
      message: 'Năm phán quyết ("year") phải là số nguyên từ 1500 đến 2100.',
    }),
  facts: z
    .string({ required_error: 'Thiếu trường "facts" (Sự kiện).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Trường "facts" (Sự kiện) không được để trống.',
    })
    .refine((v) => v.length <= 20000, {
      message: 'Trường "facts" (Sự kiện) tối đa 20.000 ký tự.',
    }),
  issues: z
    .string({ required_error: 'Thiếu trường "issues" (Vấn đề pháp lý).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Trường "issues" (Vấn đề pháp lý) không được để trống.',
    })
    .refine((v) => v.length <= 20000, {
      message: 'Trường "issues" (Vấn đề pháp lý) tối đa 20.000 ký tự.',
    }),
  holding: z
    .string({ required_error: 'Thiếu trường "holding" (Lập luận & Phán quyết).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Trường "holding" (Lập luận & Phán quyết) không được để trống.',
    })
    .refine((v) => v.length <= 20000, {
      message: 'Trường "holding" (Lập luận & Phán quyết) tối đa 20.000 ký tự.',
    }),
  significance: z
    .string({ required_error: 'Thiếu trường "significance" (Ý nghĩa pháp lý).' })
    .transform((v) => cleanText(v))
    .refine((v) => v.length >= 1, {
      message: 'Trường "significance" (Ý nghĩa pháp lý) không được để trống.',
    })
    .refine((v) => v.length <= 20000, {
      message: 'Trường "significance" (Ý nghĩa pháp lý) tối đa 20.000 ký tự.',
    }),
  tags: tagsSchema.optional().default([]),
  sources: z
    .array(sourceLinkSchema, {
      invalid_type_error: 'Danh sách nguồn tham khảo ("sources") phải là một mảng.',
    })
    .max(30, 'Tối đa 30 nguồn tham khảo cho mỗi bài.')
    .optional()
    .default([]),
});

export type CaseInput = z.infer<typeof caseInputSchema>;

// 5. SCHEMA ĐĂNG NHẬP & ĐĂNG KÝ
export const usernameSchema = z
  .string({ required_error: 'Vui lòng nhập tên đăng nhập.' })
  .transform((v) => cleanText(v).toLowerCase())
  .refine((v) => v.length >= 3 && v.length <= 20, {
    message: 'Tên đăng nhập phải từ 3 đến 20 ký tự.',
  })
  .refine((v) => /^[a-z0-9_]+$/.test(v), {
    message:
      'Tên đăng nhập chỉ được gồm chữ thường không dấu (a-z), chữ số (0-9) và dấu gạch dưới (_).',
  });

export const passwordSchema = z
  .string({ required_error: 'Vui lòng nhập mật khẩu.' })
  .refine((v) => v.length >= 6, {
    message: 'Mật khẩu phải có ít nhất 6 ký tự.',
  })
  .refine((v) => v.length <= 128, {
    message: 'Mật khẩu tối đa 128 ký tự.',
  });

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export const signupSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp.',
  });

// 6. SCHEMA IMPORT BATCH V1.0 & TRÌNH KIỂM TRA CHI TIẾT TIẾNG VIỆT
export const importBatchSchema = z
  .object({
    schema_version: z
      .literal('1.0', {
        errorMap: () => ({
          message: 'Phiên bản "schema_version" không hợp lệ (chỉ hỗ trợ "1.0").',
        }),
      })
      .optional()
      .default('1.0'),
    treaties: z
      .array(treatyInputSchema, {
        invalid_type_error: 'Trường "treaties" phải là một danh sách (mảng []).',
      })
      .optional()
      .default([]),
    cases: z
      .array(caseInputSchema, {
        invalid_type_error: 'Trường "cases" phải là một danh sách (mảng []).',
      })
      .optional()
      .default([]),
  })
  .superRefine((val, ctx) => {
    const total = val.treaties.length + val.cases.length;
    if (total < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dữ liệu nhập phải có ít nhất 1 văn kiện hoặc 1 án lệ.',
      });
    }
    if (total > MAX_IMPORT_ITEMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Mỗi lần chỉ được nhập tối đa ${MAX_IMPORT_ITEMS} bài (hiện có ${total} bài). Hãy chia nhỏ tài liệu thành nhiều lần nhập.`,
      });
    }
  });

export type ImportBatchData = z.infer<typeof importBatchSchema>;

export interface ImportValidationResult {
  valid: boolean;
  data?: ImportBatchData;
  errors: string[];
  totalErrorsCount: number;
  warnings: string[];
  preview: {
    treatyNames: string[];
    caseNames: string[];
  };
}

const KNOWN_ROOT_KEYS = new Set(['schema_version', 'treaties', 'cases']);
const KNOWN_TREATY_KEYS = new Set(['name', 'category', 'date', 'content', 'tags', 'sources']);
const KNOWN_CASE_KEYS = new Set([
  'name',
  'court',
  'year',
  'facts',
  'issues',
  'holding',
  'significance',
  'tags',
  'sources',
]);

const FIELD_LABELS_VI: Record<string, string> = {
  name: 'Tên',
  category: 'Phân loại nguồn',
  date: 'Ngày hiệu lực / Kỷ nguyên',
  content: 'Nội dung cốt lõi',
  court: 'Cơ quan tài phán',
  year: 'Năm phán quyết',
  facts: 'Sự kiện',
  issues: 'Vấn đề pháp lý',
  holding: 'Lập luận & Phán quyết',
  significance: 'Ý nghĩa pháp lý',
  tags: 'Từ khóa',
  sources: 'Nguồn tham khảo',
};

/**
 * Phân tích và kiểm tra chuỗi JSON nhập vào, trả về thông báo lỗi tiếng Việt dễ hiểu chỉ rõ vị trí bài.
 */
export function validateImportJsonString(rawInput: string): ImportValidationResult {
  const byteLength = new TextEncoder().encode(rawInput ?? '').length;
  if (byteLength > MAX_IMPORT_BYTES) {
    return {
      valid: false,
      errors: ['Dung lượng dữ liệu vượt quá giới hạn 5 MB. Vui lòng chia nhỏ thành nhiều lần nhập.'],
      totalErrorsCount: 1,
      warnings: [],
      preview: { treatyNames: [], caseNames: [] },
    };
  }

  const cleaned = cleanJsonInput(rawInput ?? '');
  if (!cleaned) {
    return {
      valid: false,
      errors: ['Vui lòng dán nội dung JSON hoặc chọn một file .json để kiểm tra.'],
      totalErrorsCount: 1,
      warnings: [],
      preview: { treatyNames: [], caseNames: [] },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const posMatch = msg.match(/position\s+(\d+)/i);
    const trimmedEnd = cleaned.trimEnd();
    const isLikelyTruncated = !trimmedEnd.endsWith('}');

    if (posMatch) {
      const pos = Number.parseInt(posMatch[1], 10);
      return {
        valid: false,
        errors: [
          `JSON bị lỗi cú pháp gần ký tự thứ ${pos}${
            isLikelyTruncated
              ? ' (có thể AI trả lời bị cụt giữa chừng, thiếu dấu } ở cuối)'
              : ''
          }. Hãy nhắn AI: "Hãy gửi lại toàn bộ JSON hoàn chỉnh".`,
        ],
        totalErrorsCount: 1,
        warnings: [],
        preview: { treatyNames: [], caseNames: [] },
      };
    }

    return {
      valid: false,
      errors: [
        `JSON bị lỗi cú pháp${
          isLikelyTruncated
            ? ' (thiếu dấu đóng ngoặc } ở cuối — có thể AI trả lời bị cụt giữa chừng)'
            : ''
        }. Đừng tự sửa tay các dấu ngoặc; hãy yêu cầu AI gửi lại toàn bộ khối JSON hoàn chỉnh.`,
      ],
      totalErrorsCount: 1,
      warnings: [],
      preview: { treatyNames: [], caseNames: [] },
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['Cấu trúc gốc của JSON phải là một đối tượng { "treaties": [...], "cases": [...] }.'],
      totalErrorsCount: 1,
      warnings: [],
      preview: { treatyNames: [], caseNames: [] },
    };
  }

  const rawObj = parsed as Record<string, unknown>;
  const warnings: string[] = [];

  // Kiểm tra trường lạ để cảnh báo nhẹ (nhưng vẫn bỏ qua khi lưu)
  const unknownRootKeys = Object.keys(rawObj).filter((k) => !KNOWN_ROOT_KEYS.has(k));
  if (unknownRootKeys.length > 0) {
    warnings.push(
      `Đã tự động bỏ qua các trường lạ ở cấp ngoài cùng: ${unknownRootKeys.join(', ')}.`
    );
  }

  if (Array.isArray(rawObj.treaties)) {
    rawObj.treaties.forEach((item, idx) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const extra = Object.keys(item as Record<string, unknown>).filter(
          (k) => !KNOWN_TREATY_KEYS.has(k)
        );
        if (extra.length > 0) {
          warnings.push(
            `Văn kiện số ${idx + 1}: Đã bỏ qua trường lạ (${extra.join(', ')}).`
          );
        }
      }
    });
  }

  if (Array.isArray(rawObj.cases)) {
    rawObj.cases.forEach((item, idx) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const extra = Object.keys(item as Record<string, unknown>).filter(
          (k) => !KNOWN_CASE_KEYS.has(k)
        );
        if (extra.length > 0) {
          warnings.push(`Án lệ số ${idx + 1}: Đã bỏ qua trường lạ (${extra.join(', ')}).`);
        }
      }
    });
  }

  const result = importBatchSchema.safeParse(rawObj);
  if (!result.success) {
    const formattedErrors: string[] = [];

    for (const issue of result.error.issues) {
      const path = issue.path;
      if (path[0] === 'treaties' && typeof path[1] === 'number') {
        const idx = path[1];
        const rawList = Array.isArray(rawObj.treaties) ? rawObj.treaties : [];
        const rawItem = rawList[idx] as Record<string, unknown> | undefined;
        const itemName =
          rawItem && typeof rawItem.name === 'string' && rawItem.name.trim()
            ? ` "${rawItem.name.trim().slice(0, 60)}"`
            : '';
        const fieldKey = typeof path[2] === 'string' ? path[2] : '';
        const fieldLabel = FIELD_LABELS_VI[fieldKey]
          ? ` ("${fieldKey}" - ${FIELD_LABELS_VI[fieldKey]})`
          : fieldKey
            ? ` ("${fieldKey}")`
            : '';

        if (issue.code === 'invalid_type' && issue.received === 'undefined' && fieldKey) {
          formattedErrors.push(
            `Văn kiện số ${idx + 1}${itemName}: thiếu trường "${fieldKey}" (${
              FIELD_LABELS_VI[fieldKey] || fieldKey
            }).`
          );
        } else {
          formattedErrors.push(
            `Văn kiện số ${idx + 1}${itemName}${fieldLabel}: ${issue.message}`
          );
        }
      } else if (path[0] === 'cases' && typeof path[1] === 'number') {
        const idx = path[1];
        const rawList = Array.isArray(rawObj.cases) ? rawObj.cases : [];
        const rawItem = rawList[idx] as Record<string, unknown> | undefined;
        const itemName =
          rawItem && typeof rawItem.name === 'string' && rawItem.name.trim()
            ? ` "${rawItem.name.trim().slice(0, 60)}"`
            : '';
        const fieldKey = typeof path[2] === 'string' ? path[2] : '';
        const fieldLabel = FIELD_LABELS_VI[fieldKey]
          ? ` ("${fieldKey}" - ${FIELD_LABELS_VI[fieldKey]})`
          : fieldKey
            ? ` ("${fieldKey}")`
            : '';

        if (issue.code === 'invalid_type' && issue.received === 'undefined' && fieldKey) {
          formattedErrors.push(
            `Án lệ số ${idx + 1}${itemName}: thiếu trường "${fieldKey}" (${
              FIELD_LABELS_VI[fieldKey] || fieldKey
            }).`
          );
        } else {
          formattedErrors.push(
            `Án lệ số ${idx + 1}${itemName}${fieldLabel}: ${issue.message}`
          );
        }
      } else {
        formattedErrors.push(issue.message);
      }
    }

    const totalErrorsCount = formattedErrors.length;
    const cappedErrors = formattedErrors.slice(0, 50);

    return {
      valid: false,
      errors: cappedErrors,
      totalErrorsCount,
      warnings,
      preview: { treatyNames: [], caseNames: [] },
    };
  }

  return {
    valid: true,
    data: result.data,
    errors: [],
    totalErrorsCount: 0,
    warnings,
    preview: {
      treatyNames: result.data.treaties.map((t) => t.name),
      caseNames: result.data.cases.map((c) => `${c.name} (${c.court} · ${c.year})`),
    },
  };
}
