import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import ar from './ar.json';
import en from './en.json';
import fr from './fr.json';

export const resources = {
  ar: { translation: ar },
  en: { translation: en },
  fr: { translation: fr },
} as const;

/** App default language — keep in sync with `init.lng` / `fallbackLng`. */
export const DEFAULT_LANGUAGE = 'ar' as const;

function applyLayoutDirection(lng: string) {
  const code = lng.split('-')[0];
  const rtl = code === 'ar';

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lng);
    return;
  }

  const applyNative = () => {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
    }
  };

  // Defer: calling forceRTL synchronously during the first module evaluation can
  // destabilize Expo/Metro and leave the client stuck (e.g. "Building 100%"/reload).
  if (Platform.OS === 'web') {
    return;
  }
  setTimeout(applyNative, 0);
}

i18n.use(initReactI18next).init(
  {
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['ar', 'en', 'fr'],
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  },
  () => {
    applyLayoutDirection(i18n.language);
  },
);

i18n.on('languageChanged', (nextLng) => {
  applyLayoutDirection(nextLng);
});

export default i18n;
