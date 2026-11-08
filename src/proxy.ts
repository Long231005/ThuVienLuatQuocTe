import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cho phép API keepalive tự kiểm tra Authorization Bearer CRON_SECRET
  if (pathname.startsWith('/api/keepalive')) {
    return NextResponse.next();
  }

  const { url, anonKey, isConfigured } = getSupabasePublicEnv();

  // Nếu chưa điền biến môi trường Supabase, chỉ cho phép vào /login để hiển thị hướng dẫn
  if (!isConfigured) {
    if (pathname !== '/login') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const allCookies = request.cookies.getAll();
  const hasSupabaseSessionCookie = allCookies.some((c) => c.name.startsWith('sb-'));

  if (!hasSupabaseSessionCookie) {
    if (pathname !== '/login') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const isClientTabNavigation =
    request.headers.get('next-router-prefetch') === '1' ||
    (request.headers.get('rsc') === '1' &&
      request.method === 'GET' &&
      pathname !== '/login' &&
      pathname !== '/admin');

  if (isClientTabNavigation) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // BẮT BUỘC dùng getUser() (không dùng getSession()) để xác thực token với Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname !== '/login') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
