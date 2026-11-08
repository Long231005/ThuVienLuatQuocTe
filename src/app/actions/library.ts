'use server';

import { revalidatePath } from 'next/cache';
import {
  caseInputSchema,
  treatyInputSchema,
  validateImportJsonString,
  type CaseInput,
  type TreatyInput,
} from '@/lib/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface MutationActionResponse {
  ok: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function getAuthenticatedUserOrError() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: 'Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.' };
  }
  return { supabase, user, error: null };
}

export async function saveTreatyAction(
  rawInput: TreatyInput,
  existingId?: string
): Promise<MutationActionResponse> {
  const parsed = treatyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: 'Vui lòng kiểm tra lại các trường thông tin văn kiện.',
      fieldErrors,
    };
  }

  const { supabase, user, error: authErr } = await getAuthenticatedUserOrError();
  if (!user) return { ok: false, error: authErr || 'Vui lòng đăng nhập.' };

  const payload = {
    name: parsed.data.name,
    category: parsed.data.category,
    date_text: parsed.data.date,
    content: parsed.data.content,
    tags: parsed.data.tags,
    sources: parsed.data.sources,
  };

  try {
    if (existingId) {
      const { data, error } = await supabase
        .from('treaties')
        .update(payload)
        .eq('id', existingId)
        .select('id')
        .maybeSingle();

      if (error || !data) {
        return {
          ok: false,
          error:
            'Bạn không có quyền sửa văn kiện này hoặc bài viết không còn tồn tại.',
        };
      }

      revalidatePath('/', 'layout');
      return { ok: true, id: data.id };
    } else {
      const { data, error } = await supabase
        .from('treaties')
        .insert({
          ...payload,
          author_id: user.id,
        })
        .select('id')
        .single();

      if (error || !data) {
        return {
          ok: false,
          error: 'Không thể lưu văn kiện mới lúc này. Vui lòng thử lại.',
        };
      }

      revalidatePath('/', 'layout');
      return { ok: true, id: data.id };
    }
  } catch {
    return {
      ok: false,
      error: 'Mất kết nối máy chủ khi lưu văn kiện. Vui lòng thử lại.',
    };
  }
}

export async function deleteTreatyAction(id: string): Promise<MutationActionResponse> {
  if (!id) return { ok: false, error: 'Không tìm thấy mã văn kiện cần xóa.' };

  const { supabase, user, error: authErr } = await getAuthenticatedUserOrError();
  if (!user) return { ok: false, error: authErr || 'Vui lòng đăng nhập.' };

  try {
    const { data, error } = await supabase
      .from('treaties')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: 'Bạn không có quyền xóa văn kiện này hoặc văn kiện đã bị xóa.',
      };
    }

    revalidatePath('/', 'layout');
    return { ok: true, id: data.id };
  } catch {
    return {
      ok: false,
      error: 'Không thể xóa văn kiện lúc này. Vui lòng thử lại.',
    };
  }
}

export async function saveCaseAction(
  rawInput: CaseInput,
  existingId?: string
): Promise<MutationActionResponse> {
  const parsed = caseInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: 'Vui lòng kiểm tra lại các trường thông tin án lệ.',
      fieldErrors,
    };
  }

  const { supabase, user, error: authErr } = await getAuthenticatedUserOrError();
  if (!user) return { ok: false, error: authErr || 'Vui lòng đăng nhập.' };

  const payload = {
    name: parsed.data.name,
    court: parsed.data.court,
    year: parsed.data.year,
    facts: parsed.data.facts,
    issues: parsed.data.issues,
    holding: parsed.data.holding,
    significance: parsed.data.significance,
    tags: parsed.data.tags,
    sources: parsed.data.sources,
  };

  try {
    if (existingId) {
      const { data, error } = await supabase
        .from('cases')
        .update(payload)
        .eq('id', existingId)
        .select('id')
        .maybeSingle();

      if (error || !data) {
        return {
          ok: false,
          error: 'Bạn không có quyền sửa án lệ này hoặc bài viết không còn tồn tại.',
        };
      }

      revalidatePath('/', 'layout');
      return { ok: true, id: data.id };
    } else {
      const { data, error } = await supabase
        .from('cases')
        .insert({
          ...payload,
          author_id: user.id,
        })
        .select('id')
        .single();

      if (error || !data) {
        return {
          ok: false,
          error: 'Không thể lưu án lệ mới lúc này. Vui lòng thử lại.',
        };
      }

      revalidatePath('/', 'layout');
      return { ok: true, id: data.id };
    }
  } catch {
    return {
      ok: false,
      error: 'Mất kết nối máy chủ khi lưu án lệ. Vui lòng thử lại.',
    };
  }
}

