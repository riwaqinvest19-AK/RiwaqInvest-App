import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[RiwaqInvest] Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.',
  );
}

/** In-memory auth for web SSR / environments without a storage implementation. */
function createMemoryStorage() {
  const mem = new Map<string, string>();
  return {
    getItem: async (key: string) => mem.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: async (key: string) => {
      mem.delete(key);
    },
  };
}

const authStorage =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? createMemoryStorage()
    : AsyncStorage;

declare global {
  // eslint-disable-next-line no-var
  var __riwaqSupabase: ReturnType<typeof createClient> | undefined;
}

export const supabase =
  globalThis.__riwaqSupabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

if (__DEV__) {
  globalThis.__riwaqSupabase = supabase;
}
