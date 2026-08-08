import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PORTFOLIO_CHART_COLORS,
  PortfolioDonutChart,
} from '@/components/portfolio/PortfolioDonutChart';
import { PaymentDetailsPanel } from '@/components/payments/PaymentDetailsPanel';
import { formatFundingShort } from '@/components/projects/ProjectCard';
import { shareReturnsStatementPdf } from '@/lib/returnsStatementPdf';
import { showWithdrawFlow } from '@/lib/withdrawFlow';
import { supabase } from '@/lib/supabase';

const HEADER_BLUE = '#004080';
const GOLD = '#C5A048';

type ProjectJoin = {
  id: string;
  title: string | null;
  location: string | null;
  cover_image_url: string | null;
  expected_return: number | string | null;
  investment_progress: number | string | null;
  status: string | null;
};

type InvestmentRow = {
  id: string;
  amount: number | string;
  status: string;
  invested_at: string;
  project_id: string;
  projects: ProjectJoin | ProjectJoin[] | null;
};

type AggregatedHolding = {
  projectId: string;
  invested: number;
  project: ProjectJoin | null;
  gain: number;
  currentValue: number;
  progress: number;
};

function unwrapProject(p: ProjectJoin | ProjectJoin[] | null | undefined): ProjectJoin | null {
  if (p == null) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeGain(
  amount: number,
  expectedReturnPct: number,
  projectProgress: number,
): number {
  const p = Math.min(100, Math.max(0, projectProgress)) / 100;
  return Math.round(amount * (expectedReturnPct / 100) * p);
}

function aggregateInvestments(rows: InvestmentRow[]): AggregatedHolding[] {
  const map = new Map<string, AggregatedHolding>();

  for (const row of rows) {
    if (row.status !== 'confirmed') continue;
    const project = unwrapProject(row.projects);
    const amount = num(row.amount);
    if (amount <= 0) continue;

    const expected = num(project?.expected_return);
    const progress = num(project?.investment_progress);
    const gain = computeGain(amount, expected, progress);
    const currentValue = amount + gain;

    const existing = map.get(row.project_id);
    if (existing) {
      existing.invested += amount;
      existing.gain += gain;
      existing.currentValue += currentValue;
      existing.progress = progress;
    } else {
      map.set(row.project_id, {
        projectId: row.project_id,
        invested: amount,
        project,
        gain,
        currentValue,
        progress,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.invested - a.invested);
}

function cardShadow() {
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  } as const;
}

export default function PortfolioScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [holdings, setHoldings] = useState<AggregatedHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailures, setImageFailures] = useState<Record<string, boolean>>({});
  const [listTab, setListTab] = useState<'active' | 'completed'>('active');
  const [fundMethod, setFundMethod] = useState<'transfer' | 'ccp'>('transfer');
  const [returnsDownloadLoading, setReturnsDownloadLoading] = useState(false);
  const returnsDownloadBusyRef = useRef(false);

  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;

  const loadInvestments = useCallback(async () => {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setHoldings([]);
      return;
    }

    const { data, error: qError } = await supabase
      .from('investments')
      .select(
        `
        id,
        amount,
        status,
        invested_at,
        project_id,
        projects (
          id,
          title,
          location,
          cover_image_url,
          expected_return,
          investment_progress,
          status
        )
      `,
      )
      .eq('user_id', user.id)
      .order('invested_at', { ascending: false });

    if (qError) {
      setHoldings([]);
      setError(qError.message);
      return;
    }

    const rows = (data ?? []) as InvestmentRow[];
    setHoldings(aggregateInvestments(rows));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await loadInvestments();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadInvestments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvestments();
    setRefreshing(false);
  }, [loadInvestments]);

  const onDownloadReturnsStatement = useCallback(async () => {
    if (returnsDownloadBusyRef.current) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Toast.show({
        type: 'info',
        text1: t('portfolio.exportRequiresLogin'),
        position: 'bottom',
      });
      return;
    }

    returnsDownloadBusyRef.current = true;
    setReturnsDownloadLoading(true);
    Toast.show({
      type: 'info',
      text1: t('portfolio.returnsPdfGenerating'),
      position: 'bottom',
    });
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[RiwaqInvest] profile fetch for returns PDF', profileError);
      }

      const nameFromProfile = profile?.full_name?.trim();
      const investorName =
        nameFromProfile ||
        (typeof user.email === 'string' ? user.email.split('@')[0] : '') ||
        t('profile.fallbackName');

      const rows = holdings.map((h) => ({
        projectTitle: h.project?.title?.trim() || t('portfolio.unknownProject'),
        invested: h.invested,
        gain: h.gain,
      }));

      await shareReturnsStatementPdf({
        investorName,
        rows,
        locale: i18n.language,
        numberLocale,
        currency: t('dashboard.currency'),
        labels: {
          docTitle: t('portfolio.downloadTitle'),
          heading: t('portfolio.returnsPdfHeading'),
          investorLabel: t('portfolio.returnsPdfInvestor'),
          issuedLabel: t('portfolio.returnsPdfIssued'),
          colProject: t('portfolio.returnsPdfColProject'),
          colInvested: t('portfolio.returnsPdfColInvested'),
          colProfit: t('portfolio.returnsPdfColProfit'),
          emptyMessage: t('portfolio.returnsPdfEmpty'),
          brandAlt: t('portfolio.pdfBrandAlt'),
          footerLine: t('portfolio.pdfFooterReturns'),
          summaryTitle: t('portfolio.returnsPdfSummaryTitle'),
          summaryLabelInvested: t('portfolio.returnsPdfSummaryInvested'),
          summaryLabelProfit: t('portfolio.returnsPdfSummaryProfit'),
          summaryLabelCurrent: t('portfolio.returnsPdfSummaryCurrent'),
        },
      });

      if (Platform.OS === 'web') {
        Toast.show({
          type: 'info',
          text1: t('portfolio.returnsPdfWebHint'),
          position: 'bottom',
        });
      }
    } catch (e) {
      console.error('[RiwaqInvest] returns statement PDF failed', {
        errorMessage: e instanceof Error ? e.message : String(e),
        error: e,
      });
      Toast.show({
        type: 'error',
        text1: t('portfolio.returnsPdfFailed'),
        position: 'bottom',
      });
    } finally {
      returnsDownloadBusyRef.current = false;
      setReturnsDownloadLoading(false);
    }
  }, [t, i18n.language, numberLocale, holdings]);

  const totals = useMemo(() => {
    let invested = 0;
    let gain = 0;
    for (const h of holdings) {
      invested += h.invested;
      gain += h.gain;
    }
    const current = invested + gain;
    const growthPct = invested > 0 ? (gain / invested) * 100 : 0;
    return { invested, gain, current, growthPct };
  }, [holdings]);

  const activeHoldings = useMemo(
    () => holdings.filter((h) => h.progress < 100),
    [holdings],
  );
  const completedHoldings = useMemo(
    () => holdings.filter((h) => h.progress >= 100),
    [holdings],
  );

  const visibleHoldings = listTab === 'active' ? activeHoldings : completedHoldings;

  const chartSlices = useMemo(
    () =>
      holdings
        .filter((h) => h.invested > 0)
        .map((h) => ({ key: h.projectId, value: h.invested })),
    [holdings],
  );

  const onHeaderBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const formatCompact = (n: number) =>
    `${formatFundingShort(n, numberLocale)} ${t('dashboard.currency')}`;

  const formatSignedProfit = (n: number) => {
    const sign = n >= 0 ? '+' : '';
    return `${sign}${formatFundingShort(Math.abs(n), numberLocale)} ${t('dashboard.currency')}`;
  };

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={HEADER_BLUE} />
        }>
        {/* Blue header + summary */}
        <View style={{ paddingTop: insets.top + 8, backgroundColor: HEADER_BLUE }}>
          <View className="flex-row items-center px-4 pb-3">
            <Pressable
              onPress={onHeaderBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('projectDetails.back')}
              style={{ width: 40 }}>
              <Ionicons name="chevron-back" size={24} color="#fff" style={{ marginTop: 2 }} />
            </Pressable>
            <Text className="flex-1 text-center font-cairo-bold text-xl text-white">
              {t('screens.portfolioTitle')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View className="flex-row gap-2 px-3 pb-5">
            <View className="min-h-[92px] flex-1 rounded-xl bg-white px-2 py-3">
              <Text className="text-center font-cairo text-xs text-muted-label">
                {t('portfolio.summaryInvested')}
              </Text>
              <Text
                className="mt-2 text-center font-cairo-bold text-base text-neutral-900"
                numberOfLines={1}
                adjustsFontSizeToFit>
                {formatCompact(totals.invested)}
              </Text>
            </View>
            <View className="min-h-[92px] flex-1 rounded-xl bg-white px-2 py-3">
              <Text className="text-center font-cairo text-xs text-muted-label">
                {t('portfolio.summaryCurrent')}
              </Text>
              <Text
                className="mt-2 text-center font-cairo-bold text-base text-neutral-900"
                numberOfLines={1}
                adjustsFontSizeToFit>
                {formatCompact(totals.current)}
              </Text>
            </View>
            <Pressable
              onPress={() => showWithdrawFlow(t)}
              accessibilityRole="button"
              accessibilityLabel={t('portfolio.withdrawButton')}
              className="min-h-[92px] flex-1 rounded-xl bg-white px-2 py-3 active:opacity-90">
              <Text className="text-center font-cairo text-xs text-muted-label">
                {t('portfolio.summaryReturns')}
              </Text>
              <Text
                className="mt-1 text-center font-cairo-bold text-sm"
                style={{ color: GOLD }}
                numberOfLines={1}>
                {totals.invested > 0
                  ? `${totals.growthPct >= 0 ? '' : '-'}${Math.abs(totals.growthPct).toFixed(2)}% ${
                      totals.growthPct >= 0 ? '↑' : '↓'
                    }`
                  : '—'}
              </Text>
              <Text
                className="mt-0.5 text-center font-cairo-semibold text-xs"
                style={{ color: GOLD }}
                numberOfLines={1}>
                {totals.invested > 0 ? formatSignedProfit(totals.gain) : '—'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => showWithdrawFlow(t)}
            accessibilityRole="button"
            accessibilityLabel={t('portfolio.withdrawButton')}
            className="mx-3 mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/15 px-4 py-3 active:opacity-90">
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text className="font-cairo-bold text-sm text-white">{t('portfolio.withdrawButton')}</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-4">
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color={HEADER_BLUE} />
            </View>
          ) : error ? (
            <Text className="text-right font-cairo text-sm text-red-600">{t('portfolio.loadError')}</Text>
          ) : (
            <>
              {/* Performance chart */}
              <View className="rounded-2xl bg-white p-4" style={cardShadow()}>
                <View className="mb-3 flex-row items-center gap-2">
                  <Text className="flex-1 text-start font-cairo-bold text-base text-neutral-900">
                    {t('portfolio.performanceTitle')}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={HEADER_BLUE} />
                </View>
                {chartSlices.length === 0 ? (
                  <Text className="py-6 text-center font-cairo text-sm text-muted-label">
                    {t('portfolio.chartEmpty')}
                  </Text>
                ) : (
                  <View className="items-center">
                    <PortfolioDonutChart slices={chartSlices} size={200} />
                    <View className="mt-4 w-full gap-2">
                      {holdings
                        .filter((h) => h.invested > 0)
                        .map((h, idx) => {
                          const title =
                            h.project?.title?.trim() || t('portfolio.unknownProject');
                          const color = PORTFOLIO_CHART_COLORS[idx % PORTFOLIO_CHART_COLORS.length];
                          return (
                            <View key={h.projectId} className="flex-row items-center gap-2">
                              <Text
                                className="flex-1 text-start font-cairo text-sm text-neutral-800"
                                numberOfLines={1}>
                                {title}
                              </Text>
                              <View
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </View>
                          );
                        })}
                    </View>
                  </View>
                )}
              </View>

              {/* Download statement */}
              <Pressable
                onPress={() => void onDownloadReturnsStatement()}
                disabled={returnsDownloadLoading}
                accessibilityRole="button"
                accessibilityState={{ busy: returnsDownloadLoading }}
                className="relative mt-4 flex-row items-center overflow-hidden rounded-2xl px-4 py-4"
                style={{ backgroundColor: HEADER_BLUE }}>
                {returnsDownloadLoading ? (
                  <View
                    className="absolute inset-0 z-10 items-center justify-center"
                    style={{ backgroundColor: HEADER_BLUE }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
                <Ionicons name="document-text-outline" size={28} color="#fff" />
                <View className="flex-1 px-3">
                  <Text className="text-center font-cairo-bold text-base text-white">
                    {t('portfolio.downloadTitle')}
                  </Text>
                  <Text className="mt-0.5 text-center font-cairo text-xs text-white/85">
                    {t('portfolio.downloadSubtitle')}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={26} color="#fff" />
              </Pressable>

              <View className="mt-4 rounded-2xl bg-white p-4" style={cardShadow()}>
                <Text className="text-right font-cairo-bold text-base text-neutral-900">
                  {t('wallet.fundWalletTitle')}
                </Text>
                <Text className="mt-1 text-right font-cairo text-xs leading-5 text-muted-label">
                  {t('wallet.fundWalletHint')}
                </Text>

                <View className="mt-3 flex-row gap-2 rounded-2xl bg-[#E8ECF0] p-1">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFundMethod('transfer')}
                    className={`flex-1 rounded-xl py-2.5 ${
                      fundMethod === 'transfer' ? 'bg-white' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`text-center font-cairo-semibold text-xs ${
                        fundMethod === 'transfer' ? 'text-[#004080]' : 'text-muted-label'
                      }`}>
                      {t('wallet.fundMethodBank')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFundMethod('ccp')}
                    className={`flex-1 rounded-xl py-2.5 ${
                      fundMethod === 'ccp' ? 'bg-white' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`text-center font-cairo-semibold text-xs ${
                        fundMethod === 'ccp' ? 'text-[#004080]' : 'text-muted-label'
                      }`}>
                      {t('wallet.fundMethodCcp')}
                    </Text>
                  </Pressable>
                </View>

                <View className="mt-3">
                  <PaymentDetailsPanel
                    variant="light"
                    showRip={fundMethod === 'ccp'}
                  />
                </View>
              </View>

              {/* Filter tabs */}
              <View className="mt-5 rounded-2xl bg-[#E8ECF0] p-1">
                <View className="flex-row gap-1">
                  <Pressable
                    onPress={() => setListTab('active')}
                    className={`flex-1 rounded-xl py-2.5 ${
                      listTab === 'active' ? 'bg-[#DCE9F7]' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`text-center font-cairo-semibold text-sm ${
                        listTab === 'active' ? 'text-[#004080]' : 'text-muted-label'
                      }`}>
                      {t('portfolio.tabActive', { count: activeHoldings.length })}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setListTab('completed')}
                    className={`flex-1 rounded-xl py-2.5 ${
                      listTab === 'completed' ? 'bg-[#DCE9F7]' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`text-center font-cairo-semibold text-sm ${
                        listTab === 'completed' ? 'text-[#004080]' : 'text-muted-label'
                      }`}>
                      {t('portfolio.tabCompleted', { count: completedHoldings.length })}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* List */}
              {holdings.length === 0 ? (
                <Text className="mt-6 text-right font-cairo text-sm text-muted-label">
                  {t('portfolio.empty')}
                </Text>
              ) : visibleHoldings.length === 0 ? (
                <Text className="mt-6 text-right font-cairo text-sm text-muted-label">
                  {listTab === 'active' ? t('portfolio.emptyActive') : t('portfolio.emptyCompleted')}
                </Text>
              ) : (
                <View className="mt-4 gap-3">
                  {visibleHoldings.map((h) => {
                    const title = h.project?.title?.trim() || t('portfolio.unknownProject');
                    const location = h.project?.location?.trim() ?? '';
                    const uri = h.project?.cover_image_url?.trim();
                    const failed = imageFailures[h.projectId];
                    return (
                      <View key={h.projectId} className="rounded-2xl bg-white p-4" style={cardShadow()}>
                        <View className="flex-row gap-3">
                          <View className="flex-1">
                            <Text className="font-cairo-bold text-base text-neutral-900" numberOfLines={2}>
                              {title}
                            </Text>
                            {location ? (
                              <View className="mt-1 flex-row items-center gap-1">
                                <Ionicons name="location-outline" size={14} color="#6B7C93" />
                                <Text className="font-cairo text-xs text-muted-label" numberOfLines={1}>
                                  {location}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {uri && !failed ? (
                            <Image
                              source={{ uri }}
                              className="h-[72px] w-[72px] rounded-xl bg-neutral-200"
                              resizeMode="cover"
                              onError={() =>
                                setImageFailures((prev) => ({ ...prev, [h.projectId]: true }))
                              }
                            />
                          ) : (
                            <View className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-brand-icon">
                              <Ionicons name="image-outline" size={28} color="#94a3b8" />
                            </View>
                          )}
                        </View>

                        <View className="mt-3 gap-2 border-t border-neutral-100 pt-3">
                          <View className="flex-row justify-between gap-2">
                            <Text className="font-cairo text-sm text-muted-label">
                              {t('portfolio.rowInvested')}
                            </Text>
                            <Text className="font-cairo-semibold text-sm text-neutral-900">
                              {h.invested.toLocaleString(numberLocale)} {t('dashboard.currency')}
                            </Text>
                          </View>
                          <View className="flex-row justify-between gap-2">
                            <Text className="font-cairo text-sm text-muted-label">
                              {t('portfolio.rowCurrent')}
                            </Text>
                            <Text className="font-cairo-semibold text-sm text-neutral-900">
                              {h.currentValue.toLocaleString(numberLocale)} {t('dashboard.currency')}
                            </Text>
                          </View>
                          <View className="flex-row justify-between gap-2">
                            <Text className="font-cairo text-sm text-muted-label">
                              {t('portfolio.rowReturns')}
                            </Text>
                            <Text className="font-cairo-semibold text-sm" style={{ color: GOLD }}>
                              +{h.gain.toLocaleString(numberLocale)} {t('dashboard.currency')}
                            </Text>
                          </View>
                        </View>

                        <View className="mt-4">
                          <View className="mb-1 flex-row justify-between">
                            <Text className="font-cairo text-xs text-muted-label">
                              {t(
                                h.progress >= 100
                                  ? 'portfolio.statusCompleted'
                                  : 'portfolio.statusInProgress',
                              )}
                            </Text>
                            <Text className="font-cairo-bold text-sm text-[#004080]">
                              {Math.round(h.progress)}%
                            </Text>
                          </View>
                          <View className="h-2 overflow-hidden rounded-full bg-neutral-200">
                            <View
                              className="h-full rounded-full bg-[#004080]"
                              style={{ width: `${Math.min(100, Math.max(0, h.progress))}%` }}
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