export async function deleteCaseAction(id: string): Promise<MutationActionResponse> {
  if (!id) return { ok: false, error: 'Không tìm thấy mã án lệ cần xóa.' };

  const { supabase, user, error: authErr } = await getAuthenticatedUserOrError();
  if (!user) return { ok: false, error: authErr || 'Vui lòng đăng nhập.' };

  try {
    const { data, error } = await supabase
      .from('cases')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        error: 'Bạn không có quyền xóa án lệ này hoặc án lệ đã bị xóa.',
      };
    }

    revalidatePath('/', 'layout');
    return { ok: true, id: data.id };
  } catch {
    return {
      ok: false,
      error: 'Không thể xóa án lệ lúc này. Vui lòng thử lại.',
    };
  }
}

export interface ImportActionResponse {
  ok: boolean;
  treatiesInserted: number;
  casesInserted: number;
  totalInserted: number;
  errors: string[];
  totalErrorsCount: number;
}

export async function importBatchAction(rawJsonString: string): Promise<ImportActionResponse> {
  const { supabase, user, error: authErr } = await getAuthenticatedUserOrError();
  if (!user) {
    return {
      ok: false,
      treatiesInserted: 0,
      casesInserted: 0,
      totalInserted: 0,
      errors: [authErr || 'Vui lòng đăng nhập để thực hiện nhập dữ liệu.'],
      totalErrorsCount: 1,
    };
  }

  // Kiểm tra lại đầy đủ bằng cùng một schema Zod ở phía máy chủ
  const validation = validateImportJsonString(rawJsonString);
  if (!validation.valid || !validation.data) {
    return {
      ok: false,
      treatiesInserted: 0,
      casesInserted: 0,
      totalInserted: 0,
      errors: validation.errors,
      totalErrorsCount: validation.totalErrorsCount,
    };
  }

  try {
    const { data, error } = await supabase.rpc('import_batch', {
      payload: {
        treaties: validation.data.treaties,
        cases: validation.data.cases,
      },
    });

    if (error) {
      return {
        ok: false,
        treatiesInserted: 0,
        casesInserted: 0,
        totalInserted: 0,
        errors: [
          'Không thể lưu lô dữ liệu vào cơ sở dữ liệu. Toàn bộ các bài trong lần nhập này đã được giữ nguyên (chưa lưu bài nào). Vui lòng thử lại.',
        ],
        totalErrorsCount: 1,
      };
    }

    const resObj = (data || {}) as {
      treaties_inserted?: number;
      cases_inserted?: number;
      total_inserted?: number;
    };

    const treatiesInserted = Number(
      resObj.treaties_inserted ?? validation.data.treaties.length
    );
    const casesInserted = Number(resObj.cases_inserted ?? validation.data.cases.length);
    const totalInserted = Number(resObj.total_inserted ?? treatiesInserted + casesInserted);

    revalidatePath('/', 'layout');

    return {
      ok: true,
      treatiesInserted,
      casesInserted,
      totalInserted,
      errors: [],
      totalErrorsCount: 0,
    };
  } catch {
    return {
      ok: false,
      treatiesInserted: 0,
      casesInserted: 0,
      totalInserted: 0,
      errors: ['Mất kết nối máy chủ trong khi nhập dữ liệu. Vui lòng thử lại.'],
      totalErrorsCount: 1,
    };
  }
}
