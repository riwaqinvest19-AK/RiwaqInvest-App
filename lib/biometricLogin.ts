import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORE_KEY = 'riwaq_biometric_login_v1';
const WEB_STORE_KEY = 'riwaq_biometric_login_web_v1';

export type BiometricLoginPayload = {
  email: string;
  password: string;
};

export async function saveBiometricLoginPayload(payload: BiometricLoginPayload): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(WEB_STORE_KEY, JSON.stringify(payload));
    return;
  }
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(payload), {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearBiometricLoginPayload(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(WEB_STORE_KEY).catch(() => {});
    return;
  }
  await SecureStore.deleteItemAsync(STORE_KEY).catch(() => {});
}

export async function readBiometricLoginPayload(): Promise<BiometricLoginPayload | null> {
  const raw =
    Platform.OS === 'web'
      ? await AsyncStorage.getItem(WEB_STORE_KEY)
      : await SecureStore.getItemAsync(STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BiometricLoginPayload>;
    if (
      typeof parsed.email === 'string' &&
      parsed.email.length > 0 &&
      typeof parsed.password === 'string' &&
      parsed.password.length > 0
    ) {
      return { email: parsed.email, password: parsed.password };
    }
  } catch {
    /* ignore */
  }
  return null;
}
