const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl.trim() && supabaseAnonKey.trim());
}

/** Shown when APK/web was built without EXPO_PUBLIC_* env vars. */
export function getSupabaseConfigErrorKey(): 'auth.supabaseNotConfigured' | null {
  return isSupabaseConfigured() ? null : 'auth.supabaseNotConfigured';
}

export function mapAuthErrorMessage(
  message: string | undefined,
  t: (key: string) => string,
): string {
  const msg = (message ?? '').toLowerCase();
  if (!msg) return t('auth.errorGeneric');
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return t('auth.errorNetwork');
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return t('auth.errorEmailRateLimit');
  }
  if (msg.includes('invalid api key') || msg.includes('apikey')) {
    return t('auth.supabaseNotConfigured');
  }
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return t('auth.emailNotConfirmed');
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return t('auth.errorInvalidCredentials');
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return t('auth.errorUserExists');
  }
  return message || t('auth.errorGeneric');
}
