import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { ok: false, message: 'Không có quyền truy cập.' },
      { status: 401 }
    );
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, message: 'Không thể kết nối cơ sở dữ liệu.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      profiles_count: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Lỗi máy chủ khi thực hiện keepalive.' },
      { status: 500 }
    );
  }
}
