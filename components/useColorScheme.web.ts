import { useColorScheme as useRNColorScheme } from 'react-native';

import { useOptionalThemePreference } from '@/contexts/ThemePreferenceContext';

export function useColorScheme(): 'light' | 'dark' {
  const ctx = useOptionalThemePreference();
  const system = useRNColorScheme() ?? 'light';
  if (ctx?.hydrated) {
    return ctx.colorScheme;
  }
  return system;
}
