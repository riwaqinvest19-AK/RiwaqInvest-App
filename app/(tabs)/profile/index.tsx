import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import Constants from 'expo-constants';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  I18nManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RiwaqLogo } from '@/components/RiwaqLogo';
import { useColorScheme } from '@/components/useColorScheme';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_E164 } from '@/constants/Support';
import { useThemePreference } from '@/contexts/ThemePreferenceContext';
import { checkProfileAdmin } from '@/lib/checkProfileAdmin';
import { showAppAlert } from '@/lib/showAppAlert';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { supabase } from '@/lib/supabase';
import { useProfileBalance } from '@/lib/useProfileBalance';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BRAND_NAVY = '#154375';
const PAGE_BG_LIGHT = '#F2F4F7';
const PAGE_BG_DARK = '#0a0a0a';
const CARD_BORDER = '#E8ECF0';

type AppLanguage = 'ar' | 'fr' | 'en';
const LANGUAGES: AppLanguage[] = ['ar', 'fr', 'en'];

type ProfileRow = {
  full_name: string | null;
  phone_number: string | null;
  is_verified: boolean;
  total_balance: number;
  is_admin: boolean;
};

function parseAppLanguage(lng: string): AppLanguage {
  const code = lng.split('-')[0];
  if (code === 'ar' || code === 'fr' || code === 'en') {
    return code;
  }
  return 'ar';
}

function displayName(name: string | null | undefined, email: string | null | undefined, fallback: string) {
  if (name?.trim()) {
    return name.trim();
  }
  if (email?.includes('@')) {
    return email.split('@')[0] ?? email;
  }
  return fallback;
}

