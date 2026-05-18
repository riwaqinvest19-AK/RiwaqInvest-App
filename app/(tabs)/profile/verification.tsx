import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { VerificationSelfieModal } from '@/components/profile/VerificationSelfieModal';
import {
  type IdentityDocType,
  isKycAssetAllowed,
  KYC_MAX_BYTES,
  type KycSubmitErrorCode,
} from '@/lib/identityVerificationUpload';
import { canSubmitKyc, submitKycVerification } from '@/lib/submitKycVerification';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';
/** Enabled submit — matches header brand blue */
const SUBMIT_ENABLED = BRAND_NAVY;
/** Disabled submit — muted blue-grey per design */
const SUBMIT_DISABLED = '#8FA0B3';

const ICON_NATIONAL = '#2563EB';
const ICON_LICENSE = '#22C55E';
const ICON_PASSPORT = '#A855F7';

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

const DOC_OPTIONS: {
  key: IdentityDocType;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentBg: string;
}[] = [
  { key: 'national_id', labelKey: 'profile.docTypeNationalId', icon: 'id-card-outline', accentBg: ICON_NATIONAL },
  { key: 'drivers_license', labelKey: 'profile.docTypeDriversLicense', icon: 'card-outline', accentBg: ICON_LICENSE },
  { key: 'passport', labelKey: 'profile.docTypePassport', icon: 'book-outline', accentBg: ICON_PASSPORT },
];

function errorMessageForCode(t: (k: string) => string, code: KycSubmitErrorCode): string {
  switch (code) {
    case 'FILE_TOO_LARGE':
      return t('profile.verificationFileTooLarge');
    case 'INVALID_TYPE':
      return t('profile.verificationInvalidType');
    case 'UPLOAD_FAILED':
      return t('profile.verificationUploadFailed');
    case 'PROFILE_UPDATE_FAILED':
      return t('profile.verificationProfileUpdateFailed');
    case 'NOT_AUTHENTICATED':
      return t('profile.verificationLoginRequired');
    default:
      return t('profile.verificationUploadFailed');
  }
}

function explainUploadReason(reason?: string): string | undefined {
  if (!reason) return undefined;
  const r = reason.toLowerCase();
  if (r.includes('database schema is invalid') || r.includes('schema is invalid or incompatible')) {
    return 'مخطط قاعدة البيانات في Supabase غير محدث. طبّق جميع ملفات migrations ثم أعد المحاولة.';
  }
  if (r.includes('bucket') && r.includes('not found')) {
    return 'Supabase bucket غير موجود.';
  }
  if (r.includes('mime') || r.includes('content type')) {
    return 'نوع الملف غير مسموح في إعدادات bucket.';
  }
  if (r.includes('row-level security') || r.includes('permission') || r.includes('not allowed')) {
    return 'صلاحيات التخزين (RLS) تمنع الرفع.';
  }
  if (r.includes('network') || r.includes('fetch')) {
    return 'مشكلة اتصال بالشبكة أثناء الرفع.';
  }
  return reason;
}

