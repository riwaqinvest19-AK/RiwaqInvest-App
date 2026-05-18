import { useColorScheme as useRNColorScheme } from 'react-native';

import { useOptionalThemePreference } from '@/contexts/ThemePreferenceContext';

/**
 * App color scheme: uses persisted profile preference when set, otherwise the device setting.
 */
export function useColorScheme(): 'light' | 'dark' {
  const ctx = useOptionalThemePreference();
  const system = useRNColorScheme() ?? 'light';
  if (ctx?.hydrated) {
    return ctx.colorScheme;
  }
  return system;
}
