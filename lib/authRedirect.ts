import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Redirect URL embedded in Supabase signup / email-confirmation messages.
 * Web: lands on /login so tokens in the URL hash are processed on the login screen.
 * Add each URL under Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function getAuthEmailRedirectTo(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/login`;
  }
  return Linking.createURL('/(auth)/login');
}

/** Password-reset email link (web static route: /reset-password). */
export function getPasswordResetRedirectTo(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/reset-password`;
  }
  return Linking.createURL('/(auth)/reset-password');
}

/** Documented origins — keep in sync with Supabase Redirect URLs when deploying. */
export const AUTH_REDIRECT_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'https://dusk-8562d5.netlify.app',
  'https://whimsical-dusk-8562d5.netlify.app',
] as const;

/** Paths to allow in Supabase Redirect URLs (with trailing slash optional). */
export const AUTH_REDIRECT_PATHS = ['/login', '/reset-password', '/'] as const;
