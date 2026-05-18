import type { Session, User } from '@supabase/supabase-js';

/** True when the account email has been confirmed via Supabase Auth. */
export function isEmailConfirmed(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.email_confirmed_at) return true;
  const legacy = (user as User & { confirmed_at?: string | null }).confirmed_at;
  return Boolean(legacy);
}

export function isSessionEmailConfirmed(session: Session | null | undefined): boolean {
  return isEmailConfirmed(session?.user);
}
