import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Loads `profiles.total_balance` on focus and when the app returns to foreground.
 * Avoids Supabase Realtime channel collisions (multiple screens mounting the same channel name).
 */
export function useProfileBalance() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setBalance(null);
      setLoading(false);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('total_balance')
      .eq('id', uid)
      .maybeSingle();

    const next = error ? null : Number(data?.total_balance ?? 0);
    if (error) {
      console.warn('[useProfileBalance]', error.message);
      setBalance(null);
    } else {
      setBalance(next);
    }
    setLoading(false);
    return next;
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void refresh();

      const onAppState = (state: AppStateStatus) => {
        if (state === 'active') {
          void refresh();
        }
      };
      const sub = AppState.addEventListener('change', onAppState);

      return () => {
        sub.remove();
      };
    }, [refresh]),
  );

  return { balance, loading, refresh, userId };
}
