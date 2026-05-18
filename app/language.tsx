import { MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STORAGE_KEYS } from '@/lib/storageKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppLanguage = 'ar' | 'fr' | 'en';

const LANGUAGES: AppLanguage[] = ['ar', 'fr', 'en'];

function parseAppLanguage(lng: string): AppLanguage {
  const code = lng.split('-')[0];
  if (code === 'ar' || code === 'fr' || code === 'en') {
    return code;
  }
  return 'ar';
}

export default function LanguageScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<AppLanguage>(() => parseAppLanguage(i18n.language));

  const onSelectLanguage = useCallback(
    (langCode: AppLanguage) => {
      setSelected(langCode);
      void AsyncStorage.setItem(STORAGE_KEYS.language, langCode);
      void i18n.changeLanguage(langCode);
    },
    [i18n],
  );

  const onContinue = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.language, selected);
    await i18n.changeLanguage(selected);
    router.replace('/onboarding');
  }, [router, selected, i18n]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
      <View className="flex-1 px-8 pt-8">
        <View className="items-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-icon-bg">
            <MaterialIcons name="translate" size={44} color="#154375" />
          </View>
          <Text className="mt-8 text-center font-cairo-bold text-3xl text-brand-navy">
            {t('language.chooseTitle')}
          </Text>
          <Text className="mt-2 text-center font-cairo text-sm text-muted-label">
            {t('language.sectionLabel')}
          </Text>
        </View>

        <View className="mt-10 w-full">
          {LANGUAGES.map((code) => {
            const isSelected = selected === code;
            return (
              <Pressable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectLanguage(code)}
                className={`mb-4 w-full flex-row-reverse items-center justify-between rounded-2xl px-5 py-4 ${
                  isSelected
                    ? 'border-2 border-brand-navy bg-brand-selected'
                    : 'border border-gray-200 bg-gray-50'
                }`}>
                <Text
                  className={`flex-1 text-lg text-brand-navy ${
                    isSelected ? 'font-cairo-semibold' : 'font-cairo'
                  }`}
                  style={{ textAlign: 'right' }}>
                  {t(`language.names.${code}`)}
                </Text>
                {isSelected ? (
                  <MaterialIcons name="check" size={24} color="#C9A227" />
                ) : (
                  <View className="w-6" />
                )}
              </Pressable>
            );
          })}
        </View>

        <View className="flex-1" />

        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          className="mb-2 w-full rounded-xl bg-brand-navy py-4 active:opacity-90">
          <Text className="text-center font-cairo-bold text-lg text-white">
            {t('language.continue')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
