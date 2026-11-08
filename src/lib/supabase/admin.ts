import { createClient } from '@supabase/supabase-js';
import { cleanEnvValue, getSupabasePublicEnv } from './env';

/**
 * Tạo Supabase Admin Client sử dụng SUPABASE_SERVICE_ROLE_KEY.
 * TUYỆT ĐỐI CHỈ DÙNG Ở PHÍA MÁY CHỦ (Server Actions, Route Handlers).
 */
export function createAdminSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Không được phép gọi Admin Client ở phía trình duyệt.');
  }
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Hệ thống chưa được cấu hình đầy đủ khóa kết nối cơ sở dữ liệu (SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
