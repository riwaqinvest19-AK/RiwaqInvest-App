import { Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  I18nManager,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ProjectRow, cardShadow } from '@/components/projects/ProjectCard';
import { effectiveMinInvestment } from '@/constants/Investment';
import { handleInvestment } from '@/lib/investInProject';
import { notifyInvestmentSuccessLocal } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { useProfileBalance } from '@/lib/useProfileBalance';

const BRAND = '#154375';
const MUTED = '#6B7C93';
const STEP_INACTIVE = 'rgba(255,255,255,0.35)';
const CONTINUE_BG = '#6B8AA8';
const FEE_PCT = 2;
const SUCCESS_GREEN = '#22c55e';
const CARD_HEADER_TOP = '#0B355E';
const CARD_HEADER_BOTTOM = '#0d4d3e';
const CARD_PLASTIC = '#1a5c4a';

type PayMethod = 'card' | 'transfer' | 'ccp';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function formatCardGroups(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 16);
  const parts = d.match(/.{1,4}/g) ?? [];
  return parts.join(' ');
}

function formatExpiryDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Strips non-digits, caps MM at 12 when two month digits are present (MMYY). */
function normalizeExpiryDigits(rawInput: string): string {
  let d = rawInput.replace(/\D/g, '').slice(0, 4);
  if (d.length >= 2) {
    let mm = parseInt(d.slice(0, 2), 10);
    if (!Number.isFinite(mm)) mm = 0;
    if (mm > 12) mm = 12;
    const mmStr = mm.toString().padStart(2, '0');
    d = mmStr + d.slice(2);
  }
  return d;
}

function getCardValidationError(
  cardNumber: string,
  expiryRaw: string,
  cvv: string,
  name: string,
  t: (k: string) => string,
): string | null {
  if (cardNumber.length !== 16) return t('invest.invalidCardNumber');
  if (expiryRaw.length !== 4) return t('invest.invalidExpiry');
  const mm = parseInt(expiryRaw.slice(0, 2), 10);
  if (mm < 1 || mm > 12) return t('invest.invalidExpiry');
  const yy = parseInt(expiryRaw.slice(2, 4), 10);
  if (!Number.isFinite(yy)) return t('invest.invalidExpiry');
  const fullYear = 2000 + yy;
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  if (fullYear < curYear || (fullYear === curYear && mm < curMonth)) {
    return t('invest.expiryInPast');
  }
  if (cvv.length !== 3) return t('invest.invalidCvv');
  if (name.trim().length < 2) return t('invest.invalidCardholder');
  return null;
}

