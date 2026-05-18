/**
 * Support contact — override via EXPO_PUBLIC_SUPPORT_EMAIL / EXPO_PUBLIC_SUPPORT_PHONE / EXPO_PUBLIC_SUPPORT_WHATSAPP.
 */
export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'riwaqinvest19@gmail.com';

/** Local display format (Algeria) */
export const SUPPORT_PHONE_DISPLAY =
  process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '0563760627';

/** E.164 without + for tel:/WhatsApp (Algeria mobile 0… → 213…) */
export const SUPPORT_PHONE_E164 =
  process.env.EXPO_PUBLIC_SUPPORT_PHONE_E164 ?? '213563760627';

/** E.164 without +, e.g. 213563760627 for Algeria WhatsApp */
export const SUPPORT_WHATSAPP_E164 =
  process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? SUPPORT_PHONE_E164;

export const SOCIAL_FACEBOOK_URL =
  process.env.EXPO_PUBLIC_SOCIAL_FACEBOOK_URL ??
  'https://www.facebook.com/share/19oeJF2447/';

export const SOCIAL_LINKEDIN_URL =
  process.env.EXPO_PUBLIC_SOCIAL_LINKEDIN_URL ??
  'https://www.linkedin.com/company/riwaq-invest19/';
