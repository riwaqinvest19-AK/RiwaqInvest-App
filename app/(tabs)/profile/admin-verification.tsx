import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  I18nManager,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { checkProfileAdmin } from '@/lib/checkProfileAdmin';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';

type PendingRow = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  identity_document_path: string | null;
};

export default function AdminVerificationScreen() {
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

  const [gateLoading, setGateLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const borderColor = isDark ? '#38383a' : '#E8ECF0';
  const mainText = isDark ? '#f2f2f7' : '#0f172a';
  const subText = isDark ? '#a1a1a6' : '#6B7C93';

  const chevronBack = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';

  const loadPending = useCallback(async () => {
    setListLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, identity_document_path')
        .eq('verification_status', 'pending')
        .order('full_name', { ascending: true });

      if (error) {
        console.warn('[admin-kyc]', error.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as PendingRow[]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const checkAdminAndLoad = useCallback(async () => {
    setGateLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        setAllowed(false);
        router.replace('/(auth)/login');
        return;
      }

      const { isAdmin: ok } = await checkProfileAdmin(user.id);
      setAllowed(ok);
      if (ok) {
        await loadPending();
      }
    } finally {
      setGateLoading(false);
    }
  }, [loadPending, router]);

  useFocusEffect(
    useCallback(() => {
      void checkAdminAndLoad();
    }, [checkAdminAndLoad]),
  );

  const signedUrlForPath = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from('identity-verifications')
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      console.warn('[admin-kyc] signed url', error?.message);
      return null;
    }
    return data.signedUrl;
  }, []);

  const onApprove = async (userId: string) => {
    setActionId(userId);
    try {
      const { error } = await supabase.rpc('admin_review_identity', {
        p_user_id: userId,
        p_approve: true,
      });
      if (error) {
        console.warn('[admin-kyc] approve', error.message);
        Toast.show({
          type: 'error',
          text1: 'تعذّر تأكيد الهوية',
          text2: error.message,
          position: 'bottom',
        });
        return;
      }
      Toast.show({
        type: 'success',
        text1: 'تم تأكيد الهوية بنجاح',
        position: 'bottom',
      });
      setRows((prev) => prev.filter((r) => r.id !== userId));
      await loadPending();
    } finally {
      setActionId(null);
    }
  };

  const onReject = async (userId: string) => {
    setActionId(userId);
    try {
      const { error } = await supabase.rpc('admin_review_identity', {
        p_user_id: userId,
        p_approve: false,
      });
      if (error) {
        console.warn('[admin-kyc] reject', error.message);
        Toast.show({
          type: 'error',
          text1: 'تعذّر رفض الطلب',
          text2: error.message,
          position: 'bottom',
        });
        return;
      }
      Toast.show({
        type: 'success',
        text1: 'تم رفض الطلب',
        position: 'bottom',
      });
      setRows((prev) => prev.filter((r) => r.id !== userId));
      await loadPending();
    } finally {
      setActionId(null);
    }
  };

  const openDocument = async (path: string) => {
    const url = await signedUrlForPath(path);
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (gateLoading) {
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
              {t('profile.adminVerificationBack')}
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

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
      <View className="flex-row-reverse items-center justify-between px-4 py-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="flex-row-reverse items-center gap-1 rounded-lg px-2 py-2 active:opacity-70">
          <Text className="font-cairo-semibold text-base" style={{ color: BRAND_NAVY }}>
            {t('profile.adminVerificationBack')}
          </Text>
          <Ionicons name={chevronBack} size={22} color={BRAND_NAVY} />
        </Pressable>
        <Text className="font-cairo-bold text-lg" style={{ color: mainText }}>
          {t('profile.adminVerificationTitle')}
        </Text>
        <View className="w-16" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}>
        {listLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={BRAND_NAVY} />
          </View>
        ) : rows.length === 0 ? (
          <View className="mt-10 items-center px-4">
            <MaterialIcons name="inbox" size={48} color={subText} />
            <Text className="mt-4 text-center font-cairo text-base" style={{ color: subText }}>
              {t('profile.adminVerificationEmpty')}
            </Text>
          </View>
        ) : (
          rows.map((row) => (
            <PendingCard
              key={row.id}
              row={row}
              cardBg={cardBg}
              borderColor={borderColor}
              mainText={mainText}
              subText={subText}
              busy={actionId === row.id}
              onApprove={() => void onApprove(row.id)}
              onReject={() => void onReject(row.id)}
              onOpenPdf={() => void openDocument(row.identity_document_path ?? '')}
              signedLoader={signedUrlForPath}
              t={t}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PendingCard({
  row,
  cardBg,
  borderColor,
  mainText,
  subText,
  busy,
  onApprove,
  onReject,
  onOpenPdf,
  signedLoader,
  t,
}: {
  row: PendingRow;
  cardBg: string;
  borderColor: string;
  mainText: string;
  subText: string;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenPdf: () => void;
  signedLoader: (path: string) => Promise<string | null>;
  t: (k: string) => string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const path = row.identity_document_path;
  const isPdf = path?.toLowerCase().endsWith('.pdf') ?? false;

  useEffect(() => {
    let cancelled = false;
    if (!path || isPdf) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    void (async () => {
      const url = await signedLoader(path);
      if (!cancelled) {
        setPreviewUrl(url);
        setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, isPdf, signedLoader]);

  const displayName =
    row.full_name?.trim() ||
    row.phone_number?.trim() ||
    t('profile.fallbackName');

  return (
    <View
      className="mb-4 rounded-2xl border p-4"
      style={{ backgroundColor: cardBg, borderColor }}>
      <Text className="font-cairo-bold text-lg" style={{ color: mainText, textAlign: 'right' }}>
        {displayName}
      </Text>
      {row.phone_number ? (
        <Text className="mt-1 font-cairo text-sm" style={{ color: subText, textAlign: 'right' }}>
          {row.phone_number}
        </Text>
      ) : null}

      <View className="mt-4 overflow-hidden rounded-xl" style={{ borderWidth: 1, borderColor }}>
        {!path ? (
          <View className="items-center justify-center py-10 px-3">
            <Text className="text-center font-cairo text-sm" style={{ color: subText }}>
              {t('profile.adminVerificationNoDocument')}
            </Text>
          </View>
        ) : isPdf ? (
          <Pressable
            onPress={onOpenPdf}
            className="flex-row-reverse items-center justify-center gap-2 py-10 active:opacity-80">
            <MaterialIcons name="picture-as-pdf" size={28} color={BRAND_NAVY} />
            <Text className="font-cairo-semibold text-base" style={{ color: BRAND_NAVY }}>
              {t('profile.adminVerificationOpenPdf')}
            </Text>
          </Pressable>
        ) : previewLoading ? (
          <View className="h-48 items-center justify-center">
            <ActivityIndicator color={BRAND_NAVY} />
          </View>
        ) : previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={{ width: '100%', height: 220 }}
            resizeMode="contain"
          />
        ) : (
          <View className="items-center justify-center py-10">
            <Text className="font-cairo text-sm" style={{ color: subText }}>
              {t('profile.adminVerificationPreviewError')}
            </Text>
          </View>
        )}
      </View>

      <View className="mt-4 flex-row-reverse gap-3">
        <Pressable
          disabled={busy}
          onPress={onApprove}
          className="flex-1 rounded-xl py-3.5 active:opacity-90"
          style={{ backgroundColor: BRAND_NAVY, opacity: busy ? 0.6 : 1 }}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center font-cairo-bold text-base text-white">
              {t('profile.adminVerificationConfirm')}
            </Text>
          )}
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onReject}
          className="flex-1 rounded-xl border-2 border-red-400 py-3.5 active:opacity-90 dark:border-red-700"
          style={{ opacity: busy ? 0.6 : 1 }}>
          <Text className="text-center font-cairo-bold text-base text-red-700 dark:text-red-400">
            {t('profile.adminVerificationReject')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
