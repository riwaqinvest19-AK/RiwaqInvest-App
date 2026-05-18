import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { parseSupabaseSessionParamsFromUrl } from '@/lib/authUrl';
import { setPasswordRecoveryActive } from '@/lib/authRecoveryState';
import { isEmailConfirmed } from '@/lib/authSession';
import { supabase } from '@/lib/supabase';

export type AuthCallbackResult =
  | { handled: false }
  | { handled: true; kind: 'recovery' }
  | { handled: true; kind: 'email_confirmed' }
  | { handled: true; kind: 'session'; emailConfirmed: boolean }
  | { handled: true; kind: 'error'; message: string };

/** True when the URL may contain Supabase implicit-grant tokens. */
export function urlMayContainAuthTokens(url: string): boolean {
  return /access_token=/.test(url) || /refresh_token=/.test(url);
}

/** Remove hash/query auth tokens from the address bar after processing (web only). */
export function clearAuthParamsFromBrowserUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  const search = window.location.search || '';
  window.history.replaceState(null, '', `${path}${search}`);
}

/**
 * Parse tokens from a Supabase email link, establish the session, and strip tokens from the URL.
 */
export async function processSupabaseAuthCallbackUrl(url: string): Promise<AuthCallbackResult> {
  if (!urlMayContainAuthTokens(url)) {
    return { handled: false };
  }

  const tokens = parseSupabaseSessionParamsFromUrl(url);
  if (!tokens) {
    return { handled: false };
  }

  const isRecovery = tokens.type === 'recovery' || /type=recovery/i.test(url);
  if (isRecovery) {
    setPasswordRecoveryActive(true);
  }

  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (error) {
    console.error('[auth-callback] setSession failed:', error.message, { type: tokens.type });
    return { handled: true, kind: 'error', message: error.message };
  }

  clearAuthParamsFromBrowserUrl();

  if (isRecovery) {
    return { handled: true, kind: 'recovery' };
  }

  const { data: userData } = await supabase.auth.getUser();
  const confirmed = isEmailConfirmed(userData.user);
  const confirmTypes = new Set(['signup', 'email', 'email_change', 'magiclink']);
  if (confirmed && (!tokens.type || confirmTypes.has(tokens.type))) {
    return { handled: true, kind: 'email_confirmed' };
  }

  return { handled: true, kind: 'session', emailConfirmed: confirmed };
}

/** Process `window.location` on web (hash tokens are not available via Linking alone). */
export async function processWebAuthCallbackOnLoad(): Promise<AuthCallbackResult> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { handled: false };
  }
  return processSupabaseAuthCallbackUrl(window.location.href);
}

/** Best URL to read on cold start: web href first, then Expo Linking. */
export async function getAuthCallbackUrlOnLaunch(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const href = window.location.href;
    if (urlMayContainAuthTokens(href)) {
      return href;
    }
  }
  return Linking.getInitialURL();
}
