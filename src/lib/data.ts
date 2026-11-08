import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import type { CaseRecord, TreatyRecord, UserProfile, UserRole } from '@/lib/types';
import type { SourceCategory, SourceLink } from '@/lib/schemas';

function parseSourcesJson(raw: unknown): SourceLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { title: string; url: string } =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as { title?: unknown }).title === 'string' &&
            typeof (item as { url?: unknown }).url === 'string' &&
            /^https?:\/\//i.test((item as { url: string }).url)
        )
    )
    .map((item) => ({
      title: item.title,
      url: item.url,
    }));
}

export const fetchLibraryData = cache(async (): Promise<{
  profile: UserProfile;
  treaties: TreatyRecord[];
  cases: CaseRecord[];
  errorMessage: string | null;
}> => {
  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();

  const [authRes, profilesRes, treatiesRes, casesRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('treaties')
      .select('id, author_id, name, category, date_text, content, tags, sources, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('cases')
      .select(
        'id, author_id, name, court, year, facts, issues, holding, significance, tags, sources, created_at, updated_at'
      )
      .order('created_at', { ascending: false }),
  ]);

  const user = authRes.data?.user;
  if (authRes.error || !user) {
    redirect('/login');
  }

  const allProfiles = profilesRes.data || [];
  const currentUserProfile = allProfiles.find((p) => p.id === user.id);

  const fallbackUsername =
    (typeof user.user_metadata?.username === 'string' && user.user_metadata.username) ||
    user.email?.split('@')[0] ||
    'sinh_vien';

  const profile: UserProfile = {
    id: user.id,
    username: currentUserProfile?.username || fallbackUsername,
    role: (currentUserProfile?.role === 'admin' ? 'admin' : 'user') as UserRole,
    created_at:
      currentUserProfile?.created_at || user.created_at || new Date().toISOString(),
  };

  if (treatiesRes.error || casesRes.error) {
    return {
      profile,
      treaties: [],
      cases: [],
      errorMessage:
        'Không thể tải dữ liệu từ máy chủ lúc này. Vui lòng kiểm tra kết nối mạng và bấm "Thử lại".',
    };
  }

  const profileMap = new Map<string, { username: string; role: UserRole }>();
  for (const p of allProfiles) {
    profileMap.set(p.id, {
      username: p.username,
      role: p.role === 'admin' ? 'admin' : 'user',
    });
  }

  const treaties: TreatyRecord[] = (treatiesRes.data || []).map((row) => {
    const author = profileMap.get(row.author_id);
    return {
      id: row.id,
      author_id: row.author_id,
      author_username: author?.username || 'ẩn_danh',
      author_role: author?.role || 'user',
      name: row.name,
      category: row.category as SourceCategory,
      date_text: row.date_text,
      content: row.content,
      tags: Array.isArray(row.tags) ? row.tags : [],
      sources: parseSourcesJson(row.sources),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  const cases: CaseRecord[] = (casesRes.data || []).map((row) => {
    const author = profileMap.get(row.author_id);
    return {
      id: row.id,
      author_id: row.author_id,
      author_username: author?.username || 'ẩn_danh',
      author_role: author?.role || 'user',
      name: row.name,
      court: row.court,
      year: Number(row.year),
      facts: row.facts,
      issues: row.issues,
      holding: row.holding,
      significance: row.significance,
      tags: Array.isArray(row.tags) ? row.tags : [],
      sources: parseSourcesJson(row.sources),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return {
    profile,
    treaties,
    cases,
    errorMessage: null,
  };
});

export interface AdminUserItem {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  treatyCount: number;
  caseCount: number;
  totalPosts: number;
}

export const fetchAdminUsersList = cache(async (): Promise<{
  profile: UserProfile;
  users: AdminUserItem[];
  errorMessage: string | null;
}> => {
  const { isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();
  const [authRes, profilesRes, treatiesRes, casesRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('id, username, role, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('treaties').select('author_id'),
    supabase.from('cases').select('author_id'),
  ]);

  const user = authRes.data?.user;
  if (authRes.error || !user) {
    redirect('/login');
  }

  const allProfiles = profilesRes.data || [];
  const currentUserProfile = allProfiles.find((p) => p.id === user.id);

  const profile: UserProfile = {
    id: user.id,
    username: currentUserProfile?.username || 'admin',
    role: (currentUserProfile?.role === 'admin' ? 'admin' : 'user') as UserRole,
    created_at: currentUserProfile?.created_at || new Date().toISOString(),
  };

  if (profile.role !== 'admin') {
    redirect('/');
  }

  if (profilesRes.error || treatiesRes.error || casesRes.error) {
    return {
      profile,
      users: [],
      errorMessage: 'Không thể tải danh sách người dùng lúc này. Vui lòng thử lại.',
    };
  }

  const treatyCounts = new Map<string, number>();
  for (const t of treatiesRes.data || []) {
    treatyCounts.set(t.author_id, (treatyCounts.get(t.author_id) || 0) + 1);
  }

  const caseCounts = new Map<string, number>();
  for (const c of casesRes.data || []) {
    caseCounts.set(c.author_id, (caseCounts.get(c.author_id) || 0) + 1);
  }

  const users: AdminUserItem[] = allProfiles.map((u) => {
    const tc = treatyCounts.get(u.id) || 0;
    const cc = caseCounts.get(u.id) || 0;
    return {
      id: u.id,
      username: u.username,
      role: u.role === 'admin' ? 'admin' : 'user',
      created_at: u.created_at,
      treatyCount: tc,
      caseCount: cc,
      totalPosts: tc + cc,
    };
  });

  return {
    profile,
    users,
    errorMessage: null,
  };
});
