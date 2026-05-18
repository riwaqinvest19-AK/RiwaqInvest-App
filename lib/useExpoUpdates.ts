import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Checks for OTA updates on launch and when the app returns to foreground.
 * Skips in development and when expo-updates is unavailable (Expo Go).
 */
export function useExpoUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    const check = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.warn('[expo-updates]', e);
      }
    };

    void check();

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void check();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
