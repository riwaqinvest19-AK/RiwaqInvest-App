import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  I18nManager,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrowthChart } from '@/components/simulator/GrowthChart';
import { cardShadow } from '@/components/projects/ProjectCard';
import {
  buildGrowthSeries,
  RISK_ANNUAL_PCT,
  type RiskLevel,
  simulateCompound,
  SIM_BOUNDS,
} from '@/lib/investmentSimulator';

const BRAND = '#154375';
const GOLD = '#C9A227';
const NAVY_BG = '#0B355E';
const GREEN = '#16a34a';
const RISK_LOW = '#2563eb';
const RISK_HIGH = '#dc2626';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatCompactDzd(n: number, locale: string): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${Math.abs(k - Math.round(k)) < 0.05 ? String(Math.round(k)) : k.toFixed(1)}K`;
  }
  return Math.round(n).toLocaleString(locale);
}

function formatAmountInput(n: number, locale: string) {
  if (n <= 0) return '';
  return Math.round(n).toLocaleString(locale);
}

function formatFullDzd(n: number, locale: string) {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return Math.round(n).toLocaleString(locale);
}

function parseDigits(raw: string): number {
  const d = raw.replace(/\D/g, '');
  if (!d) return 0;
  return clamp(Math.trunc(Number(d)), SIM_BOUNDS.minAmount, SIM_BOUNDS.maxAmount);
}

function durationBadgeText(
  months: number,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  if (months < 12) {
    return t('investmentSimulator.durationBadgeMonths', { count: months });
  }
  if (months % 12 === 0) {
    return t('investmentSimulator.durationBadgeYears', { count: months / 12 });
  }
  const y = Math.floor(months / 12);
  const m = months % 12;
  return t('investmentSimulator.durationBadgeYearsMonths', {
    countYears: y,
    countMonths: m,
  });
}

export default function SimulatorScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;
  const canBack = navigation.canGoBack();

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const [amount, setAmount] = useState(100_000);
  const [months, setMonths] = useState(12);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [amountDigits, setAmountDigits] = useState('100000');

  const annualPct = RISK_ANNUAL_PCT[risk];

  const result = useMemo(
    () => simulateCompound(amount, months, annualPct),
    [amount, months, annualPct],
  );

  const series = useMemo(
    () => buildGrowthSeries(amount, months, annualPct),
    [amount, months, annualPct],
  );

  const amountPresets = useMemo(() => [10_000, 50_000, 100_000, 200_000] as const, []);

  const durationTabs = useMemo(
    () =>
      [
        { months: 6, label: t('investmentSimulator.durationTab6m') },
        { months: 12, label: t('investmentSimulator.durationTab1y') },
        { months: 36, label: t('investmentSimulator.durationTab3y') },
        { months: 60, label: t('investmentSimulator.durationTab5y') },
      ] as const,
    [t],
  );

  const roiOneDecimal = useMemo(
    () => result.returnRatePct.toFixed(1),
    [result.returnRatePct],
  );

  const onAmountSlider = useCallback((v: number) => {
    const rounded = Math.round(v / 1_000) * 1_000;
    const a = clamp(rounded, SIM_BOUNDS.minAmount, SIM_BOUNDS.maxAmount);
    setAmount(a);
    setAmountDigits(String(a));
  }, []);

  const onAmountText = useCallback((x: string) => {
    const d = x.replace(/\D/g, '').slice(0, 9);
    setAmountDigits(d);
    const a = parseDigits(d);
    if (a > 0) setAmount(a);
  }, []);

  const growthRows = useMemo(() => {
    const r = Math.max(0, annualPct) / 100;
    const monthlyFactor = 1 + r / 12;
    const steps = [3, 6, 9, 12, 15, 18];
    const rows: { label: string; value: number; inc: number }[] = [];
    let prev = amount;
    for (const m of steps) {
      const value = amount * Math.pow(monthlyFactor, m);
      const inc = value - prev;
      rows.push({
        label: i18n.language.startsWith('ar') ? `شهر ${m}` : `M${m}`,
        value,
        inc,
      });
      prev = value;
    }
    return rows;
  }, [amount, annualPct, i18n.language]);

  const onCta = useCallback(() => {
    router.push('/(tabs)/properties');
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: NAVY_BG }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View className="mb-4 flex-row items-center">
          <View className="w-10 items-center">
            {canBack ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => router.back()}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Ionicons
                  name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={22}
                  color="#fff"
                />
              </Pressable>
            ) : (
              <View className="h-10 w-10" />
            )}
          </View>
          <View className="min-w-0 flex-1 items-center">
            <Text className="text-center font-cairo-bold text-lg text-white" numberOfLines={1}>
              {t('investmentSimulator.title')}
            </Text>
            <Text className="mt-0.5 text-center font-cairo text-xs text-white/80" numberOfLines={1}>
              {t('investmentSimulator.subtitle')}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        <View className="rounded-[28px] bg-white p-4" style={cardShadow()}>
          <View className="mb-4">
            <Text className="text-right font-cairo text-xs text-slate-500">
              {t('investmentSimulator.expectedTotalReturnTitle')}
            </Text>

            <View
              className="mt-1 flex-row items-end justify-between"
              style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
              <View className="min-w-0 flex-1">
                <View
                  className="flex-row items-baseline gap-2"
                  style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
                  <Text className="font-cairo-bold text-4xl text-brand-navy" numberOfLines={1}>
                    {formatFullDzd(result.futureValue, numberLocale)}
                  </Text>
                  <Text className="font-cairo-semibold text-base text-slate-500">
                    {t('dashboard.currency')}
                  </Text>
                </View>
              </View>

              <View className="shrink-0 gap-2" style={{ alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end' }}>
                <View
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: `${GREEN}14` }}>
                  <Text className="text-right font-cairo text-[10px]" style={{ color: GREEN }}>
                    {t('investmentSimulator.expectedProfit')}
                  </Text>
                  <Text className="text-right font-cairo-bold text-xs" style={{ color: GREEN }}>
                    +{formatCompactDzd(result.profit, numberLocale)} {t('dashboard.currency')}
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: `${GOLD}22` }}>
                  <Text className="text-right font-cairo text-[10px] text-neutral-800">
                    {t('investmentSimulator.summaryRoi')}
                  </Text>
                  <Text className="text-right font-cairo-bold text-xs text-neutral-900">
                    {roiOneDecimal}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text className="mb-2 text-right font-cairo-semibold text-sm text-neutral-900">
            {t('investmentSimulator.amountLabel')}
          </Text>
          <View className="flex-row items-center rounded-2xl bg-[#EEF2F7] px-4 py-3.5">
            <Text className="font-cairo-semibold text-brand-navy">{t('dashboard.currency')}</Text>
            <TextInput
              value={formatAmountInput(amount, numberLocale)}
              onChangeText={onAmountText}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#6B7C93"
              className="min-w-0 flex-1 py-0 text-right font-cairo-semibold text-lg text-neutral-900"
            />
          </View>
          <Slider
            style={{ width: '100%', height: 44, marginTop: 6 }}
            minimumValue={SIM_BOUNDS.minAmount}
            maximumValue={SIM_BOUNDS.maxAmount}
            step={1000}
            value={amount}
            onValueChange={onAmountSlider}
            minimumTrackTintColor={BRAND}
            maximumTrackTintColor="#C5D4E2"
            thumbTintColor={BRAND}
          />

          <View className="mt-2 flex-row gap-2" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            {amountPresets.map((p) => {
              const selected = amount === p;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  onPress={() => {
                    setAmount(p);
                    setAmountDigits(String(p));
                  }}
                  className="min-w-0 flex-1 rounded-xl border px-2 py-2"
                  style={{
                    borderColor: selected ? BRAND : '#E2E8F0',
                    backgroundColor: selected ? BRAND : '#fff',
                  }}>
                  <Text
                    className="text-center font-cairo-bold text-xs"
                    style={{ color: selected ? '#fff' : '#0f172a' }}>
                    {formatCompactDzd(p, numberLocale)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-2 mt-5 text-right font-cairo-semibold text-sm text-neutral-900">
            {t('investmentSimulator.durationLabel')}
          </Text>
          <View className="flex-row overflow-hidden rounded-2xl bg-[#EEF2F7] p-1" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            {durationTabs.map((tab) => {
              const selected = months === tab.months;
              return (
                <Pressable
                  key={tab.months}
                  accessibilityRole="button"
                  onPress={() => setMonths(tab.months)}
                  className="min-w-0 flex-1 rounded-2xl px-2 py-2.5"
                  style={{ backgroundColor: selected ? '#fff' : 'transparent' }}>
                  <Text
                    className="text-center font-cairo-bold text-xs"
                    style={{ color: selected ? BRAND : '#64748b' }}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-3 items-center">
            <View className="rounded-full px-4 py-1.5" style={{ backgroundColor: `${GOLD}22` }}>
              <Text className="font-cairo-bold text-sm text-neutral-900">
                {durationBadgeText(months, t)}
              </Text>
            </View>
          </View>

          <Text className="mb-3 mt-5 text-right font-cairo-semibold text-sm text-neutral-900">
            {t('investmentSimulator.riskTitle')}
          </Text>
          <View className="flex-row gap-2" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            {(
              [
                { id: 'low' as const, color: RISK_LOW, pctKey: 'riskLowPct', labelKey: 'riskLow' },
                { id: 'medium' as const, color: GOLD, pctKey: 'riskMediumPct', labelKey: 'riskMedium' },
                { id: 'high' as const, color: RISK_HIGH, pctKey: 'riskHighPct', labelKey: 'riskHigh' },
              ] as const
            ).map((row) => {
              const selected = risk === row.id;
              return (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  onPress={() => setRisk(row.id)}
                  className="min-w-0 flex-1 rounded-2xl border-2 bg-white px-2 py-3"
                  style={{
                    borderColor: selected ? BRAND : '#E2E8F0',
                    borderWidth: selected ? 3 : 2,
                  }}>
                  <View className="items-center">
                    <Ionicons name="trending-up" size={22} color={row.color} />
                    <Text className="mt-2 text-center font-cairo-bold text-xs text-neutral-900" numberOfLines={1}>
                      {t(`investmentSimulator.${row.labelKey}`)}
                    </Text>
                    <Text className="mt-1 text-center font-cairo-bold text-sm" style={{ color: row.color }}>
                      {t(`investmentSimulator.${row.pctKey}`)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          className="mt-4 overflow-hidden rounded-2xl"
          style={{ backgroundColor: NAVY_BG, ...cardShadow() }}>
          <View
            className="flex-row items-center justify-between px-4 pt-4"
            style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            <View className="flex-row items-center gap-2" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
              <Ionicons name="bar-chart-outline" size={18} color="#fff" />
              <Text className="text-right font-cairo-bold text-base text-white">
                {t('investmentSimulator.resultsSummaryTitle')}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3 px-4" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            <View className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-4">
              <Text className="text-right font-cairo text-xs text-white/75">
                {t('investmentSimulator.resultsNetProfit')}
              </Text>
              <Text className="mt-2 text-right font-cairo-bold text-xl" style={{ color: GREEN }}>
                +{formatCompactDzd(result.profit, numberLocale)} {t('dashboard.currency')}
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-4">
              <Text className="text-right font-cairo text-xs text-white/75">
                {t('investmentSimulator.resultsCapital')}
              </Text>
              <Text className="mt-2 text-right font-cairo-bold text-xl text-white">
                {formatCompactDzd(amount, numberLocale)} {t('dashboard.currency')}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row gap-3 px-4 pb-4" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            <View className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-4">
              <Text className="text-right font-cairo text-xs text-white/75">
                {t('investmentSimulator.resultsMonthlyReturn')}
              </Text>
              <Text className="mt-2 text-right font-cairo-bold text-xl text-white">
                +{formatCompactDzd(result.avgMonthlyProfit, numberLocale)} {t('dashboard.currency')}
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-4">
              <Text className="text-right font-cairo text-xs text-white/75">
                {t('investmentSimulator.resultsReturnPct')}
              </Text>
              <Text className="mt-2 text-right font-cairo-bold text-xl" style={{ color: GOLD }}>
                {Math.round(result.returnRatePct)}%
              </Text>
            </View>
          </View>

          <View
            className="flex-row items-center justify-between px-4 py-3"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
            }}>
            <View className="flex-row items-center gap-2" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
              <Ionicons name="cash-outline" size={18} color={GOLD} />
              <Text className="font-cairo-semibold text-sm text-white">
                {t('investmentSimulator.resultsAnnualRate')}
              </Text>
            </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: `${GOLD}26` }}>
              <Text className="font-cairo-bold text-sm text-white">{annualPct.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View className="mt-4 rounded-2xl bg-white p-4" style={cardShadow()}>
          <Text className="mb-3 text-right font-cairo-bold text-sm text-neutral-900">
            {t('investmentSimulator.chartTitle')}
          </Text>
          <View style={{ direction: 'ltr' }}>
            <GrowthChart
              series={series}
              numberLocale={numberLocale}
              legendLabel={t('investmentSimulator.chartLegend')}
            />
          </View>
        </View>

        <View className="mt-4 rounded-2xl bg-white p-4" style={cardShadow()}>
          <Text className="mb-3 text-right font-cairo-bold text-sm text-neutral-900">
            {t('investmentSimulator.growthTableTitle')}
          </Text>

          <View className="flex-row justify-between px-1" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
            <Text className="font-cairo-semibold text-xs text-slate-500">
              {t('investmentSimulator.growthTablePeriod')}
            </Text>
            <Text className="font-cairo-semibold text-xs text-slate-500">
              {t('investmentSimulator.growthTableValue')}
            </Text>
            <Text className="font-cairo-semibold text-xs text-slate-500">
              {t('investmentSimulator.growthTableIncrease')}
            </Text>
          </View>

          <View className="mt-2 gap-2">
            {growthRows.map((r) => (
              <View
                key={r.label}
                className="flex-row items-center justify-between rounded-2xl bg-[#F5F8FC] px-3 py-3"
                style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
                <Text className="font-cairo-bold text-xs text-neutral-900">{r.label}</Text>
                <Text className="font-cairo-semibold text-xs text-neutral-900">
                  {formatFullDzd(r.value, numberLocale)} {t('dashboard.currency')}
                </Text>
                <Text className="font-cairo-bold text-xs" style={{ color: GREEN }}>
                  +{formatFullDzd(r.inc, numberLocale)} {t('dashboard.currency')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="mt-3 text-center font-cairo text-[11px] leading-4 text-white/70">
          {t('investmentSimulator.disclaimer')}
        </Text>
      </ScrollView>

      <View
        className="px-4"
        style={{ paddingBottom: insets.bottom + 10, backgroundColor: NAVY_BG }}>
        <Pressable
          accessibilityRole="button"
          onPress={onCta}
          className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
          style={{ backgroundColor: BRAND }}>
          <Ionicons name="logo-usd" size={18} color={GOLD} />
          <Text className="font-cairo-bold text-base text-white">{t('investmentSimulator.cta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
