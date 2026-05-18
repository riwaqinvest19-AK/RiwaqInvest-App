import { Ionicons } from '@expo/vector-icons';
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { useFocusEffect } from '@react-navigation/native';
import { Link, type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountUpAmount } from '@/components/dashboard/CountUpAmount';
import { FloatingAssistantChat } from '@/components/home/FloatingAssistantChat';
import { RiwaqLogo } from '@/components/RiwaqLogo';
import { SocialMediaLinks } from '@/components/SocialMediaLinks';
import { type ProjectRow, ProjectCard } from '@/components/projects/ProjectCard';
import { ensurePushPermission, notifyWalletBalanceIncreaseLocal } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { showWithdrawFlow } from '@/lib/withdrawFlow';
import { useProfileBalance } from '@/lib/useProfileBalance';

const INVESTMENTS_DISPLAY = '430,000';
const RETURNS_DISPLAY = '38,950';
const AVG_RETURN_PCT = '9.05';
function cardShadow() {
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  } as const;
}

export default function HomeDashboardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const { balance: profileBalance } = useProfileBalance();
  const totalBalance = profileBalance ?? 0;
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const notificationsRoute: Href | null = '/(tabs)/profile/notification-settings';
  const prevBalanceRef = useRef<number | null>(null);
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;

  useEffect(() => {
    void ensurePushPermission();
  }, []);

  const loadUserData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setWelcomeName(null);
      prevBalanceRef.current = null;
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const p = profile as { full_name?: string | null } | null;

    const meta =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : '';

    const resolved =
      p?.full_name?.trim() ||
      meta ||
      user.email?.split('@')[0]?.trim() ||
      '';

    setWelcomeName(resolved || t('dashboard.userName'));
  }, [t]);

  useEffect(() => {
    void loadUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUserData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => {
      void loadUserData();
    }, [loadUserData]),
  );

  useEffect(() => {
    const nextBal = profileBalance ?? 0;
    const locale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;
    if (prevBalanceRef.current !== null && nextBal > prevBalanceRef.current) {
      const delta = nextBal - prevBalanceRef.current;
      void notifyWalletBalanceIncreaseLocal(
        t('dashboard.pushReturnsTitle'),
        t('dashboard.pushReturnsBody', { amount: delta.toLocaleString(locale) }),
      );
    }
    if (profileBalance !== null) {
      prevBalanceRef.current = nextBal;
    }
  }, [profileBalance, i18n.language, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError(null);

      const { data, error } = await supabase.from('projects').select('*').eq('status', 'published');

      if (cancelled) return;

      if (error) {
        setProjects([]);
        setProjectsError(error.message);
        setProjectsLoading(false);
        return;
      }

      const rows = (data ?? []) as ProjectRow[];
      rows.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
      setProjects(rows);
      setProjectsLoading(false);
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNotificationsPress = useCallback(() => {
    if (notificationsRoute) {
      router.push(notificationsRoute);
      return;
    }

    Alert.alert(t('common.notice'), 'لا توجد إشعارات حالياً');
  }, [notificationsRoute, router, t]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1 bg-[#EEF1F5]">
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View
          className="overflow-hidden bg-brand-navy px-4 pb-5 pt-4"
          style={{ borderRadius: 20 }}>
        <View className="mb-5 flex-row items-center justify-between gap-2">
          <RiwaqLogo compact onDark />
          <View className="min-w-0 flex-1 items-end">
            <Text className="font-cairo text-sm text-white/90">{t('dashboard.welcomeBack')}</Text>
            <Text className="mt-0.5 font-cairo-bold text-xl text-white" numberOfLines={1}>
              {welcomeName ?? t('dashboard.userName')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/40">
              <Ionicons name="person-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNotificationsPress}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.notificationsA11y')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="relative h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="rounded-3xl bg-white px-5 py-5"
          style={cardShadow()}>
          <Text className="text-right font-cairo text-sm text-muted-label">
            {t('dashboard.totalBalance')}
          </Text>
          <View className="mt-2 flex-row items-baseline justify-end gap-2">
            <CountUpAmount
              target={totalBalance}
              durationMs={1000}
              locale={numberLocale}
              className="font-cairo-bold text-4xl text-neutral-900"
            />
            <Text className="font-cairo-semibold text-lg text-neutral-900">
              {t('dashboard.currency')}
            </Text>
          </View>
          <View className="mt-3 flex-row items-center justify-end gap-1">
            <Ionicons name="arrow-up" size={16} color="#C9A227" />
            <Text className="text-right font-cairo-semibold text-sm text-accent-gold">
              {t('dashboard.avgReturn', { pct: AVG_RETURN_PCT })}
            </Text>
          </View>
        </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
            <StatPill
              label={t('dashboard.totalBalance')}
              value={`${totalBalance.toLocaleString(numberLocale)} ${t('dashboard.currency')}`}
              tone="navy"
            />
            <StatPill
              label={t('dashboard.totalInvestments')}
              value={`${INVESTMENTS_DISPLAY} ${t('dashboard.currency')}`}
              tone="gold"
            />
            <StatPill
              label={t('dashboard.totalReturns')}
              value={`${RETURNS_DISPLAY} ${t('dashboard.currency')}`}
              tone="navy"
              onPress={() => showWithdrawFlow(t)}
            />
          </ScrollView>

          <Text className="mb-3 mt-6 text-right font-cairo-bold text-lg text-neutral-900">
            {t('dashboard.quickActions')}
          </Text>
          <View className="flex-row gap-3">
            <Link href="/(tabs)/properties" asChild>
              <Pressable className="flex-1 rounded-2xl border border-slate-200/90 bg-white px-3 py-4 active:opacity-90" style={cardShadow()}>
                <View className="flex-row-reverse items-center justify-between">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-navy/10">
                    <Ionicons name="business" size={22} color="#154375" />
                  </View>
                  <Text className="flex-1 text-right font-cairo-semibold text-sm text-neutral-900">
                    {t('dashboard.exploreProjects')}
                  </Text>
                </View>
              </Pressable>
            </Link>
            <Link href="/(tabs)/portfolio" asChild>
              <Pressable className="flex-1 rounded-2xl border border-slate-200/90 bg-white px-3 py-4 active:opacity-90" style={cardShadow()}>
                <View className="flex-row-reverse items-center justify-between">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-navy/10">
                    <Ionicons name="pie-chart-outline" size={22} color="#154375" />
                  </View>
                  <Text className="flex-1 text-right font-cairo-semibold text-sm text-neutral-900">
                    {t('dashboard.myPortfolio')}
                  </Text>
                </View>
              </Pressable>
            </Link>
          </View>

          <View className="mt-8 flex-row items-center justify-between">
            <Text className="font-cairo-bold text-lg text-neutral-900">
              {t('dashboard.featuredProjects')}
            </Text>
            <Link href="/(tabs)/properties" asChild>
              <Pressable>
                <Text className="font-cairo-semibold text-sm text-brand-navy">
                  {t('dashboard.viewAll')} ›
                </Text>
              </Pressable>
            </Link>
          </View>

          {projectsLoading ? (
            <View className="mt-6 items-center py-10">
              <ActivityIndicator size="small" color="#154375" />
            </View>
          ) : projectsError ? (
            <Text className="mt-4 text-right font-cairo text-sm text-red-600">
              {t('dashboard.projectsLoadError')}
            </Text>
          ) : projects.length === 0 ? (
            <Text className="mt-4 text-right font-cairo text-sm text-muted-label">
              {t('dashboard.noProjects')}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3 -mx-4"
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}>
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  href={`/project/${p.id}`}
                  project={p}
                  numberLocale={numberLocale}
                  t={t}
                />
              ))}
            </ScrollView>
          )}

          <View
            className="mt-8 rounded-2xl border border-slate-200/90 bg-white px-4 py-5"
            style={cardShadow()}>
            <SocialMediaLinks showTitle titleAlign="center" />
          </View>
        </View>
      </ScrollView>
      <FloatingAssistantChat />
    </View>
  );
}

function StatPill({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  tone: 'navy' | 'gold';
  onPress?: () => void;
}) {
  const dotClass = tone === 'navy' ? 'bg-brand-navy' : 'bg-accent-gold';
  const inner = (
    <>
      <View className={`mb-3 h-9 w-9 self-start rounded-full ${dotClass}`} />
      <Text className="text-right font-cairo text-xs text-muted-label">{label}</Text>
      <Text className="mt-1 text-right font-cairo-bold text-sm text-neutral-900">{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="min-w-[140px] rounded-2xl bg-white px-4 py-4 active:opacity-90"
        style={cardShadow()}>
        {inner}
      </Pressable>
    );
  }

  return (
    <View className="min-w-[140px] rounded-2xl bg-white px-4 py-4" style={cardShadow()}>
      {inner}
    </View>
  );
}
