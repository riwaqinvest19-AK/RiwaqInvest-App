import { supabase } from '@/lib/supabase';

export type ProfileAdminCheck = {
  isAdmin: boolean;
  isAdminFromProfile?: boolean;
  isAdminFromRpc?: boolean;
};

/** True when profiles.is_admin or is_admin_user() RPC indicates admin access. */
export async function checkProfileAdmin(userId?: string | null): Promise<ProfileAdminCheck> {
  if (!userId) {
    return { isAdmin: false };
  }

  const [{ data: rpcData, error: rpcError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.rpc('is_admin_user', { target_user_id: userId }),
      supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    ]);

  const isAdminFromRpc = !rpcError && Boolean(rpcData);
  const isAdminFromProfile = !profileError && Boolean(profile?.is_admin);

  if (rpcError) {
    console.warn('[checkProfileAdmin] is_admin_user rpc', rpcError.message);
  }
  if (profileError) {
    console.warn('[checkProfileAdmin] profiles.is_admin', profileError.message);
  }

  return {
    isAdmin: isAdminFromProfile || isAdminFromRpc,
    isAdminFromProfile: profileError ? undefined : isAdminFromProfile,
    isAdminFromRpc: rpcError ? undefined : isAdminFromRpc,
  };
}