function parseAmountDigits(digits: string): number {
  if (!digits) return 0;
  const n = Math.trunc(Number(digits));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function InvestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const [project, setProject] = useState<ProjectRow | null>(null);
  const { balance: profileBalance, refresh: refreshBalance } = useProfileBalance();
  const balance = profileBalance;
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [amountDigits, setAmountDigits] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cardDigits, setCardDigits] = useState('');
  const [expiryRaw, setExpiryRaw] = useState('');
  const [cvvDigits, setCvvDigits] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setProject(null);
      setLoading(false);
      return;
    }
    setError(null);
    const pRes = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    if (pRes.error) {
      setProject(null);
    } else {
      setProject((pRes.data ?? null) as ProjectRow | null);
    }
    await refreshBalance();
  }, [id, refreshBalance]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void refreshBalance();
    }, [refreshBalance]),
  );

  const minInv = useMemo(
    () => effectiveMinInvestment(project?.min_investment),
    [project?.min_investment],
  );

  const months = useMemo(() => {
    const m = project?.duration_months;
    if (m != null && m > 0) return m;
    return 24;
  }, [project]);

  const amount = useMemo(() => parseAmountDigits(amountDigits), [amountDigits]);
  const fee = useMemo(() => Math.round(amount * (FEE_PCT / 100)), [amount]);
  const total = useMemo(() => amount + fee, [amount, fee]);

  const expectedNum =
    project?.expected_return != null ? Number(project.expected_return) : Number.NaN;
  const expectedStr = Number.isFinite(expectedNum)
    ? expectedNum.toLocaleString(numberLocale, { maximumFractionDigits: 2 })
    : '—';

  const showBelowMinimumAlert = useCallback(() => {
    const formatted = minInv.toLocaleString(numberLocale);
    Alert.alert('', t('invest.belowMinAlert', { amount: formatted }));
    setError(t('invest.belowMin', { amount: formatted }));
  }, [minInv, numberLocale, t]);

  const onContinue = useCallback(() => {
    if (amount <= 0) {
      setError(t('projectDetails.invalidAmount'));
      return;
    }
    if (amount < minInv) {
      showBelowMinimumAlert();
      return;
    }
    setError(null);
    setStep(2);
  }, [amount, minInv, showBelowMinimumAlert, t]);

  const onConfirm = useCallback(async () => {
    if (!project || submitting) return;
    if (amount <= 0 || amount < minInv) {
      showBelowMinimumAlert();
      return;
    }
    if (payMethod === 'card') {
      const onlyDigits = cardDigits.replace(/\D/g, '');
      const ve = getCardValidationError(
        onlyDigits,
        expiryRaw.replace(/\D/g, ''),
        cvvDigits.replace(/\D/g, ''),
        cardholderName,
        t,
      );
      if (ve) {
        setError(ve);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    await sleep(2000);

    let walletBalance = balance;
    if (walletBalance == null) {
      walletBalance = (await refreshBalance()) ?? null;
    }
    if (walletBalance != null && walletBalance < total) {
      setSubmitting(false);
      setError(t('projectDetails.insufficientBalance'));
      return;
    }

    const result = await handleInvestment(project.id, amount);
    setSubmitting(false);

    if (!result.ok) {
      if (result.code === 'INSUFFICIENT_BALANCE') {
        setError(t('projectDetails.insufficientBalance'));
      } else if (result.code === 'BELOW_MINIMUM' || result.code === 'INVALID_AMOUNT') {
        showBelowMinimumAlert();
      } else {
        setError(t('invest.investFailed'));
      }
      return;
    }

    void notifyInvestmentSuccessLocal(
      t('invest.pushSuccessTitle'),
      t('invest.pushSuccessBody', {
        project: project.title,
        amount: amount.toLocaleString(numberLocale),
      }),
    );
    void refreshBalance();
    setSuccess(true);
  }, [
    amount,
    balance,
    cardDigits,
    cardholderName,
    cvvDigits,
    expiryRaw,
    minInv,
    numberLocale,
    payMethod,
    project,
    refreshBalance,
    submitting,
    showBelowMinimumAlert,
    t,
    total,
  ]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Modal visible={submitting} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>
      <View className="flex-1 bg-[#EEF1F5]">
        <View
          className="bg-brand-navy px-4"
          style={{ paddingTop: insets.top + 12, paddingBottom: 20 }}>
          <View className="mb-4 flex-row items-center">
            <View className="w-10 items-center">
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => {
                  if (step === 2) {
                    setStep(1);
                    setError(null);
                  } else {
                    router.back();
                  }
                }}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Ionicons
                  name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={22}
                  color="#fff"
                />
              </Pressable>
            </View>
            <Text className="flex-1 text-center font-cairo-bold text-lg text-white">
              {t('invest.title')}
            </Text>
            <View className="w-10" />
          </View>
          <View className="flex-row items-center justify-center gap-3">
            <View className="flex-row items-center">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: step >= 1 ? '#fff' : STEP_INACTIVE,
                }}>
                <Text
                  className={`font-cairo-bold ${step >= 1 ? 'text-brand-navy' : 'text-white/90'}`}>
                  1
                </Text>
              </View>
              <View className="mx-1 h-px w-10 bg-white/40" />
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: step >= 2 ? '#fff' : STEP_INACTIVE,
                }}>
                <Text
                  className={`font-cairo-bold ${step >= 2 ? 'text-brand-navy' : 'text-white/90'}`}>
                  2
                </Text>
              </View>
            </View>
          </View>
          <Text className="mt-2 text-center font-cairo text-xs text-white/80">
            {step === 1 ? t('invest.step1') : t('invest.step2')}
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : !project ? (
          <Text className="mt-8 px-4 text-center font-cairo text-sm text-muted-label">
            {t('projectDetails.notFound')}
          </Text>
        ) : success ? (
          <View
            className="flex-1 items-center justify-center px-6"
            style={{ paddingBottom: insets.bottom + 16 }}>
            <Ionicons name="checkmark-circle" size={80} color={SUCCESS_GREEN} />
            <Text className="mt-6 text-center font-cairo-bold text-xl text-neutral-900">
              {t('invest.investSuccess')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(tabs)/portfolio')}
              className="mt-10 w-full items-center rounded-xl bg-brand-navy py-3.5">
              <Text className="font-cairo-bold text-base text-white">{t('invest.goToPortfolio')}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="mt-4 flex-row overflow-hidden rounded-2xl bg-white p-3" style={cardShadow()}>
              <View className="h-16 w-16 overflow-hidden rounded-xl bg-slate-200">
                {project.cover_image_url ? (
                  <Image
                    source={{ uri: project.cover_image_url }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name="image-outline" size={28} color="#94a3b8" />
                  </View>
                )}
              </View>
              <View className="min-w-0 flex-1 justify-center ps-3">
                <Text className="text-right font-cairo-bold text-sm leading-5 text-neutral-900" numberOfLines={2}>
                  {project.title}
                </Text>
                <Text className="mt-1 text-right font-cairo text-xs text-muted-label">
                  {t('invest.expectedShort', { pct: expectedStr })}
                </Text>
              </View>
            </View>

            {step === 1 ? (
              <>
                <Text className="mb-2 mt-6 text-right font-cairo-semibold text-sm text-neutral-900">
                  {t('invest.investmentAmount')}
                </Text>
                <View className="flex-row items-center rounded-2xl bg-[#E8ECF1] px-4 py-3.5">
                  <Text className="font-cairo-semibold text-brand-navy">{t('dashboard.currency')}</Text>
                  <TextInput
                    value={
                      amountDigits
                        ? Number(amountDigits).toLocaleString('en-US')
                        : ''
                    }
                    onChangeText={(x) =>
                      setAmountDigits(x.replace(/\D/g, '').slice(0, 14))
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={MUTED}
                    className="min-w-0 flex-1 py-0 text-right font-cairo-semibold text-lg text-neutral-900"
                  />
                </View>
                <Text className="mt-2 text-right font-cairo text-xs text-muted-label">
                  {t('invest.minHint', {
                    amount: minInv.toLocaleString(numberLocale),
                  })}
                </Text>
                <View className="mt-4 flex-row justify-end gap-2">
                  {([10_000, 50_000, 100_000] as const).map((q) => (
                    <Pressable
                      key={q}
                      accessibilityRole="button"
                      onPress={() => setAmountDigits(String(q))}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5">
                      <Text className="font-cairo-semibold text-sm text-brand-navy">
                        {q === 10_000
                          ? t('invest.quick10k')
                          : q === 50_000
                            ? t('invest.quick50k')
                            : t('invest.quick100k')}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View className="mt-6 rounded-2xl bg-[#E8ECF1] p-4">
                  <Text className="mb-3 text-right font-cairo-bold text-sm text-neutral-900">
                    {t('invest.detailsTitle')}
                  </Text>
                  <View className="flex-row items-center justify-between border-b border-slate-300/60 pb-3">
                    <Text className="font-cairo-semibold text-sm text-neutral-800">
                      {t('projectDetails.expectedReturnLabel')}
                    </Text>
                    <Text className="font-cairo text-sm text-muted-label">
                      {t('invest.expectedShort', { pct: expectedStr })}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between pt-3">
                    <Text className="font-cairo-semibold text-sm text-neutral-800">
                      {t('invest.durationLabel')}
                    </Text>
                    <Text className="font-cairo text-sm text-muted-label">
                      {t('invest.durationMonths', { months })}
                    </Text>
                  </View>
                </View>

                {error ? (
                  <Text className="mt-4 text-right font-cairo text-xs text-red-600">{error}</Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={onContinue}
                  className="mt-8 items-center rounded-xl py-3.5"
                  style={{ backgroundColor: CONTINUE_BG }}>
                  <Text className="font-cairo-bold text-base text-white">{t('invest.continue')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="mb-1 mt-6 text-right font-cairo-bold text-base text-neutral-900">
                  {t('invest.paymentTitle')}
                </Text>
                <Text className="mb-4 text-right font-cairo text-sm text-muted-label">
                  {t('invest.paymentSubtitle')}
                </Text>

                <PaymentOptionRow
                  selected={payMethod === 'card'}
                  onPress={() => {
                    setPayMethod('card');
                    setError(null);
                  }}
                  icon="card-outline"
                  title={t('invest.payCard')}
                  subtitle={t('invest.payCardSub')}
                />
                <PaymentOptionRow
                  selected={payMethod === 'transfer'}
                  onPress={() => {
                    setPayMethod('transfer');
                    setError(null);
                  }}
                  icon="business-outline"
                  title={t('invest.payTransfer')}
                  subtitle={t('invest.payTransferSub')}
                />
                <PaymentOptionRow
                  selected={payMethod === 'ccp'}
                  onPress={() => {
                    setPayMethod('ccp');
                    setError(null);
                  }}
                  icon="library-outline"
                  title={t('invest.payCcp')}
                  subtitle={t('invest.payCcpSub')}
                />

                {payMethod === 'card' ? (
                  <CardPaymentSimulator
                    amount={amount}
                    fee={fee}
                    total={total}
                    numberLocale={numberLocale}
                    currency={t('dashboard.currency')}
                    cardDigits={cardDigits}
                    setCardDigits={setCardDigits}
                    expiryRaw={expiryRaw}
                    setExpiryRaw={setExpiryRaw}
                    cvvDigits={cvvDigits}
                    setCvvDigits={setCvvDigits}
                    cardholderName={cardholderName}
                    setCardholderName={setCardholderName}
                    submitting={submitting}
                    error={error}
                    onConfirm={() => void onConfirm()}
                    t={t}
                  />
                ) : (
                  <>
                    <View className="mt-6 rounded-2xl bg-[#E8ECF1] p-4">
                      <Text className="mb-3 text-right font-cairo-bold text-sm text-neutral-900">
                        {t('invest.summaryTitle')}
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="font-cairo text-sm text-muted-label">{t('invest.amountLine')}</Text>
                        <Text className="font-cairo text-sm text-neutral-800">
                          {amount.toLocaleString(numberLocale)} {t('dashboard.currency')}
                        </Text>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="font-cairo text-sm text-muted-label">
                          {t('invest.feeLine', { pct: FEE_PCT })}
                        </Text>
                        <Text className="font-cairo text-sm text-neutral-800">
                          {fee.toLocaleString(numberLocale)} {t('dashboard.currency')}
                        </Text>
                      </View>
                      <View className="my-3 h-px bg-slate-300/80" />
                      <View className="flex-row items-center justify-between">
                        <Text className="font-cairo-bold text-sm text-neutral-900">{t('invest.totalLine')}</Text>
                        <Text className="font-cairo-bold text-lg text-brand-navy">
                          {total.toLocaleString(numberLocale)} {t('dashboard.currency')}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-end gap-2">
                      <Ionicons name="shield-checkmark" size={18} color={BRAND} />
                      <Text className="flex-1 text-right font-cairo text-xs text-muted-label">
                        {t('invest.secureNote')}
                      </Text>
                    </View>

                    {error ? (
                      <Text className="mt-4 text-right font-cairo text-xs text-red-600">{error}</Text>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      disabled={submitting}
                      onPress={() => void onConfirm()}
                      className={`mt-6 items-center rounded-xl py-3.5 ${submitting ? 'bg-slate-400' : 'bg-brand-navy'}`}>
                      <Text className="font-cairo-bold text-base text-white">
                        {submitting ? t('invest.confirming') : t('invest.confirm')}
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

function CardPaymentSimulator({
  amount,
  fee,
  total,
  numberLocale,
  currency,
  cardDigits,
  setCardDigits,
  expiryRaw,
  setExpiryRaw,
  cvvDigits,
  setCvvDigits,
  cardholderName,
  setCardholderName,
  submitting,
  error,
  onConfirm,
  t,
}: {
  amount: number;
  fee: number;
  total: number;
  numberLocale: string;
  currency: string;
  cardDigits: string;
  setCardDigits: (v: string) => void;
  expiryRaw: string;
  setExpiryRaw: (v: string) => void;
  cvvDigits: string;
  setCvvDigits: (v: string) => void;
  cardholderName: string;
  setCardholderName: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  t: TFunction;
}) {
  const [cvvFocused, setCvvFocused] = useState(false);
  const flipProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(flipProgress, {
      toValue: cvvFocused ? 1 : 0,
      friction: 8,
      tension: 42,
      useNativeDriver: true,
    }).start();
  }, [cvvFocused, flipProgress]);

  const frontRotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const onlyCardDigits = cardDigits.replace(/\D/g, '');
  const cardNumberDisplay = formatCardGroups(cardDigits);
  const expiryDisplay = formatExpiryDisplay(expiryRaw);
  const cardNumberOnPlastic =
    onlyCardDigits.length === 0 ? '•••• •••• •••• ••••' : cardNumberDisplay;
  const rawHolder = cardholderName.trim();
  const cardholderPreview = rawHolder ? rawHolder.toUpperCase() : t('invest.cardholderPlaceholder');
  const cvvMasked = cvvDigits.length === 0 ? '•••' : '•'.repeat(cvvDigits.length);

  return (
    <View className="mt-4 overflow-hidden rounded-2xl bg-white" style={cardShadow()}>
      <View
        style={{
          backgroundColor: CARD_HEADER_TOP,
          borderBottomWidth: 3,
          borderBottomColor: CARD_HEADER_BOTTOM,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 18,
        }}>
        <Text className="text-center font-cairo-bold text-lg text-white">{t('invest.payCard')}</Text>
        <Text className="mt-1 text-center font-cairo text-xs text-white/85">{t('invest.payCardSub')}</Text>

        <View className="mt-5" style={{ height: 148 }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.cardFace,
              {
                backgroundColor: CARD_PLASTIC,
                borderRadius: 16,
                padding: 16,
                justifyContent: 'space-between',
                transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
              },
            ]}>
            <View className="flex-row items-start justify-between">
              <Ionicons name="wifi" size={22} color="rgba(255,255,255,0.85)" style={{ transform: [{ rotate: '90deg' }] }} />
              <View className="h-9 w-11 rounded bg-[#d4af37]/90" />
            </View>
            <Text
              className="font-cairo-semibold text-lg tracking-widest text-white"
              style={{ letterSpacing: 2 }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {cardNumberOnPlastic}
            </Text>
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="font-cairo text-[9px] uppercase text-white/70">EXPIRES</Text>
                <Text className="font-cairo-semibold text-sm text-white">
                  {expiryDisplay || 'MM/YY'}
                </Text>
              </View>
              <View className="max-w-[55%]">
                <Text className="font-cairo text-[9px] uppercase text-white/70">CARD HOLDER</Text>
                <Text className="text-right font-cairo-semibold text-sm text-white" numberOfLines={1}>
                  {cardholderPreview}
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.cardFace,
              {
                backgroundColor: CARD_PLASTIC,
                borderRadius: 16,
                padding: 16,
                justifyContent: 'flex-start',
                transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
              },
            ]}>
            <View style={{ height: 44, width: '100%', borderRadius: 6, backgroundColor: '#121212' }} />
            <View className="mt-5 w-full items-end">
              <Text className="mb-1 text-right font-cairo text-[9px] uppercase text-white/70">
                {t('invest.cvv')}
              </Text>
              <View className="min-w-[120px] rounded-md bg-white px-3 py-2">
                <Text className="text-right font-cairo-bold text-base tracking-[8px] text-neutral-900">
                  {cvvMasked}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
          {(['EDA', 'CIB', 'MC', 'VISA'] as const).map((label) => (
            <View
              key={label}
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor:
                  label === 'EDA'
                    ? 'rgba(212,175,55,0.35)'
                    : label === 'CIB'
                      ? 'rgba(34,197,94,0.35)'
                      : label === 'MC'
                        ? 'rgba(239,68,68,0.25)'
                        : 'rgba(59,130,246,0.35)',
              }}>
              <Text className="font-cairo-bold text-[10px] text-white">{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="bg-[#F8F9FA] px-3 pb-5 pt-4">
        <Text className="mb-1.5 text-right font-cairo-semibold text-sm text-neutral-900">
          {t('invest.cardNumber')}
        </Text>
        <View className="flex-row items-center rounded-2xl bg-white px-3 py-3" style={cardShadow()}>
          <Ionicons name="card-outline" size={20} color={MUTED} />
          <TextInput
            value={cardNumberDisplay}
            onChangeText={(x) => setCardDigits(x.replace(/\D/g, '').slice(0, 16))}
            keyboardType="number-pad"
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={MUTED}
            className="min-w-0 flex-1 py-0 ps-2 text-right font-cairo text-base text-neutral-900"
          />
        </View>

        <Text className="mb-1.5 mt-4 text-right font-cairo-semibold text-sm text-neutral-900">
          {t('invest.cardholderName')}
        </Text>
        <TextInput
          value={cardholderName}
          onChangeText={setCardholderName}
          placeholder={t('invest.cardholderPlaceholder')}
          placeholderTextColor={MUTED}
          autoCapitalize="characters"
          className="rounded-2xl bg-white px-3 py-3 text-right font-cairo text-base text-neutral-900"
          style={cardShadow()}
        />

        <View className="mt-4 flex-row gap-3" style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
          <View className="min-w-0 flex-1">
            <Text className="mb-1.5 text-right font-cairo-semibold text-sm text-neutral-900">
              {t('invest.expiry')}
            </Text>
            <TextInput
              value={expiryDisplay}
              onChangeText={(x) => setExpiryRaw(normalizeExpiryDigits(x))}
              keyboardType="numeric"
              placeholder="MM/YY"
              placeholderTextColor={MUTED}
              className="rounded-2xl bg-[#E8ECF1] px-3 py-3 text-right font-cairo text-base text-neutral-900"
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="mb-1.5 flex-row items-center justify-end gap-1">
              <Ionicons name="lock-closed-outline" size={14} color={MUTED} />
              <Text className="text-right font-cairo-semibold text-sm text-neutral-900">{t('invest.cvv')}</Text>
            </View>
            <TextInput
              value={cvvDigits}
              onChangeText={(x) => setCvvDigits(x.replace(/\D/g, '').slice(0, 3))}
              keyboardType="numeric"
              secureTextEntry
              placeholder="•••"
              placeholderTextColor={MUTED}
              onFocus={() => setCvvFocused(true)}
              onBlur={() => setCvvFocused(false)}
              className="rounded-2xl bg-[#E8ECF1] px-3 py-3 text-right font-cairo text-base text-neutral-900"
            />
          </View>
        </View>

        <View className="mt-5 flex-row items-center rounded-2xl bg-white px-3 py-4" style={cardShadow()}>
          <View className="flex-row gap-2">
            <Ionicons name="lock-closed-outline" size={18} color={BRAND} />
            <Ionicons name="shield-checkmark-outline" size={18} color={BRAND} />
          </View>
          <View className="min-w-0 flex-1 px-2">
            <Text className="text-right font-cairo text-sm text-muted-label">{t('invest.amountToPay')}</Text>
            <Text className="mt-1 text-right font-cairo-bold text-2xl text-brand-navy">
              {total.toLocaleString(numberLocale)} {currency}
            </Text>
            <Text className="mt-1 text-right font-cairo text-[10px] text-muted-label">
              {t('invest.amountLine')}: {amount.toLocaleString(numberLocale)} + {t('invest.feeLine', { pct: FEE_PCT })}{' '}
              {fee.toLocaleString(numberLocale)}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-center gap-1.5">
          <Ionicons name="shield-checkmark" size={14} color={MUTED} />
          <Text className="flex-1 text-center font-cairo text-[11px] leading-4 text-muted-label">
            {t('invest.sslSecureNotice')}
          </Text>
        </View>

        {error ? (
          <Text className="mt-3 text-right font-cairo text-xs text-red-600">{error}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={onConfirm}
          className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl py-4"
          style={{ backgroundColor: submitting ? '#94a3b8' : '#0B355E' }}>
          <Text className="text-center font-cairo-bold text-base text-white" numberOfLines={2}>
            {total.toLocaleString(numberLocale)} {currency} —{' '}
            {submitting ? t('invest.confirming') : t('invest.confirmPayment')}
          </Text>
          <Ionicons name="lock-closed" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function PaymentOptionRow({
  selected,
  onPress,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`mb-3 flex-row items-center rounded-2xl border-2 bg-white p-3 ${
        selected ? 'border-brand-navy' : 'border-[#C5D4E2]'
      }`}>
      <View
        className={`h-12 w-12 items-center justify-center rounded-xl ${
          selected ? 'bg-brand-icon-bg' : 'bg-[#E3EEF5]'
        }`}>
        <Ionicons name={icon} size={26} color={selected ? '#154375' : '#5B7A9E'} />
      </View>
      <View className="min-w-0 flex-1 px-3">
        <Text className="text-right font-cairo-bold text-sm text-neutral-900">{title}</Text>
        <Text className="mt-0.5 text-right font-cairo text-xs text-muted-label" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {selected ? (
        <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-navy">
          <Ionicons name="checkmark" size={18} color="#fff" />
        </View>
      ) : (
        <View className="h-7 w-7" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardFace: {
    backfaceVisibility: 'hidden',
  },
});
