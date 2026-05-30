/** GitHub Releases direct asset link — permanent Android APK download. */
const ANDROID_APK_FALLBACK_URL =
  'https://github.com/riwaqinvest19-AK/RiwaqInvest-App/releases/download/v1.0.1/RiwaqInvest_v1.0.1.apk';

/** Env override for Netlify/local; falls back to GitHub Releases when unset at build time. */
export const ANDROID_APK_URL =
  process.env.EXPO_PUBLIC_ANDROID_APK_URL?.trim() || ANDROID_APK_FALLBACK_URL;

export function isAndroidApkDownloadConfigured(): boolean {
  return ANDROID_APK_URL.length > 0 && /^https?:\/\//i.test(ANDROID_APK_URL);
}
