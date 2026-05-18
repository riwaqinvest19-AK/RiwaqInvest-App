import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { STORAGE_KEYS } from '@/lib/storageKeys';

type Scheme = 'light' | 'dark';

type ThemePreferenceContextValue = {
  /** Resolved visual scheme (stored preference overrides system when set). */
  colorScheme: Scheme;
  /** Explicit user preference if any; `null` means “follow system”. */
  storedPreference: Scheme | null;
  setColorScheme: (next: Scheme) => void;
  clearToSystem: () => void;
  hydrated: boolean;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme() ?? 'light';
  const [storedPreference, setStoredPreference] = useState<Scheme | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEYS.colorScheme).then((raw) => {
      if (cancelled) return;
      if (raw === 'light' || raw === 'dark') {
        setStoredPreference(raw);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setColorScheme = useCallback((next: Scheme) => {
    setStoredPreference(next);
    void AsyncStorage.setItem(STORAGE_KEYS.colorScheme, next);
  }, []);

  const clearToSystem = useCallback(() => {
    setStoredPreference(null);
    void AsyncStorage.removeItem(STORAGE_KEYS.colorScheme);
  }, []);

  const colorScheme: Scheme = storedPreference ?? systemScheme;

  const value = useMemo(
    () => ({
      colorScheme,
      storedPreference,
      setColorScheme,
      clearToSystem,
      hydrated,
    }),
    [colorScheme, storedPreference, setColorScheme, clearToSystem, hydrated],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return ctx;
}

export function useOptionalThemePreference(): ThemePreferenceContextValue | null {
  return useContext(ThemePreferenceContext);
}