export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { setColorScheme } = useThemePreference();
  const isDark = colorScheme === 'dark';

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signOutDialogVisible, setSignOutDialogVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { balance: liveBalance, refresh: refreshBalance } = useProfileBalance();

  const pageBg = isDark ? PAGE_BG_DARK : PAGE_BG_LIGHT;
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const sectionLabel = isDark ? '#8e8e93' : '#6B7C93';
  const mainText = isDark ? '#f2f2f7' : '#0f172a';
  const subText = isDark ? '#a1a1a6' : '#6B7C93';
  const borderColor = isDark ? '#38383a' : CARD_BORDER;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      setEmail(user?.email ?? null);

      if (!user?.id) {
        setProfile(null);
        setIsAdmin(false);
        return;
      }

      const [{ isAdmin: adminOk }, profileResult] = await Promise.all([
        checkProfileAdmin(user.id),
        supabase
          .from('profiles')
          .select('full_name, phone_number, is_verified, total_balance, is_admin')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      setIsAdmin(adminOk);

      const { data, error } = profileResult;
      if (error) {
        console.warn('[profile]', error.message);
        setProfile(null);
        return;
      }

      setProfile(
        data
          ? {
              full_name: data.full_name,
              phone_number: data.phone_number,
              is_verified: Boolean(data.is_verified),
              total_balance: Number(data.total_balance ?? 0),
              is_admin: adminOk || Boolean(data.is_admin),
            }
          : null,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void refreshBalance();
    }, [loadProfile, refreshBalance]),
  );

  const onSelectLanguage = useCallback(
    (code: AppLanguage) => {
      void (async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.language, code);
        await i18n.changeLanguage(code);
        const user = (await supabase.auth.getUser()).data.user;
        if (user?.id) {
          void supabase.from('profiles').update({ preferred_language: code }).eq('id', user.id);
        }
      })();
    },
    [i18n],
  );

  const onDayModeToggle = useCallback(
    (value: boolean) => {
      if (value) {
        setColorScheme('light');
      } else {
        setColorScheme('dark');
      }
    },
    [setColorScheme],
  );

  const dayModeSwitchValue = colorScheme === 'light';

  const onSignOut = () => {
    setSignOutDialogVisible(true);
  };

  const confirmSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[signOut]', error.message);
        showAppAlert('', error.message || t('auth.errorGeneric'));
        return;
      }
      setSignOutDialogVisible(false);
      router.replace('/(auth)/login' as Href);
    } catch (e) {
      console.error('[signOut] unexpected', e);
      showAppAlert('', t('auth.errorGeneric'));
    } finally {
      setSigningOut(false);
    }
  };

  const openSupport = () => {
    router.push('/(tabs)/profile/support');
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const currentLang = parseAppLanguage(i18n.language);
  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;
  const verified = profile?.is_verified === true;
  const nameDisplay = displayName(profile?.full_name, email, t('profile.fallbackName'));
  const displayBalance =
    liveBalance != null ? liveBalance : profile != null ? profile.total_balance : null;
  const balanceDisplay =
    displayBalance != null ? displayBalance.toLocaleString(numberLocale) : '—';

  const chevronName = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      {/* Profile header — standalone rounded container */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
        }}>
        <View
          className="overflow-hidden px-5 pb-8"
          style={{
            backgroundColor: BRAND_NAVY,
            borderRadius: 20,
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 8,
          }}>
          <View className="mb-4 items-center pt-4">
            <RiwaqLogo compact onDark />
          </View>
          {loading ? (
            <View className="min-h-[120px] items-center justify-center py-8">
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View>
              <View className="mt-2 flex-row-reverse items-center gap-4">
                <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/20">
                  {profile?.full_name ? (
                    <Text className="font-cairo-bold text-3xl text-white">
                      {profile.full_name.trim().charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <MaterialIcons name="person" size={44} color="#fff" />
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-cairo-bold text-2xl text-white"
                    style={{ textAlign: 'right' }}
                    numberOfLines={1}>
                    {nameDisplay}
                  </Text>
                  <Text
                    className="mt-1 font-cairo text-sm text-white/90"
                    style={{ textAlign: 'right' }}
                    numberOfLines={1}>
                    {email ?? '—'}
                  </Text>
                  <View className="mt-2 flex-row-reverse items-center self-end">
                    <MaterialIcons
                      name={verified ? 'verified' : 'error-outline'}
                      size={16}
                      color={verified ? '#A5D6A7' : '#E0E0E0'}
                    />
                    <View
                      className="ml-1 rounded-full px-2 py-0.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <Text className="font-cairo text-xs text-white">
                        {verified ? t('profile.badgeVerified') : t('profile.badgeUnverified')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="mt-4 w-full border-t border-white/20 pt-4">
                <Text className="font-cairo text-xs text-white/80" style={{ textAlign: 'right' }}>
                  {t('dashboard.totalBalance')}
                </Text>
                <Text className="mt-1 font-cairo-bold text-2xl text-white" style={{ textAlign: 'right' }}>
                  {balanceDisplay}{' '}
                  <Text className="font-cairo-semibold text-lg text-white/95">{t('dashboard.currency')}</Text>
                </Text>
                <Text className="mt-1.5 font-cairo text-[11px] leading-4 text-white/75" style={{ textAlign: 'right' }}>
                  {t('profile.testBalanceDisclaimer')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View>
          {/* Verification card */}
          <View
            className="mb-3 rounded-2xl border p-4"
            style={{ backgroundColor: cardBg, borderColor }}>
            <Text className="mb-3 font-cairo-bold text-lg" style={{ color: mainText, textAlign: 'right' }}>
              {t('profile.verificationStatusTitle')}
            </Text>
            <View className="flex-row-reverse items-start gap-3">
              <MaterialIcons
                name={verified ? 'verified-user' : 'error-outline'}
                size={40}
                color={verified ? BRAND_NAVY : subText}
              />
              <View className="min-w-0 flex-1">
                <Text className="font-cairo-semibold text-base" style={{ color: mainText, textAlign: 'right' }}>
                  {verified ? t('profile.verifiedLabel') : t('profile.unverifiedLabel')}
                </Text>
                <Text className="mt-1 font-cairo text-sm leading-5" style={{ color: subText, textAlign: 'right' }}>
                  {verified ? t('profile.verifiedHint') : t('profile.unverifiedHint')}
                </Text>
              </View>
            </View>
            {!verified ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/profile/verification')}
                className="mt-4 w-full rounded-xl py-3.5 active:opacity-90"
                style={{ backgroundColor: BRAND_NAVY }}>
                <Text className="text-center font-cairo-bold text-base text-white">
                  {t('profile.startVerification')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Language & appearance */}
          <View
            className="mb-3 rounded-2xl border p-4"
            style={{ backgroundColor: cardBg, borderColor }}>
            <View className="mb-3 flex-row-reverse items-center gap-2">
              <MaterialIcons name="language" size={22} color={BRAND_NAVY} />
              <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                {t('language.sectionLabel')}
              </Text>
            </View>
            {LANGUAGES.map((code) => {
              const isSelected = currentLang === code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelectLanguage(code)}
                  className="mb-2 w-full flex-row-reverse items-center justify-between rounded-xl border-2 px-4 py-3.5"
                  style={{
                    borderColor: isSelected ? BRAND_NAVY : isDark ? '#3a3a3c' : '#e5e7eb',
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(21,67,117,0.35)'
                        : '#F0F4F8'
                      : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#f9fafb',
                  }}>
                  <Text
                    className={`flex-1 text-lg ${isSelected ? 'font-cairo-semibold' : 'font-cairo'}`}
                    style={{ color: isSelected ? BRAND_NAVY : mainText, textAlign: 'right' }}>
                    {t(`language.names.${code}`)}
                  </Text>
                  {isSelected ? (
                    <MaterialIcons name="check" size={22} color="#C9A227" />
                  ) : (
                    <View className="w-6" />
                  )}
                </Pressable>
              );
            })}

            <View className="my-3 h-px" style={{ backgroundColor: borderColor }} />

            <View className="flex-row-reverse items-center justify-between">
              <View className="flex-row-reverse items-center gap-2">
                <MaterialIcons name="light-mode" size={22} color={BRAND_NAVY} />
                <Text className="font-cairo text-base" style={{ color: mainText, textAlign: 'right' }}>
                  {t('profile.dayMode')}
                </Text>
              </View>
              <Switch
                value={dayModeSwitchValue}
                onValueChange={onDayModeToggle}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={dayModeSwitchValue ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Settings */}
          <Text className="mb-2 px-1 font-cairo text-xs" style={{ color: sectionLabel, textAlign: 'right' }}>
            {t('profile.settingsSection')}
          </Text>
          <View
            className="mb-3 overflow-hidden rounded-2xl border"
            style={{ backgroundColor: cardBg, borderColor }}>
            {isAdmin ? (
              <MenuRow
                label={t('profile.adminVerificationMenu')}
                icon="verified-user"
                onPress={() => router.push('/(tabs)/profile/admin-verification')}
                chevronName={chevronName}
                mainText={mainText}
                subText={subText}
                borderColor={borderColor}
              />
            ) : null}
            {isAdmin ? (
              <MenuRow
                label={t('profile.addProjectMenu')}
                icon="add-business"
                onPress={() => router.push('/(tabs)/profile/add-project' as Href)}
                chevronName={chevronName}
                mainText={mainText}
                subText={subText}
                borderColor={borderColor}
              />
            ) : null}
            <MenuRow
              label={t('profile.personalInfo')}
              icon="person-outline"
              onPress={() => router.push('/(tabs)/profile/personal-info')}
              chevronName={chevronName}
              mainText={mainText}
              subText={subText}
              borderColor={borderColor}
            />
            <MenuRow
              label={t('profile.notificationSettings')}
              icon="notifications-none"
              onPress={() => router.push('/(tabs)/profile/notification-settings')}
              chevronName={chevronName}
              mainText={mainText}
              subText={subText}
              borderColor={borderColor}
              isLast={false}
            />
            <MenuRow
              label={t('profile.security')}
              icon="lock-outline"
              onPress={() => router.push('/(tabs)/profile/security')}
              chevronName={chevronName}
              mainText={mainText}
              subText={subText}
              borderColor={borderColor}
              isLast
            />
          </View>

          {/* Help */}
          <Text className="mb-2 px-1 font-cairo text-xs" style={{ color: sectionLabel, textAlign: 'right' }}>
            {t('profile.helpSection')}
          </Text>
          <View
            className="mb-4 overflow-hidden rounded-2xl border"
            style={{ backgroundColor: cardBg, borderColor }}>
            <MenuRow
              label={t('profile.faq')}
              icon="help-outline"
              onPress={() => router.push('/(tabs)/profile/faq')}
              chevronName={chevronName}
              mainText={mainText}
              subText={subText}
              borderColor={borderColor}
            />
            <MenuRow
              label={t('profile.contactSupport')}
              icon="mail-outline"
              onPress={openSupport}
              chevronName={chevronName}
              mainText={mainText}
              subText={subText}
              borderColor={borderColor}
              isLast
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={onSignOut}
            className="mb-4 w-full flex-row-reverse items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-transparent py-3.5 active:opacity-90 disabled:opacity-60 dark:border-red-800"
            style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
            {signingOut ? (
              <ActivityIndicator color="#C62828" />
            ) : (
              <>
                <MaterialIcons name="logout" size={22} color="#C62828" />
                <Text className="font-cairo-semibold text-base text-red-700 dark:text-red-400">
                  {t('auth.signOut')}
                </Text>
              </>
            )}
          </Pressable>

          <Text className="text-center font-cairo text-xs" style={{ color: sectionLabel }}>
            Riwaq Invest v{version}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={signOutDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!signingOut) setSignOutDialogVisible(false);
        }}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/45 px-6"
          onPress={() => {
            if (!signingOut) setSignOutDialogVisible(false);
          }}>
          <Pressable
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white px-5 py-5 dark:bg-[#1c1c1e]"
            onPress={(e) => e.stopPropagation()}
            style={Platform.OS === 'web' ? { cursor: 'default' } : undefined}>
            <Text
              className="text-center font-cairo-bold text-lg text-brand-navy dark:text-white"
              style={{ writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}>
              {t('auth.signOutConfirmTitle')}
            </Text>
            <Text
              className="mt-3 text-center font-cairo text-sm leading-6 text-gray-600 dark:text-gray-300"
              style={{ writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}>
              {t('auth.signOutConfirmMessage')}
            </Text>
            <View className="mt-5 flex-row-reverse gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={signingOut}
                onPress={() => void confirmSignOut()}
                className="h-12 flex-1 items-center justify-center rounded-xl bg-red-600 active:opacity-90 disabled:opacity-60"
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
                {signingOut ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-cairo-bold text-base text-white">{t('auth.signOut')}</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={signingOut}
                onPress={() => setSignOutDialogVisible(false)}
                className="h-12 flex-1 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 active:opacity-90 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800"
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
                <Text className="font-cairo-semibold text-base text-gray-800 dark:text-gray-100">
                  {t('auth.alertCancel')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({
  label,
  icon,
  onPress,
  chevronName,
  mainText,
  subText,
  borderColor,
  isLast = false,
}: {
  label: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  chevronName: 'chevron-back' | 'chevron-forward';
  mainText: string;
  subText: string;
  borderColor: string;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row-reverse items-center justify-between px-4 py-3.5 active:bg-black/5 dark:active:bg-white/5"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: borderColor } : undefined}>
      <View className="flex-row-reverse items-center gap-3">
        <MaterialIcons name={icon} size={22} color={subText} />
        <Text className="font-cairo text-base" style={{ color: mainText, textAlign: 'right' }}>
          {label}
        </Text>
      </View>
      <Ionicons name={chevronName} size={20} color={subText} />
    </Pressable>
  );
}
