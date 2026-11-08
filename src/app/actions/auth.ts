'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { loginSchema, passwordSchema, signupSchema } from '@/lib/schemas';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  getSupabasePublicEnv,
  isSignupEnabled,
  usernameToEmail,
} from '@/lib/supabase/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AuthActionResponse {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(input: {
  username: string;
  password: string;
}): Promise<AuthActionResponse> {
  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return {
      ok: false,
      error:
        'Hệ thống chưa được kết nối cơ sở dữ liệu Supabase. Hãy làm theo hướng dẫn trong file README.md.',
    };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: 'Vui lòng kiểm tra lại thông tin đăng nhập.',
      fieldErrors,
    };
  }

  const { username, password } = parsed.data;
  const email = usernameToEmail(username);

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        ok: false,
        error: 'Tên đăng nhập hoặc mật khẩu không đúng.',
      };
    }

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau giây lát.',
    };
  }
}

export async function signupAction(input: {
  username: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResponse> {
  if (!isSignupEnabled()) {
    return {
      ok: false,
      error: 'Tính năng đăng ký tài khoản mới hiện đang tạm đóng. Hãy liên hệ quản trị viên của nhóm.',
    };
  }

  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return {
      ok: false,
      error:
        'Hệ thống chưa được kết nối cơ sở dữ liệu Supabase. Hãy làm theo hướng dẫn trong file README.md.',
    };
  }

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: 'Vui lòng kiểm tra lại các trường thông tin bên dưới.',
      fieldErrors,
    };
  }

  const { username, password } = parsed.data;
  const email = usernameToEmail(username);

  try {
    const adminSupabase = createAdminSupabaseClient();

    // Kiểm tra trùng tên đăng nhập trong bảng profiles
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingProfile) {
      return {
        ok: false,
        error: 'Tên đăng nhập này đã có người dùng.',
        fieldErrors: { username: 'Tên đăng nhập này đã có người dùng.' },
      };
    }

    // Tạo user qua Admin API (tự động xác nhận email_confirm: true, không gửi email)
    const { data: created, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });

    if (createError) {
      const msgLower = createError.message.toLowerCase();
      if (
        msgLower.includes('already') ||
        msgLower.includes('exists') ||
        msgLower.includes('registered') ||
        msgLower.includes('duplicate')
      ) {
        return {
          ok: false,
          error: 'Tên đăng nhập này đã có người dùng.',
          fieldErrors: { username: 'Tên đăng nhập này đã có người dùng.' },
        };
      }
      return {
        ok: false,
        error: 'Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.',
      };
    }

    // Đảm bảo dòng profiles tồn tại với role = 'user'
    if (created.user) {
      await adminSupabase.from('profiles').upsert(
        {
          id: created.user.id,
          username,
          role: 'user',
        },
        { onConflict: 'id' }
      );
    }

    // Tự động đăng nhập ngay cho người dùng vừa tạo
    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        ok: false,
        error:
          'Tài khoản đã được tạo thành công. Vui lòng chuyển sang tab Đăng nhập để vào thư viện.',
      };
    }

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'Không thể tạo tài khoản lúc này. Hãy kiểm tra lại cấu hình khóa bí mật trên máy chủ.',
    };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Bỏ qua lỗi mạng khi đăng xuất
  }
  redirect('/login');
}

export async function adminResetPasswordAction(input: {
  targetUserId: string;
  newPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  const pwParse = passwordSchema.safeParse(input.newPassword);
  if (!pwParse.success) {
    return {
      ok: false,
      error: pwParse.error.issues[0]?.message || 'Mật khẩu mới phải từ 6 ký tự trở lên.',
    };
  }

  if (!input.targetUserId) {
    return { ok: false, error: 'Không xác định được tài khoản cần đặt lại mật khẩu.' };
  }

  try {
    // Kiểm tra người gọi hiện tại có đúng là admin ở phía máy chủ không
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { ok: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfile?.role !== 'admin') {
      return { ok: false, error: 'Chỉ quản trị viên mới có quyền đặt lại mật khẩu.' };
    }

    const adminSupabase = createAdminSupabaseClient();
    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(
      input.targetUserId,
      {
        password: pwParse.data,
        email_confirm: true,
      }
    );

    if (updateErr) {
      return {
        ok: false,
        error: 'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.',
      };
    }

    revalidatePath('/admin');
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.',
    };
  }
}
