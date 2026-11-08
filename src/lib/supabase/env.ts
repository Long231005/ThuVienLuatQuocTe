export function normalizeSupabaseUrl(rawUrl?: string): string {
  const cleaned = (rawUrl || '').split('#')[0].trim();
  if (!cleaned) return '';
  try {
    const parsed = new URL(cleaned);
    return parsed.origin;
  } catch {
    return cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
}

export function cleanEnvValue(rawVal?: string): string {
  return (rawVal || '').split(/\s+#/)[0].trim();
}

export function getSupabasePublicEnv() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey =
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    '';

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

export function getAuthEmailDomain(): string {
  const domain = process.env.AUTH_EMAIL_DOMAIN?.trim() || 'thuvienluat.invalid';
  return domain.replace(/^@+/, '');
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${getAuthEmailDomain()}`;
}

export function isSignupEnabled(): boolean {
  const raw = process.env.SIGNUP_ENABLED?.trim().toLowerCase();
  if (!raw) return true;
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}
