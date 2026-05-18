import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricKind = 'fingerprint' | 'face' | 'iris' | 'none';

export type BiometricCapability = {
  hasHardware: boolean;
  isEnrolled: boolean;
  kind: BiometricKind;
  supportedTypes: LocalAuthentication.AuthenticationType[];
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  const kind = resolveBiometricKind(supportedTypes);

  return { hasHardware, isEnrolled, kind, supportedTypes };
}

export function resolveBiometricKind(
  types: LocalAuthentication.AuthenticationType[],
): BiometricKind {
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'face';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
}

/** Prefer fingerprint wording on Android when the device supports it. */
export function biometricI18nSuffix(kind: BiometricKind): 'fingerprint' | 'face' | 'generic' {
  if (kind === 'fingerprint') return 'fingerprint';
  if (kind === 'face') return 'face';
  if (Platform.OS === 'android') return 'fingerprint';
  return 'generic';
}

export async function authenticateWithBiometrics(promptMessage: string, cancelLabel: string) {
  if (Platform.OS === 'web') {
    const hasWebAuthn =
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

    if (hasWebAuthn) {
      try {
        const uv = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (uv) {
          return { success: true };
        }
      } catch {
        /* fall through */
      }
    }

    if (typeof window !== 'undefined') {
      const ok = window.confirm(`${promptMessage}\n\n${cancelLabel}?`);
      return { success: ok };
    }
    return { success: false };
  }

  return LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: false,
    ...(Platform.OS === 'android'
      ? { biometricsSecurityLevel: LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG }
      : {}),
  });
}
