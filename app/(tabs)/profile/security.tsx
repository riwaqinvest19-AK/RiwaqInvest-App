import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import {
  authenticateWithBiometrics,
  biometricI18nSuffix,
  getBiometricCapability,
  type BiometricKind,
} from '@/lib/biometricAuth';
import { getBiometricLoginEnabled, setBiometricLoginEnabled } from '@/lib/biometricPreference';
import { clearBiometricLoginPayload } from '@/lib/biometricLogin';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';
const GOLD = '#C9A227';
const CARD_BORDER = '#E8ECF0';

export default function SecurityScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);
  const [savingBiometric, setSavingBiometric] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('none');

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const mainText = isDark ? '#f2f2f7' : '#0f172a';
  const subText = isDark ? '#a1a1a6' : '#6B7C93';
  const borderColor = isDark ? '#38383a' : CARD_BORDER;

  const chevronName = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

  const biometricLabel = t('profile.securityScreen.biometric.title');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBiometricEnabled(await getBiometricLoginEnabled());

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        setTwoFactorEnabled(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[security] load two_factor_enabled', error.message);
        setTwoFactorEnabled(false);
        return;
      }

      setTwoFactorEnabled(Boolean((data as { two_factor_enabled?: boolean } | null)?.two_factor_enabled ?? false));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void getBiometricCapability().then((cap) => setBiometricKind(cap.kind));
  }, []);

  const biometricLabelKey = `profile.securityScreen.biometric.subtitle.${biometricI18nSuffix(biometricKind)}`;
  const biometricSubtitle = t(biometricLabelKey, {
    defaultValue: t('profile.securityScreen.biometric.subtitle.generic'),
  });

  const onToggleBiometric = async (next: boolean) => {
    if (savingBiometric) return;

    if (!next) {
      setSavingBiometric(true);
      setBiometricEnabled(false);
      try {
        await setBiometricLoginEnabled(false);
        await AsyncStorage.removeItem(STORAGE_KEYS.biometricCredentialsSaved);
        await clearBiometricLoginPayload();
      } finally {
        setSavingBiometric(false);
      }
      return;
    }

    setSavingBiometric(true);
    const prev = biometricEnabled;
    setBiometricEnabled(true);

    try {
      const cap = await getBiometricCapability();
      setBiometricKind(cap.kind);

      if (!cap.hasHardware) {
        Alert.alert('', t('profile.securityScreen.biometric.noHardware'));
        setBiometricEnabled(prev);
        return;
      }

      if (!cap.isEnrolled) {
        const enrolledKey = `profile.securityScreen.biometric.notEnrolled.${biometricI18nSuffix(cap.kind)}`;
        Alert.alert('', t(enrolledKey, { defaultValue: t('profile.securityScreen.biometric.notEnrolled.generic') }));
        setBiometricEnabled(prev);
        return;
      }

      const res = await authenticateWithBiometrics(
        t('profile.securityScreen.biometric.prompt'),
        t('auth.alertCancel'),
      );

      if (!res.success) {
        setBiometricEnabled(prev);
        return;
      }

      await setBiometricLoginEnabled(true);
    } catch (e) {
      console.warn('[security] biometric toggle', e);
      setBiometricEnabled(prev);
      Alert.alert('', t('auth.errorGeneric'));
    } finally {
      setSavingBiometric(false);
    }
  };

  const updateTwoFactor = useCallback(
    async (next: boolean) => {
      if (savingTwoFactor) return;
      setSavingTwoFactor(true);
      const prev = twoFactorEnabled;
      setTwoFactorEnabled(next);

      Alert.alert('', t('profile.securityScreen.twoFactor.comingSoon'));

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user?.id) {
          setTwoFactorEnabled(prev);
          return;
        }

        const { error } = await supabase.from('profiles').update({ two_factor_enabled: next }).eq('id', user.id);
        if (error) {
          console.warn('[security] save two_factor_enabled', error.message);
          setTwoFactorEnabled(prev);
          Alert.alert('', t('profile.saveError'));
          return;
        }
      } finally {
        setSavingTwoFactor(false);
      }
    },
    [savingTwoFactor, t, twoFactorEnabled],
  );

  const disabledAny = loading || savingTwoFactor || savingBiometric;

  if (!fontsLoaded) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
      <View className="flex-row-reverse items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND_NAVY }}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-center font-cairo-bold text-lg text-white">
          {t('profile.securityTitle')}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-5">
          <View className="rounded-2xl border p-4" style={{ backgroundColor: cardBg, borderColor }}>
            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator color={BRAND_NAVY} />
              </View>
            ) : (
              <View className="flex-row-reverse items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(21,67,117,0.10)' }}>
                  <MaterialIcons name="security" size={26} color={BRAND_NAVY} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                    {t('profile.securityScreen.protected.title')}
                  </Text>
                  <Text className="mt-0.5 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
                    {t('profile.securityScreen.protected.subtitle')}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle-outline" size={22} color="#1F7A3F" />
              </View>
            )}
          </View>

          <Text className="mt-6 mb-2 px-1 font-cairo-semibold text-sm" style={{ color: subText, textAlign: 'right' }}>
            {t('profile.securityScreen.authSection')}
          </Text>

          <View className="gap-3">
            <View className="rounded-2xl border px-4 py-4" style={{ backgroundColor: cardBg, borderColor }}>
              <View className="flex-row-reverse items-center justify-between">
                <View className="flex-row-reverse items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(21,67,117,0.12)' }}>
                    <MaterialIcons name="fingerprint" size={22} color={BRAND_NAVY} />
                  </View>
                  <View className="min-w-0">
                    <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                      {biometricLabel}
                    </Text>
                    <Text className="mt-0.5 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
                      {biometricSubtitle}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  disabled={disabledAny}
                  onValueChange={(next) => void onToggleBiometric(next)}
                  trackColor={{ false: '#C8D0DA', true: '#0F3D6E' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C8D0DA"
                />
              </View>
            </View>

            <View className="rounded-2xl border px-4 py-4" style={{ backgroundColor: cardBg, borderColor }}>
              <View className="flex-row-reverse items-center justify-between">
                <View className="flex-row-reverse items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(201,162,39,0.18)' }}>
                    <MaterialIcons name="phone-iphone" size={20} color="#2563EB" />
                  </View>
                  <View className="min-w-0">
                    <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                      {t('profile.securityScreen.twoFactor.title')}
                    </Text>
                    <Text className="mt-0.5 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
                      {t('profile.securityScreen.twoFactor.subtitle')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={twoFactorEnabled}
                  disabled={disabledAny}
                  onValueChange={(next) => void updateTwoFactor(next)}
                  trackColor={{ false: '#C8D0DA', true: '#0F3D6E' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C8D0DA"
                />
              </View>
            </View>
          </View>

          <Text className="mt-6 mb-2 px-1 font-cairo-semibold text-sm" style={{ color: subText, textAlign: 'right' }}>
            {t('profile.securityScreen.passwordSection')}
          </Text>

          <View className="overflow-hidden rounded-2xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/profile/change-password')}
              className="flex-row-reverse items-center justify-between px-4 py-4 active:bg-black/5 dark:active:bg-white/5">
              <View className="flex-row-reverse items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(201,162,39,0.20)' }}>
                  <MaterialIcons name="key" size={20} color={GOLD} />
                </View>
                <View>
                  <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                    {t('profile.securityScreen.password.resetTitle')}
                  </Text>
                  <Text className="mt-0.5 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
                    {t('profile.securityScreen.password.resetSubtitle')}
                  </Text>
                </View>
              </View>
              <Ionicons name={chevronName} size={20} color={subText} />
            </Pressable>
          </View>

          <View
            className="mt-6 rounded-2xl border px-4 py-4"
            style={{ backgroundColor: isDark ? '#1f1d1a' : '#F8F3E7', borderColor: isDark ? '#3d3830' : '#E8DFD4' }}>
            <View className="flex-row-reverse items-start gap-3">
              <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(201,162,39,0.18)' }}>
                <MaterialIcons name="shield" size={20} color={GOLD} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-cairo-bold text-base" style={{ color: isDark ? '#D4A574' : '#9A6230', textAlign: 'right' }}>
                  {t('profile.securityScreen.tips.title')}
                </Text>
                <View className="mt-2 gap-2">
                  <TipLine text={t('profile.securityScreen.tips.one')} color={isDark ? '#d6d3cd' : '#4B5563'} />
                  <TipLine text={t('profile.securityScreen.tips.two')} color={isDark ? '#d6d3cd' : '#4B5563'} />
                  <TipLine text={t('profile.securityScreen.tips.three')} color={isDark ? '#d6d3cd' : '#4B5563'} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TipLine({ text, color }: { text: string; color: string }) {
  return (
    <View className="flex-row-reverse items-start" style={{ gap: 8 }}>
      <Text className="font-cairo text-sm" style={{ color, lineHeight: 20 }}>
        {'•'}
      </Text>
      <Text className="flex-1 font-cairo text-sm" style={{ color, textAlign: 'right', lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

