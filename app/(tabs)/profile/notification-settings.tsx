import { Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';
const CARD_BORDER = '#E8ECF0';
const PAGE_BG_LIGHT = '#ffffff';
const PAGE_BG_DARK = '#0a0a0a';

export default function NotificationSettingsScreen() {
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
  const [notifyInvestments, setNotifyInvestments] = useState(true);
  const [notifyAccount, setNotifyAccount] = useState(true);
  const [notifyNews, setNotifyNews] = useState(true);

  const pageBg = isDark ? PAGE_BG_DARK : PAGE_BG_LIGHT;
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const mainText = isDark ? '#f2f2f7' : '#0f172a';
  const subText = isDark ? '#a1a1a6' : '#6B7C93';
  const borderColor = isDark ? '#38383a' : CARD_BORDER;
  const mutedCardBg = isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC';

  const anyEnabled = notifyInvestments || notifyAccount || notifyNews;
  const masterEnabled = anyEnabled;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('notify_investments, notify_account, notify_news')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[notification-settings]', error.message);
        Alert.alert('', t('profile.loadError'));
        return;
      }

      setNotifyInvestments(Boolean(data?.notify_investments ?? true));
      setNotifyAccount(Boolean(data?.notify_account ?? true));
      setNotifyNews(Boolean(data?.notify_news ?? true));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const updateSetting = useCallback(
    async (patch: Partial<{ notify_investments: boolean; notify_account: boolean; notify_news: boolean }>) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        Alert.alert('', t('profile.verificationLoginRequired'));
        return { ok: false as const };
      }

      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) {
        console.warn('[notification-settings] update', error.message);
        Alert.alert('', t('profile.saveError'));
        return { ok: false as const };
      }

      return { ok: true as const };
    },
    [t],
  );

  const updateSettingsBatch = useCallback(
    async (next: { notify_investments: boolean; notify_account: boolean; notify_news: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        Alert.alert('', t('profile.verificationLoginRequired'));
        return { ok: false as const };
      }

      const { error } = await supabase.from('profiles').update(next).eq('id', user.id);
      if (error) {
        console.warn('[notification-settings] update batch', error.message);
        Alert.alert('', t('profile.saveError'));
        return { ok: false as const };
      }

      return { ok: true as const };
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
      <View className="flex-row-reverse items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND_NAVY }}>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          className="p-1">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-center font-cairo-bold text-lg text-white">
          {t('profile.notificationSettingsTitle')}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6">
          <View className="rounded-2xl border p-4" style={{ backgroundColor: cardBg, borderColor }}>
            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator color={BRAND_NAVY} />
              </View>
            ) : (
              <View>
                <View className="flex-row-reverse items-center justify-between">
                  <View className="flex-row-reverse items-center gap-3">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: 'rgba(21,67,117,0.10)' }}>
                      <Ionicons name="notifications-outline" size={22} color={BRAND_NAVY} />
                    </View>
                    <View className="min-w-0">
                      <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                        {t('profile.notifications.instant.title')}
                      </Text>
                      <Text className="font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
                        {t('profile.notifications.instant.subtitle')}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={masterEnabled}
                    onValueChange={async (next) => {
                      const prev = { notifyInvestments, notifyAccount, notifyNews };
                      setNotifyInvestments(next);
                      setNotifyAccount(next);
                      setNotifyNews(next);
                      const res = await updateSettingsBatch({
                        notify_investments: next,
                        notify_account: next,
                        notify_news: next,
                      });
                      if (!res.ok) {
                        setNotifyInvestments(prev.notifyInvestments);
                        setNotifyAccount(prev.notifyAccount);
                        setNotifyNews(prev.notifyNews);
                      }
                    }}
                    trackColor={{ false: '#C8D0DA', true: '#0F3D6E' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#C8D0DA"
                  />
                </View>

                <View className="mt-3 flex-row-reverse items-center gap-2">
                  <Ionicons
                    name={anyEnabled ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={16}
                    color={anyEnabled ? '#1F7A3F' : subText}
                  />
                  <Text className="font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
                    {anyEnabled
                      ? t('profile.notifications.instant.enabled')
                      : t('profile.notifications.instant.disabled')}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Text
            className="mt-6 mb-2 px-1 font-cairo-semibold text-sm"
            style={{ color: subText, textAlign: 'right' }}>
            {t('profile.notifications.customizeTitle')}
          </Text>

          <View className="gap-3">
            <OptionCard
              iconName="trending-up-outline"
              iconBg="#EEF2FF"
              iconColor="#3B5BDB"
              title={t('profile.notifications.options.investmentUpdates.title')}
              description={t('profile.notifications.options.investmentUpdates.description')}
              value={notifyInvestments}
              onToggle={async (next) => {
                const prev = notifyInvestments;
                setNotifyInvestments(next);
                const res = await updateSetting({ notify_investments: next });
                if (!res.ok) setNotifyInvestments(prev);
              }}
              mainText={mainText}
              subText={subText}
              cardBg={cardBg}
              borderColor={borderColor}
            />

            <OptionCard
              iconName="cash-outline"
              iconBg="#FFF7E6"
              iconColor="#C9A227"
              title={t('profile.notifications.options.paymentAlerts.title')}
              description={t('profile.notifications.options.paymentAlerts.description')}
              value={notifyAccount}
              onToggle={async (next) => {
                const prev = notifyAccount;
                setNotifyAccount(next);
                const res = await updateSetting({ notify_account: next });
                if (!res.ok) setNotifyAccount(prev);
              }}
              mainText={mainText}
              subText={subText}
              cardBg={cardBg}
              borderColor={borderColor}
            />

            <OptionCard
              iconName="sparkles-outline"
              iconBg="#E6F0FF"
              iconColor="#2563EB"
              title={t('profile.notifications.options.newOpportunities.title')}
              description={t('profile.notifications.options.newOpportunities.description')}
              value={notifyNews}
              onToggle={async (next) => {
                const prev = notifyNews;
                setNotifyNews(next);
                const res = await updateSetting({ notify_news: next });
                if (!res.ok) setNotifyNews(prev);
              }}
              mainText={mainText}
              subText={subText}
              cardBg={cardBg}
              borderColor={borderColor}
            />
          </View>

          <View
            className="mt-6 rounded-xl border px-4 py-3"
            style={{ backgroundColor: mutedCardBg, borderColor }}>
            <Text className="font-cairo text-xs" style={{ color: subText, textAlign: 'center' }}>
              {t('profile.notifications.autoSaveHint')}
            </Text>
          </View>

          <Pressable accessibilityRole="button" className="mt-4 self-center" onPress={() => void loadSettings()}>
            <Text className="font-cairo text-xs" style={{ color: subText, textAlign: 'center' }}>
              {t('profile.notifications.refresh')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function OptionCard({
  iconName,
  iconBg,
  iconColor,
  title,
  description,
  value,
  onToggle,
  mainText,
  subText,
  cardBg,
  borderColor,
}: {
  iconName: 'trending-up-outline' | 'cash-outline' | 'sparkles-outline';
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: (next: boolean) => void | Promise<void>;
  mainText: string;
  subText: string;
  cardBg: string;
  borderColor: string;
}) {
  return (
    <View className="rounded-2xl border px-4 py-4" style={{ backgroundColor: cardBg, borderColor }}>
      <View className="flex-row-reverse items-center justify-between">
        <View className="flex-row-reverse items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>
          <View className="min-w-0">
            <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
              {title}
            </Text>
            <Text className="mt-0.5 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
              {description}
            </Text>
          </View>
        </View>

        <Switch
          value={value}
          onValueChange={(next) => void onToggle(next)}
          trackColor={{ false: '#C8D0DA', true: '#0F3D6E' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#C8D0DA"
        />
      </View>
    </View>
  );
}
