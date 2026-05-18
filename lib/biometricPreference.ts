import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '@/lib/storageKeys';

const SECURE_FLAG_KEY = 'riwaq_biometric_login_enabled_v1';

/**
 * Whether the user opted in to biometric quick-login (native: SecureStore; web: AsyncStorage).
 * Migrates a legacy AsyncStorage flag into SecureStore on first read.
 */
export async function getBiometricLoginEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return (await AsyncStorage.getItem(STORAGE_KEYS.biometricLoginEnabled)) === 'true';
  }
  try {
    const v = await SecureStore.getItemAsync(SECURE_FLAG_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {
    /* fall through to legacy */
  }
  const legacy = await AsyncStorage.getItem(STORAGE_KEYS.biometricLoginEnabled);
  if (legacy === 'true') {
    try {
      await SecureStore.setItemAsync(SECURE_FLAG_KEY, 'true');
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  const s = enabled ? 'true' : 'false';
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(STORAGE_KEYS.biometricLoginEnabled, s);
    return;
  }
  await SecureStore.setItemAsync(SECURE_FLAG_KEY, s);
  await AsyncStorage.removeItem(STORAGE_KEYS.biometricLoginEnabled).catch(() => {});
}