export default function VerificationScreen() {
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

  const [statusLoading, setStatusLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

  const [docType, setDocType] = useState<IdentityDocType | null>(null);
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieModalOpen, setSelfieModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#FFFFFF';
  const borderMuted = isDark ? '#3f3f46' : '#E5E7EB';
  const mainText = isDark ? '#f2f2f7' : '#111827';
  const subText = isDark ? '#a1a1a6' : '#6B7280';
  const uploadIconColor = asset ? BRAND_NAVY : '#9CA3AF';

  const privacyBg = isDark ? '#1f1d1a' : '#FAF7F2';
  const privacyBorder = isDark ? '#3d3830' : '#E8DFD4';
  const privacyTitleColor = isDark ? '#D4A574' : '#9A6230';

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        setVerificationStatus(null);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[verification]', error.message);
        setVerificationStatus('unverified');
        return;
      }

      const raw = data?.verification_status as string | undefined;
      if (raw === 'pending' || raw === 'verified' || raw === 'rejected' || raw === 'unverified') {
        setVerificationStatus(raw);
      } else {
        setVerificationStatus('unverified');
      }
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) {
      return;
    }
    const picked = res.assets[0];
    if (!isKycAssetAllowed(picked)) {
      Toast.show({
        type: 'error',
        text1: t('profile.verificationInvalidType'),
        position: 'bottom',
      });
      return;
    }
    if (typeof picked.size === 'number' && picked.size > KYC_MAX_BYTES) {
      Toast.show({
        type: 'error',
        text1: t('profile.verificationFileTooLarge'),
        position: 'bottom',
      });
      return;
    }
    setAsset(picked);
  };

  const onSubmit = async () => {
    if (!canSubmitKyc(docType, asset, selfieUri, submitting)) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        Toast.show({
          type: 'error',
          text1: t('profile.verificationLoginRequired'),
          position: 'bottom',
        });
        return;
      }

      const result = await submitKycVerification({
        userId: user.id,
        docType,
        asset,
        selfieUri,
      });

      if (!result.ok) {
        const detail = explainUploadReason(result.reason);
        const text1 =
          result.code === 'UPLOAD_FAILED' && result.reason?.includes('selfie')
            ? t('profile.verificationSelfieUploadFailed')
            : errorMessageForCode(t, result.code);
        Toast.show({
          type: 'error',
          text1,
          text2: detail,
          position: 'bottom',
        });
        return;
      }

      setVerificationStatus('pending');
      setAsset(null);
      setDocType(null);
      setSelfieUri(null);

      Toast.show({
        type: 'success',
        text1: t('profile.verificationSubmitSuccess'),
        position: 'bottom',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = canSubmitKyc(docType, asset, selfieUri, submitting);
  const showForm =
    verificationStatus === 'unverified' || verificationStatus === 'rejected' || verificationStatus === null;

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      <View style={{ backgroundColor: BRAND_NAVY, paddingTop: insets.top, paddingBottom: 18 }}>
        <View className="flex-row-reverse items-center justify-between px-4 pt-2">
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
          <Text className="flex-1 font-cairo-bold text-lg text-white" style={{ textAlign: 'center' }}>
            {t('profile.verificationFlowTitle')}
          </Text>
          <View className="w-10" />
        </View>
        <Text
          className="mt-3 px-4 font-cairo text-sm leading-5"
          style={{ color: 'rgba(255,255,255,0.92)', textAlign: 'right' }}>
          {t('profile.verificationHeaderSubtitle')}
        </Text>
      </View>

      {statusLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND_NAVY} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: insets.bottom + 28,
          }}
          keyboardShouldPersistTaps="handled">
          {verificationStatus === 'pending' && (
            <View className="rounded-2xl p-5" style={{ backgroundColor: cardBg }}>
              <View className="flex-row-reverse items-center gap-3">
                <Ionicons name="time-outline" size={28} color={BRAND_NAVY} />
                <View className="flex-1">
                  <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                    {t('profile.verificationPendingTitle')}
                  </Text>
                  <Text className="mt-2 font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                    {t('profile.verificationPendingHint')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {verificationStatus === 'verified' && (
            <View className="rounded-2xl p-5" style={{ backgroundColor: cardBg }}>
              <View className="flex-row-reverse items-center gap-3">
                <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
                <View className="flex-1">
                  <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                    {t('profile.verificationVerifiedTitle')}
                  </Text>
                  <Text className="mt-2 font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                    {t('profile.verificationVerifiedHint')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {showForm && (
            <>
              {verificationStatus === 'rejected' && (
                <View className="mb-5 rounded-2xl border p-4" style={{ borderColor: '#f97316', backgroundColor: cardBg }}>
                  <Text className="font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                    {t('profile.verificationRejectedHint')}
                  </Text>
                </View>
              )}

              <Text className="font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                {t('profile.verificationEitherOrHint')}
              </Text>

              <View
                className="my-5 flex-row-reverse items-center gap-3"
                style={{ opacity: 0.9 }}>
                <View className="h-px flex-1" style={{ backgroundColor: borderMuted }} />
                <Text className="font-cairo-semibold text-xs uppercase tracking-wide" style={{ color: subText }}>
                  {t('profile.verificationOrDivider')}
                </Text>
                <View className="h-px flex-1" style={{ backgroundColor: borderMuted }} />
              </View>

              <Text className="font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                {t('profile.verificationIdOptionTitle')}
              </Text>
              <Text className="mt-1 font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                {t('profile.verificationIdOptionHint')}
              </Text>

              <Text className="mt-4 font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                {t('profile.verificationChooseDocTypeTitle')}
              </Text>

              <View className="mt-4 gap-3">
                {DOC_OPTIONS.map((opt) => {
                  const selected = docType === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      accessibilityRole="button"
                      onPress={() => setDocType(opt.key)}
                      className="rounded-xl px-4 py-3.5"
                      style={{
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? BRAND_NAVY : borderMuted,
                        backgroundColor: cardBg,
                      }}>
                      <View className="flex-row-reverse items-center" style={{ gap: 12 }}>
                        <View
                          className="items-center justify-center overflow-hidden rounded-xl"
                          style={{
                            width: 48,
                            height: 48,
                            backgroundColor: opt.accentBg,
                          }}>
                          <Ionicons name={opt.icon} size={26} color="#fff" />
                        </View>
                        <Text className="flex-1 font-cairo-semibold text-base" style={{ color: mainText, textAlign: 'right' }}>
                          {t(opt.labelKey)}
                        </Text>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={24} color={BRAND_NAVY} />
                        ) : (
                          <View style={{ width: 24 }} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mb-3 mt-8 font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                {t('profile.verificationUploadSectionTitle')}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={pickDocument}
                className="items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10"
                style={{
                  borderColor: asset ? BRAND_NAVY : borderMuted,
                  backgroundColor: cardBg,
                }}>
                <Ionicons name="cloud-upload-outline" size={44} color={uploadIconColor} />
                <Text className="mt-4 font-cairo-semibold text-base" style={{ color: mainText, textAlign: 'center' }}>
                  {t('profile.verificationTapToUpload')}
                </Text>
                {asset?.name ? (
                  <Text className="mt-2 px-2 font-cairo text-sm" style={{ color: BRAND_NAVY, textAlign: 'center' }} numberOfLines={2}>
                    {asset.name}
                  </Text>
                ) : null}
                <Text className="mt-3 px-1 font-cairo text-sm" style={{ color: subText, textAlign: 'center' }}>
                  {t('profile.verificationFormatsHint')}
                </Text>
              </Pressable>

              <>
                <View
                  className="my-6 flex-row-reverse items-center gap-3"
                  style={{ opacity: 0.9 }}>
                  <View className="h-px flex-1" style={{ backgroundColor: borderMuted }} />
                  <Text className="font-cairo-semibold text-xs uppercase tracking-wide" style={{ color: subText }}>
                    {t('profile.verificationOrDivider')}
                  </Text>
                  <View className="h-px flex-1" style={{ backgroundColor: borderMuted }} />
                </View>

                <Text className="mb-1 font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                  {t('profile.verificationSelfieOptionTitle')}
                </Text>
                <Text className="mb-3 font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                  {t('profile.verificationSelfieOptionHint')}
                </Text>
                <Text className="mb-3 font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
                  {t('profile.verificationSelfieSectionTitle')}
                </Text>
                <Text className="mb-3 font-cairo text-sm leading-6" style={{ color: subText, textAlign: 'right' }}>
                  {t('profile.verificationSelfieSectionHint')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelfieModalOpen(true)}
                    className="items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-4 py-8"
                    style={{
                      borderColor: selfieUri ? BRAND_NAVY : borderMuted,
                      backgroundColor: cardBg,
                      minHeight: selfieUri ? 200 : 120,
                    }}>
                    {selfieUri ? (
                      <Image source={{ uri: selfieUri }} className="h-48 w-full rounded-xl" resizeMode="cover" />
                    ) : (
                      <Ionicons name="camera-outline" size={40} color={uploadIconColor} />
                    )}
                    <Text className="mt-3 font-cairo-semibold text-base" style={{ color: mainText, textAlign: 'center' }}>
                      {selfieUri ? t('profile.verificationSelfieRetake') : t('profile.verificationSelfieOpenCamera')}
                    </Text>
                  </Pressable>
              </>

              <View
                className="mt-6 rounded-xl border px-4 py-4"
                style={{
                  backgroundColor: privacyBg,
                  borderColor: privacyBorder,
                }}>
                <Text style={{ textAlign: 'right', lineHeight: 22 }}>
                  <Text className="font-cairo-bold" style={{ color: privacyTitleColor }}>
                    {t('profile.verificationPrivacyNoteTitle')}
                  </Text>
                  <Text className="font-cairo text-sm" style={{ color: isDark ? '#d6d3cd' : '#4B5563' }}>
                    {' '}
                    {t('profile.verificationPrivacyNoteBody')}
                  </Text>
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={() => void onSubmit()}
                className="mt-8 items-center rounded-xl py-4"
                style={{
                  backgroundColor: canSubmit ? SUBMIT_ENABLED : SUBMIT_DISABLED,
                }}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-cairo-bold text-base text-white">{t('profile.verificationSubmit')}</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
      <VerificationSelfieModal
        visible={selfieModalOpen}
        onClose={() => setSelfieModalOpen(false)}
        onCaptured={(uri) => {
          setSelfieUri(uri);
          setSelfieModalOpen(false);
        }}
      />
    </View>
  );
}
