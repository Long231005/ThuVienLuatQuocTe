import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { passwordSchema, usernameSchema } from '../src/lib/schemas';
import { cleanEnvValue, normalizeSupabaseUrl } from '../src/lib/supabase/env';

// Đọc .env.local trước, sau đó .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const shouldResetPassword = process.argv.includes('--reset-password');

  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const rawUsername = cleanEnvValue(process.env.ADMIN_USERNAME);
  const rawPassword = cleanEnvValue(process.env.ADMIN_PASSWORD);
  const emailDomain = (
    cleanEnvValue(process.env.AUTH_EMAIL_DOMAIN) || 'thuvienluat.invalid'
  ).replace(/^@+/, '');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Lỗi: Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local.'
    );
    process.exit(1);
  }

  if (!rawUsername || !rawPassword) {
    console.error('Lỗi: Thiếu ADMIN_USERNAME hoặc ADMIN_PASSWORD trong .env.local.');
    process.exit(1);
  }

  const usernameParse = usernameSchema.safeParse(rawUsername);
  if (!usernameParse.success) {
    console.error('Lỗi ADMIN_USERNAME:', usernameParse.error.issues[0]?.message);
    process.exit(1);
  }

  const passwordParse = passwordSchema.safeParse(rawPassword);
  if (!passwordParse.success) {
    console.error('Lỗi ADMIN_PASSWORD:', passwordParse.error.issues[0]?.message);
    process.exit(1);
  }

  const username = usernameParse.data;
  const password = passwordParse.data;
  const email = `${username}@${emailDomain}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Đang kiểm tra tài khoản quản trị viên @${username}...`);

  // Kiểm tra trong bảng profiles trước
  const { data: existingProfile, error: profileQueryErr } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('username', username)
    .maybeSingle();

  if (profileQueryErr) {
    console.error(
      'Lỗi truy vấn bảng profiles (hãy chắc chắn bạn đã chạy supabase/schema.sql trên Supabase):',
      profileQueryErr.message
    );
    process.exit(1);
  }

  let userId = existingProfile?.id;

  if (!userId) {
    // Tạo mới qua Admin API
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (createErr) {
      // Phòng trường hợp user đã có trong auth.users nhưng chưa có dòng profiles
      const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) {
        console.error('Không thể tạo tài khoản admin:', createErr.message);
        process.exit(1);
      }
      const found = usersList.users.find(
        (u) =>
          u.email?.toLowerCase() === email.toLowerCase() ||
          u.user_metadata?.username === username
      );
      if (!found) {
        console.error('Không thể tạo tài khoản admin:', createErr.message);
        process.exit(1);
      }
      userId = found.id;
    } else {
      userId = created.user.id;
      console.log(`Đã tạo người dùng mới @${username} (${userId}).`);
    }
  } else {
    console.log(`Tài khoản @${username} đã tồn tại (${userId}).`);
    if (shouldResetPassword) {
      const { error: updatePwErr } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updatePwErr) {
        console.error('Không thể đặt lại mật khẩu admin:', updatePwErr.message);
        process.exit(1);
      }
      console.log(`Đã cập nhật mật khẩu mới cho @${username} (--reset-password).`);
    }
  }

  // Đảm bảo dòng trong profiles có role = 'admin'
  const { error: upsertErr } = await supabase.from('profiles').upsert(
    {
      id: userId,
      username,
      role: 'admin',
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    console.error('Không thể gán quyền admin trong bảng profiles:', upsertErr.message);
    process.exit(1);
  }

  console.log(`Hoàn tất! Tài khoản @${username} đã có quyền Quản trị viên (admin).`);
}

main().catch((err) => {
  console.error('Lỗi không xác định:', err);
  process.exit(1);
});
