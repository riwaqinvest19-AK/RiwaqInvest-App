import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  I18nManager,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cardShadow,
  formatFundingShort,
  type ProjectRow,
} from '@/components/projects/ProjectCard';
import { showAppChoiceAlert } from '@/lib/showAppAlert';
import { shareProjectDemoPdf } from '@/lib/projectDemoPdf';
import { effectiveMinInvestment } from '@/constants/Investment';
import { checkProfileAdmin } from '@/lib/checkProfileAdmin';
import { supabase } from '@/lib/supabase';

const FAVORITES_KEY = '@riwaq_favorite_project_ids';
const HERO_H = 320;
const BRAND = '#154375';
/** Icons on hero image — solid white chip + dark navy for contrast */
const HERO_ACTION_BG = 'rgba(255, 255, 255, 0.96)';
const HERO_ACTION_ICON = '#0f2d4f';
type DetailTab = 'about' | 'timeline' | 'documents';

function riskLabel(level: string | null | undefined, t: (k: string) => string): string {
  const x = (level || 'low').toLowerCase();
  if (x === 'high') return t('projectDetails.riskHigh');
  if (x === 'medium') return t('projectDetails.riskMedium');
  return t('projectDetails.riskLow');
}

export default function ProjectDetailScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('about');
  const [favorite, setFavorite] = useState(false);
  const [docDownloadLoading, setDocDownloadLoading] = useState(false);
  const [isProfileAdmin, setIsProfileAdmin] = useState(false);
  const docDownloadBusyRef = useRef(false);

  const refreshAdminAccess = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    let uid = sess.session?.user?.id;
    if (!uid) {
      const { data: userData } = await supabase.auth.getUser();
      uid = userData.user?.id;
    }
    if (!uid) {
      setIsProfileAdmin(false);
      return;
    }

    const { isAdmin } = await checkProfileAdmin(uid);
    setIsProfileAdmin(isAdmin);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAdminAccess();
    }, [refreshAdminAccess]),
  );

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setProject(null);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);

    // Full row from public.projects (includes document_url TEXT).
    const { data, error: qError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (qError) {
      setProject(null);
      setError(qError.message);
      return;
    }

    setProject((data ?? null) as ProjectRow | null);
    void refreshAdminAccess();
  }, [id, refreshAdminAccess]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        if (!raw || !id) return;
        const list = JSON.parse(raw) as string[];
        if (!cancelled && Array.isArray(list) && id) {
          setFavorite(list.includes(id));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleFavorite = useCallback(async () => {
    if (!id) return;
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setFavorite(next.includes(id));
    } catch {
      /* ignore */
    }
  }, [id]);

  const onShare = useCallback(async () => {
    if (!project) return;
    try {
      const deepLink = Linking.createURL(`/project/${project.id}`);
      const titleLine = `${project.title}${project.location ? ` — ${project.location}` : ''}`;
      const hint = t('projectDetails.shareDeepLinkHint');
      const message = `${titleLine}\n${deepLink}\n\n${hint}`;
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: deepLink }
          : { message },
      );
    } catch {
      /* ignore */
    }
  }, [project, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    await refreshAdminAccess();
    setRefreshing(false);
  }, [load, refreshAdminAccess]);

  const onDownloadProjectDocument = useCallback(() => {
    if (!project) return;

    const openDemoPdf = () => {
      if (docDownloadBusyRef.current) return;
      docDownloadBusyRef.current = true;
      setDocDownloadLoading(true);
      Toast.show({
        type: 'info',
        text1: t('common.openingDocument'),
        position: 'bottom',
      });

      const title = project.title?.trim() || t('portfolio.unknownProject');
      const description =
        project.description?.trim() || t('projectDetails.documentDemoDescriptionFallback');
      const location = project.location?.trim() ?? '';

      void (async () => {
        try {
          await shareProjectDemoPdf({
            title,
            description,
            location,
            locale: i18n.language,
            labels: {
              sheetTitle: t('projectDetails.documentDemoSheetTitle'),
              previewNote: t('projectDetails.documentDemoPreviewNote'),
              locationLabel: t('projectDetails.documentDemoLocationLabel'),
              wordmark: t('portfolio.pdfWordmark'),
              tagline: t('portfolio.pdfTagline'),
            },
          });
        } catch (e) {
          console.error('[RiwaqInvest] project demo PDF failed', e);
          Toast.show({
            type: 'error',
            text1: t('projectDetails.downloadDocumentFailed'),
            position: 'bottom',
          });
        } finally {
          docDownloadBusyRef.current = false;
          setDocDownloadLoading(false);
        }
      })();
    };

    showAppChoiceAlert(
      t('projectDetails.documentReviewTitle'),
      t('projectDetails.documentReviewMessage'),
      [{ label: t('projectDetails.documentDemoPreview'), onPress: openDemoPdf }],
      t('common.ok'),
    );
  }, [project, t, i18n.language]);

  const progress = project
    ? Math.min(100, Math.max(0, Number(project.investment_progress)))
    : 0;
  const expectedNum =
    project?.expected_return != null ? Number(project.expected_return) : Number.NaN;
  const expectedStr = Number.isFinite(expectedNum)
    ? expectedNum.toLocaleString(numberLocale, { maximumFractionDigits: 2 })
    : '—';

  const goal = project?.target_amount;
  const raised = project?.current_amount;
  const hasFunding =
    project &&
    typeof goal === 'number' &&
    typeof raised === 'number' &&
    Number.isFinite(goal) &&
    Number.isFinite(raised) &&
    goal > 0;

  const remaining =
    hasFunding && raised != null && goal != null ? Math.max(0, goal - raised) : 0;

  const minInv = effectiveMinInvestment(project?.min_investment);

  const months =
    project?.duration_months != null && project.duration_months > 0
      ? project.duration_months
      : 24;

  const goalShort = hasFunding && goal != null ? formatFundingShort(goal, numberLocale) : '—';
  const raisedShort = hasFunding && raised != null ? formatFundingShort(raised, numberLocale) : '—';
  const remainingShort = remaining > 0 ? formatFundingShort(remaining, numberLocale) : '0';

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-[#EEF1F5]">
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : error ? (
          <Text className="mt-8 px-4 text-center font-cairo text-sm text-red-600">
            {t('projectDetails.loadError')}
          </Text>
        ) : !project ? (
          <Text className="mt-8 px-4 text-center font-cairo text-sm text-muted-label">
            {t('projectDetails.notFound')}
          </Text>
        ) : (
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingBottom: insets.bottom + 96,
              }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
              }
              showsVerticalScrollIndicator={false}>
              <View style={{ height: HERO_H }} className="relative w-full bg-slate-300">
                {project.cover_image_url ? (
                  <Image
                    source={{ uri: project.cover_image_url }}
                    className="absolute inset-0 h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="absolute inset-0 items-center justify-center bg-slate-300">
                    <Ionicons name="image-outline" size={56} color="#94a3b8" />
                  </View>
                )}

                <View className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-black/55" />

                <View
                  className="absolute left-0 right-0 z-50 flex-row items-center justify-between px-4"
                  style={{ top: insets.top + 10 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('projectDetails.backA11y')}
                    onPress={() => router.back()}
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={[cardShadow(), { backgroundColor: HERO_ACTION_BG }]}>
                    <Ionicons
                      name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                      size={22}
                      color={HERO_ACTION_ICON}
                    />
                  </Pressable>
                  <View className="flex-row gap-2">
                    {isProfileAdmin ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('projectDetails.editProjectA11y')}
                        onPress={() =>
                          project?.id &&
                          router.push(`/(tabs)/profile/edit-project/${project.id}` as Href)
                        }
                        className="h-11 min-w-[44px] items-center justify-center rounded-full px-3"
                        style={[cardShadow(), { backgroundColor: BRAND }]}>
                        <Text className="font-cairo-bold text-xs text-white">
                          {t('projectDetails.editProject')}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('projectDetails.shareA11y')}
                      onPress={() => void onShare()}
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={[cardShadow(), { backgroundColor: HERO_ACTION_BG }]}>
                      <Ionicons name="share-outline" size={22} color={HERO_ACTION_ICON} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('projectDetails.favoriteA11y')}
                      onPress={() => void toggleFavorite()}
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={[cardShadow(), { backgroundColor: HERO_ACTION_BG }]}>
                      <Ionicons
                        name={favorite ? 'heart' : 'heart-outline'}
                        size={22}
                        color={favorite ? '#e11d48' : HERO_ACTION_ICON}
                      />
                    </Pressable>
                  </View>
                </View>

                <View className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5 pt-2">
                  <View className="mb-3 flex-row flex-wrap justify-end gap-2">
                    <View className="rounded-full bg-brand-navy px-3 py-1.5">
                      <Text className="font-cairo-bold text-xs text-white">
                        {riskLabel(project.risk_level, t)}
                      </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-accent-gold px-3 py-1.5">
                      <Ionicons name="trending-up" size={14} color="#1e293b" />
                      <Text className="ms-1 font-cairo-bold text-xs text-neutral-900">
                        {t('projectDetails.expectedReturnBadge', { pct: expectedStr })}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-right font-cairo-bold text-xl leading-7 text-white">
                    {project.title}
                  </Text>
                  {project.location?.trim() ? (
                    <View className="mt-2 flex-row items-center justify-end gap-1.5">
                      <Text className="font-cairo-semibold text-sm text-white">
                        {project.location.trim()}
                      </Text>
                      <Ionicons name="location-sharp" size={16} color="#fff" />
                    </View>
                  ) : null}
                </View>
              </View>

              <View className="-mt-5 px-4">
                {isProfileAdmin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('projectDetails.editProjectA11y')}
                    onPress={() =>
                      project.id && router.push(`/(tabs)/profile/edit-project/${project.id}` as Href)
                    }
                    className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border-2 border-brand-navy bg-white py-3.5 active:opacity-90"
                    style={cardShadow()}>
                    <Ionicons name="create-outline" size={22} color={BRAND} />
                    <Text className="font-cairo-bold text-base text-brand-navy">
                      {t('projectDetails.editProjectBanner')}
                    </Text>
                  </Pressable>
                ) : null}
                <View className="rounded-2xl bg-white px-4 py-4" style={cardShadow()}>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="shrink-0 font-cairo-bold text-2xl text-brand-navy">
                      {raisedShort}
                    </Text>
                    <Text className="min-w-0 flex-1 text-right font-cairo-semibold text-base text-brand-navy">
                      {t('dashboard.funded', { pct: Math.round(progress) })}
                    </Text>
                  </View>
                  {hasFunding ? (
                    <Text className="mt-2 text-right font-cairo text-xs text-muted-label">
                      {t('projectDetails.fundingGoalLabel', {
                        amount: goalShort,
                      })}
                    </Text>
                  ) : null}
                  <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#D9E2EC]">
                    <View
                      className="h-full rounded-full bg-brand-navy"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  {hasFunding ? (
                    <Text className="mt-2 text-right font-cairo text-xs text-muted-label">
                      {t('projectDetails.remaining', {
                        amount: `${remainingShort} ${t('dashboard.currency')}`,
                      })}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-4 flex-row flex-wrap">
                  <GridStat
                    label={t('projectDetails.gridFundingGoal')}
                    value={`${goalShort} ${t('dashboard.currency')}`}
                    icon="stats-chart-outline"
                  />
                  <GridStat
                    label={t('projectDetails.gridMinInvestment')}
                    value={`${formatFundingShort(minInv, numberLocale)} ${t('dashboard.currency')}`}
                    icon="checkmark-circle-outline"
                  />
                  <GridStat
                    label={t('projectDetails.gridDuration')}
                    value={t('projectDetails.durationMonths', { months })}
                    icon="time-outline"
                  />
                  <GridStat
                    label={t('projectDetails.gridExpectedReturn')}
                    value={t('projectDetails.expectedReturnValue', { pct: expectedStr })}
                    icon="trending-up-outline"
                  />
                </View>

                <View className="mt-5 rounded-full bg-[#E4E9EF] p-1">
                  <View className="flex-row">
                    {(
                      [
                        ['about', t('projectDetails.tabAbout')] as const,
                        ['timeline', t('projectDetails.tabTimeline')] as const,
                        ['documents', t('projectDetails.tabDocuments')] as const,
                      ] as const
                    ).map(([key, label]) => (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        onPress={() => setTab(key)}
                        className={`flex-1 rounded-full py-2.5 ${tab === key ? 'bg-white' : ''}`}
                        style={tab === key ? cardShadow() : undefined}>
                        <Text
                          className={`text-center font-cairo-semibold text-xs ${
                            tab === key ? 'text-neutral-900' : 'text-muted-label'
                          }`}
                          numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View className="mt-5">
                  {tab === 'about' ? (
                    <>
                      <Text className="mb-2 text-right font-cairo-bold text-base text-brand-navy">
                        {t('projectDetails.aboutSectionTitle')}
                      </Text>
                      <Text className="text-right font-cairo text-sm leading-6 text-muted-label">
                        {project.description?.trim()
                          ? project.description.trim()
                          : t('projectDetails.descriptionFallback')}
                      </Text>
                      <Text className="mb-2 mt-5 text-right font-cairo-bold text-base text-brand-navy">
                        {t('projectDetails.riskAnalysisTitle')}
                      </Text>
                      <Text className="text-right font-cairo text-sm leading-6 text-muted-label">
                        {project.risk_analysis?.trim()
                          ? project.risk_analysis.trim()
                          : t('projectDetails.riskAnalysisFallback')}
                      </Text>
                      <View className="mt-4 rounded-xl bg-[#E8EEF4] p-4">
                        <View className="flex-row items-start justify-end gap-3">
                          <View className="min-w-0 flex-1">
                            <Text className="text-right font-cairo-bold text-sm text-brand-navy">
                              {t('projectDetails.verifiedTitle')}
                            </Text>
                            <Text className="mt-1 text-right font-cairo text-xs leading-5 text-muted-label">
                              {t('projectDetails.verifiedNote')}
                            </Text>
                          </View>
                          <Ionicons name="shield-checkmark" size={28} color={BRAND} />
                        </View>
                      </View>
                    </>
                  ) : tab === 'timeline' ? (
                    <Text className="text-right font-cairo text-sm leading-6 text-muted-label">
                      {t('projectDetails.timelinePlaceholder')}
                    </Text>
                  ) : (
                    <View>
                      <Text className="mb-4 text-right font-cairo text-sm leading-6 text-muted-label">
                        {t('projectDetails.documentsDownloadLead')}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ busy: docDownloadLoading }}
                        disabled={docDownloadLoading}
                        onPress={() => void onDownloadProjectDocument()}
                        className="relative overflow-hidden rounded-xl bg-brand-navy px-4 py-4 active:opacity-90">
                        {docDownloadLoading ? (
                          <View className="absolute inset-0 z-10 items-center justify-center bg-brand-navy">
                            <ActivityIndicator color="#ffffff" />
                          </View>
                        ) : null}
                        <View className="flex-row items-center gap-3">
                          <Ionicons name="download-outline" size={26} color="#fff" />
                          <View className="min-w-0 flex-1">
                            <Text className="text-right font-cairo-bold text-base text-white">
                              {t('projectDetails.downloadProjectDocument')}
                            </Text>
                            <Text className="mt-0.5 text-right font-cairo text-xs text-white/85">
                              {t('projectDetails.downloadProjectDocumentHint')}
                            </Text>
                          </View>
                          <Ionicons name="document-text-outline" size={26} color="#fff" />
                        </View>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

              <View className="absolute bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <View className="flex-row items-center gap-3">
                {isProfileAdmin ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('projectDetails.editProjectA11y')}
                    onPress={() =>
                      project.id && router.push(`/(tabs)/profile/edit-project/${project.id}` as Href)
                    }
                    className="h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl border-2 border-brand-navy bg-white active:opacity-90">
                    <Ionicons name="create-outline" size={24} color={BRAND} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/project/invest/${project.id}`)}
                  className="min-w-0 flex-1 items-center rounded-xl bg-brand-navy py-3.5">
                  <Text className="font-cairo-bold text-base text-white">
                    {t('projectDetails.investNow')}
                  </Text>
                </Pressable>
                <View className="items-end pe-1">
                  <Text className="text-right font-cairo text-xs text-muted-label">
                    {t('projectDetails.stickyMinLabel')}
                  </Text>
                  <Text className="text-right font-cairo-bold text-base text-brand-navy">
                    {formatFundingShort(minInv, numberLocale)} {t('dashboard.currency')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function GridStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="w-1/2 p-1.5">
      <View
        className="rounded-2xl border border-slate-200/90 bg-white px-3 py-3"
        style={cardShadow()}>
        <View className="mb-2 flex-row items-center justify-end gap-2">
          <Text className="flex-1 text-right font-cairo text-xs text-muted-label" numberOfLines={2}>
            {label}
          </Text>
          <Ionicons name={icon} size={18} color="#64748b" />
        </View>
        <Text className="text-right font-cairo-bold text-base text-brand-navy">{value}</Text>
      </View>
    </View>
  );
}
