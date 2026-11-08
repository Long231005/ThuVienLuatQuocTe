import { getSupabasePublicEnv, isSignupEnabled } from '@/lib/supabase/env';
import { LoginClient } from '@/components/login-client';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { isConfigured } = getSupabasePublicEnv();
  const signupEnabled = isSignupEnabled();

  return (
    <LoginClient
      isConfigured={isConfigured}
      signupEnabled={signupEnabled}
    />
  );
}
