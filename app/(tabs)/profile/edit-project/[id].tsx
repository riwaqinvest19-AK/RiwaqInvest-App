import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import * as DocumentPicker from 'expo-document-picker';
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabeledField } from '@/components/auth/LabeledField';
import { useColorScheme } from '@/components/useColorScheme';
import {
  objectPathFromProjectAssetsPublicUrl,
  removeProjectAssetObject,
  uploadProjectCoverImage,
  uploadProjectLegalPdf,
} from '@/lib/projectAssetUpload';
import { checkProfileAdmin } from '@/lib/checkProfileAdmin';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';

function parseDigitsToInt(raw: string): number {
  const d = raw.replace(/\D/g, '');
  if (!d) return 0;
  const n = Math.trunc(Number(d));
  return Number.isFinite(n) ? n : 0;
}

export default function AdminEditProjectScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const projectId = useMemo(() => {
    const x = Array.isArray(rawId) ? rawId[0] : rawId;
    return typeof x === 'string' && x.length > 0 ? x : null;
  }, [rawId]);

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

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const borderColor = isDark ? '#38383a' : '#E8ECF0';
  const mainText = isDark ? '#f2f2f7' : '#0f172a';
  const subText = isDark ? '#a1a1a6' : '#6B7C93';
  const inputBg = isDark ? '#2c2c2e' : '#F8F9FA';

  const chevronBack = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';
  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  const writingDirection = I18nManager.isRTL ? 'rtl' : 'ltr';

  const [gateLoading, setGateLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectMissing, setProjectMissing] = useState(false);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [targetDigits, setTargetDigits] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [returnPct, setReturnPct] = useState('');
  const [description, setDescription] = useState('');
  const [riskAnalysis, setRiskAnalysis] = useState('');

  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [initialCoverPath, setInitialCoverPath] = useState<string | null>(null);
  const [initialPdfPath, setInitialPdfPath] = useState<string | null>(null);

  const [coverAsset, setCoverAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pdfAsset, setPdfAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const checkAdminAndLoadProject = useCallback(async () => {
    if (!projectId) {
      setGateLoading(false);
      setProjectLoading(false);
      setProjectMissing(true);
      setAllowed(false);
      return;
    }

    setGateLoading(true);
    setProjectLoading(true);
    setProjectMissing(false);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? (await supabase.auth.getUser()).data.user;
      if (!user?.id) {
        setAllowed(false);
        router.replace('/(auth)/login');
        return;
      }

      const { isAdmin } = await checkProfileAdmin(user.id);
      setAllowed(isAdmin);
      if (!isAdmin) return;

      const { data: row, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (projError) {
        console.warn('[admin-edit-project] load', projError.message);
        setProjectMissing(true);
        return;
      }

      if (!row) {
        setProjectMissing(true);
        return;
      }

      const r = row as Record<string, unknown>;
      setTitle(String(r.title ?? ''));
      setLocation(String(r.location ?? ''));
      const tgt = r.target_amount;
      setTargetDigits(
        typeof tgt === 'number' && Number.isFinite(tgt) && tgt > 0 ? String(Math.trunc(tgt)) : '',
      );
      const dm = r.duration_months;
      setDurationMonths(
        typeof dm === 'number' && Number.isFinite(dm) && dm > 0 ? String(Math.trunc(dm)) : '',
      );
      const er = r.expected_return;
      setReturnPct(
        typeof er === 'number' && Number.isFinite(er) && er > 0 ? String(er).replace('.', ',') : '',
      );
      setDescription(String(r.description ?? ''));
      setRiskAnalysis(String(r.risk_analysis ?? ''));

      const coverUrl = typeof r.cover_image_url === 'string' ? r.cover_image_url : null;
      const docUrl = typeof r.document_url === 'string' ? r.document_url : null;
      setExistingCoverUrl(coverUrl);
      setExistingPdfUrl(docUrl);
      setInitialCoverPath(objectPathFromProjectAssetsPublicUrl(coverUrl));
      setInitialPdfPath(objectPathFromProjectAssetsPublicUrl(docUrl));

      setCoverAsset(null);
      setPdfAsset(null);
    } finally {
      setGateLoading(false);
      setProjectLoading(false);
    }
  }, [projectId, router]);

  useFocusEffect(
    useCallback(() => {
      void checkAdminAndLoadProject();
    }, [checkAdminAndLoadProject]),
  );

  const pickCover = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setCoverAsset(res.assets[0]);
  };

  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setPdfAsset(res.assets[0]);
  };

  const onSave = async () => {
    if (!projectId) return;

    const name = title.trim();
    if (!name) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorTitleRequired'),
        position: 'bottom',
      });
      return;
    }

    const target = parseDigitsToInt(targetDigits);
    if (target <= 0) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorTarget'),
        position: 'bottom',
      });
      return;
    }

    const months = Math.trunc(Number(durationMonths.replace(/\D/g, '') || '0'));
    if (!Number.isFinite(months) || months <= 0) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorDuration'),
        position: 'bottom',
      });
      return;
    }

    const ret = Number(String(returnPct).replace(',', '.').trim());
    if (!Number.isFinite(ret) || ret <= 0) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorReturn'),
        position: 'bottom',
      });
      return;
    }

    const coverOk = Boolean(coverAsset) || Boolean(existingCoverUrl?.trim());
    if (!coverOk) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorCover'),
        position: 'bottom',
      });
      return;
    }

    const pdfOk = Boolean(pdfAsset) || Boolean(existingPdfUrl?.trim());
    if (!pdfOk) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorPdf'),
        position: 'bottom',
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      Toast.show({
        type: 'error',
        text1: t('profile.editProjectToastTitle'),
        text2: t('profile.addProjectErrorAuth'),
        position: 'bottom',
      });
      return;
    }

    setSaving(true);
    let newCoverPath: string | null = null;
    let newPdfPath: string | null = null;
    let coverUrlOut = existingCoverUrl?.trim() || null;
    let pdfUrlOut = existingPdfUrl?.trim() || null;

    try {
      if (coverAsset) {
        const coverUp = await uploadProjectCoverImage({ userId, asset: coverAsset });
        if (!coverUp.ok) {
          Toast.show({
            type: 'error',
            text1: t('profile.editProjectToastTitle'),
            text2: coverUp.reason ?? t('profile.addProjectErrorUploadCover'),
            position: 'bottom',
          });
          return;
        }
        coverUrlOut = coverUp.url;
        newCoverPath = coverUp.path;
      }

      if (pdfAsset) {
        const pdfUp = await uploadProjectLegalPdf({ userId, asset: pdfAsset });
        if (!pdfUp.ok) {
          Toast.show({
            type: 'error',
            text1: t('profile.editProjectToastTitle'),
            text2: pdfUp.reason ?? t('profile.addProjectErrorUploadPdf'),
            position: 'bottom',
          });
          return;
        }
        pdfUrlOut = pdfUp.url;
        newPdfPath = pdfUp.path;
      }

      const updates = {
        title: name,
        location: location.trim() || null,
        target_amount: target,
        duration_months: months,
        expected_return: ret,
        description: description.trim() || null,
        risk_analysis: riskAnalysis.trim() || null,
        cover_image_url: coverUrlOut,
        document_url: pdfUrlOut,
      };

      const { error: updateError } = await supabase
        .from('projects')
        .update(updates as never)
        .eq('id', projectId);

      if (updateError) {
        console.warn('[admin-edit-project] update', updateError.message);
        Toast.show({
          type: 'error',
          text1: t('profile.editProjectToastTitle'),
          text2: updateError.message,
          position: 'bottom',
        });
        return;
      }

      if (coverAsset && initialCoverPath && initialCoverPath !== newCoverPath) {
        await removeProjectAssetObject(initialCoverPath);
      }
      if (pdfAsset && initialPdfPath && initialPdfPath !== newPdfPath) {
        await removeProjectAssetObject(initialPdfPath);
      }

      setInitialCoverPath(objectPathFromProjectAssetsPublicUrl(coverUrlOut));
      setInitialPdfPath(objectPathFromProjectAssetsPublicUrl(pdfUrlOut));
      setExistingCoverUrl(coverUrlOut);
      setExistingPdfUrl(pdfUrlOut);
      setCoverAsset(null);
      setPdfAsset(null);

      Toast.show({
        type: 'success',
        text1: t('profile.editProjectSuccessTitle'),
        text2: t('profile.editProjectSuccessBody'),
        position: 'bottom',
      });
      router.replace(`/project/${projectId}` as Href);
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!projectId) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: pageBg }}>
        <Text className="text-center font-cairo text-base" style={{ color: mainText }}>
          {t('profile.editProjectNotFound')}
        </Text>
      </View>
    );
  }

  if (gateLoading || (allowed && projectLoading)) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: pageBg }}>
        <ActivityIndicator color={BRAND_NAVY} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
        <View className="flex-row-reverse items-center px-4 py-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="flex-row-reverse items-center gap-2 rounded-lg px-2 py-2 active:opacity-70">
            <Text className="font-cairo-semibold text-base" style={{ color: BRAND_NAVY }}>
              {t('profile.addProjectBack')}
            </Text>
            <Ionicons name={chevronBack} size={22} color={BRAND_NAVY} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="block" size={48} color={subText} />
          <Text className="mt-4 text-center font-cairo text-base" style={{ color: mainText }}>
            {t('profile.adminVerificationAccessDenied')}
          </Text>
        </View>
      </View>
    );
  }

  if (projectMissing) {
    return (
      <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
        <View className="flex-row-reverse items-center px-4 py-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="flex-row-reverse items-center gap-2 rounded-lg px-2 py-2 active:opacity-70">
            <Text className="font-cairo-semibold text-base" style={{ color: BRAND_NAVY }}>
              {t('profile.addProjectBack')}
            </Text>
            <Ionicons name={chevronBack} size={22} color={BRAND_NAVY} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-cairo text-base" style={{ color: mainText }}>
            {t('profile.editProjectNotFound')}
          </Text>
        </View>
      </View>
    );
  }

  const targetDisplay =
    parseDigitsToInt(targetDigits) > 0
      ? parseDigitsToInt(targetDigits).toLocaleString(I18nManager.isRTL ? 'ar-DZ' : 'en-US')
      : '';

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
      <View className="flex-row-reverse items-center justify-between px-4 py-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="flex-row-reverse items-center gap-1 rounded-lg px-2 py-2 active:opacity-70">
          <Text className="font-cairo-semibold text-base" style={{ color: BRAND_NAVY }}>
            {t('profile.addProjectBack')}
          </Text>
          <Ionicons name={chevronBack} size={22} color={BRAND_NAVY} />
        </Pressable>
        <Text className="font-cairo-bold text-lg" style={{ color: mainText }}>
          {t('profile.editProjectTitle')}
        </Text>
        <View className="w-16" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-right font-cairo text-xs leading-5" style={{ color: subText }}>
          {t('profile.editProjectIntro')}
        </Text>

        <View className="mb-4 gap-3 rounded-2xl border p-4" style={{ backgroundColor: cardBg, borderColor }}>
          <LabeledField
            label={t('profile.addProjectFieldTitle')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('profile.addProjectPlaceholderTitle')}
            autoCapitalize="sentences"
          />
          <LabeledField
            label={t('profile.addProjectFieldLocation')}
            value={location}
            onChangeText={setLocation}
            placeholder={t('profile.addProjectPlaceholderLocation')}
            autoCapitalize="words"
          />
          <LabeledField
            label={t('profile.addProjectFieldTarget')}
            value={targetDisplay}
            onChangeText={(x) => setTargetDigits(x.replace(/\D/g, '').slice(0, 14))}
            placeholder={t('profile.addProjectPlaceholderTarget')}
            keyboardType="number-pad"
          />
          <LabeledField
            label={t('profile.addProjectFieldDuration')}
            value={durationMonths}
            onChangeText={(x) => setDurationMonths(x.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('profile.addProjectPlaceholderDuration')}
            keyboardType="number-pad"
          />
          <LabeledField
            label={t('profile.addProjectFieldReturn')}
            value={returnPct}
            onChangeText={setReturnPct}
            placeholder={t('profile.addProjectPlaceholderReturn')}
            keyboardType="decimal-pad"
          />
        </View>

        <Text className="mb-2 px-1 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
          {t('profile.addProjectSectionFiles')}
        </Text>
        <View className="mb-4 gap-3 rounded-2xl border p-4" style={{ backgroundColor: cardBg, borderColor }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickCover()}
            className="flex-row-reverse items-center justify-between rounded-2xl border px-3 py-3 active:opacity-80"
            style={{ borderColor, backgroundColor: inputBg }}>
            <Ionicons name="image-outline" size={22} color={BRAND_NAVY} />
            <View className="min-w-0 flex-1 px-2">
              <Text className="text-right font-cairo-semibold text-sm" style={{ color: mainText }}>
                {t('profile.addProjectPickCover')}
              </Text>
              <Text className="mt-0.5 text-right font-cairo text-xs" style={{ color: subText }} numberOfLines={2}>
                {coverAsset?.name ?? t('profile.editProjectKeepFileHint')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickPdf()}
            className="flex-row-reverse items-center justify-between rounded-2xl border px-3 py-3 active:opacity-80"
            style={{ borderColor, backgroundColor: inputBg }}>
            <Ionicons name="document-text-outline" size={22} color={BRAND_NAVY} />
            <View className="min-w-0 flex-1 px-2">
              <Text className="text-right font-cairo-semibold text-sm" style={{ color: mainText }}>
                {t('profile.addProjectPickPdf')}
              </Text>
              <Text className="mt-0.5 text-right font-cairo text-xs" style={{ color: subText }} numberOfLines={2}>
                {pdfAsset?.name ?? t('profile.editProjectKeepFileHint')}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text className="mb-2 px-1 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
          {t('profile.addProjectSectionNarrative')}
        </Text>
        <View className="mb-2 gap-4 rounded-2xl border p-4" style={{ backgroundColor: cardBg, borderColor }}>
          <View>
            <Text
              className="mb-1.5 font-cairo text-sm text-gray-800"
              style={{ textAlign, writingDirection }}>
              {t('profile.addProjectFieldDescription')}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('profile.addProjectPlaceholderDescription')}
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              className="min-h-[120px] rounded-2xl px-3 py-3 font-cairo text-base text-gray-900"
              style={{ backgroundColor: inputBg, textAlign, writingDirection }}
            />
          </View>
          <View>
            <Text
              className="mb-1.5 font-cairo text-sm text-gray-800"
              style={{ textAlign, writingDirection }}>
              {t('profile.addProjectFieldRisks')}
            </Text>
            <TextInput
              value={riskAnalysis}
              onChangeText={setRiskAnalysis}
              placeholder={t('profile.addProjectPlaceholderRisks')}
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              className="min-h-[120px] rounded-2xl px-3 py-3 font-cairo text-base text-gray-900"
              style={{ backgroundColor: inputBg, textAlign, writingDirection }}
            />
          </View>
        </View>
      </ScrollView>

      <View
        className="border-t"
        style={{
          backgroundColor: cardBg,
          borderTopWidth: 1,
          borderTopColor: borderColor,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={() => void onSave()}
          className="items-center justify-center rounded-2xl py-4 active:opacity-90"
          style={{ backgroundColor: BRAND_NAVY, opacity: saving ? 0.75 : 1 }}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-cairo-bold text-base text-white">{t('profile.editProjectSave')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
