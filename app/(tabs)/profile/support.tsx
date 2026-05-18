import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
  I18nManager,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SocialMediaLinks } from '@/components/SocialMediaLinks';
import { useColorScheme } from '@/components/useColorScheme';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_E164,
  SUPPORT_WHATSAPP_E164,
} from '@/constants/Support';
import { SUPPORT_ATTACHMENT_MAX_BYTES, uploadSupportAttachment } from '@/lib/supportAttachments';
import { normalizeKycMime } from '@/lib/identityVerificationUpload';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';
const SUBMIT_DISABLED = '#8FA0B3';

function bytesToHint(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

async function copyToClipboard(value: string) {
  await Clipboard.setStringAsync(value);
  Toast.show({
    type: 'success',
    text1: 'تم النسخ',
    position: 'bottom',
  });
}

async function openEmail(errorMessage: string) {
  const url = `mailto:${SUPPORT_EMAIL}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  } else {
    Alert.alert('', errorMessage);
  }
}

async function openPhone(errorMessage: string) {
  const url = `tel:+${SUPPORT_PHONE_E164}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  } else {
    Alert.alert('', errorMessage);
  }
}

async function openWhatsApp() {
  const text = encodeURIComponent('مرحباً، أحتاج مساعدة من فريق الدعم.');
  const appUrl = `whatsapp://send?phone=${SUPPORT_WHATSAPP_E164}&text=${text}`;
  const webUrl = `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${text}`;
  try {
    const canApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canApp ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#FFFFFF';
  const borderMuted = isDark ? '#3f3f46' : '#E5E7EB';
  const mainText = isDark ? '#f2f2f7' : '#111827';
  const subText = isDark ? '#a1a1a6' : '#6B7280';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#F3F5F7';

  const chevronBack = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';

  const canSubmit = useMemo(() => {
    return subject.trim().length > 0 && message.trim().length > 0 && !submitting;
  }, [subject, message, submitting]);

  const pickAttachment = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];

    const canonical = normalizeKycMime(asset.mimeType, asset.name, asset.uri);
    const allowed = canonical === 'image/jpeg' || canonical === 'image/png' || canonical === 'application/pdf';
    if (!allowed) {
      Toast.show({ type: 'error', text1: 'نوع الملف غير مدعوم', position: 'bottom' });
      return;
    }
    if (typeof asset.size === 'number' && asset.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      Toast.show({
        type: 'error',
        text1: 'حجم الملف كبير جداً',
        text2: `الحد الأقصى ${bytesToHint(SUPPORT_ATTACHMENT_MAX_BYTES)}`,
        position: 'bottom',
      });
      return;
    }

    setAttachment(asset);
  };

  const onSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        Toast.show({ type: 'error', text1: 'يرجى تسجيل الدخول أولاً', position: 'bottom' });
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          message: message.trim(),
          attachment_urls: [],
        })
        .select('id')
        .single();

      if (insertError || !inserted?.id) {
        Toast.show({ type: 'error', text1: 'تعذّر إرسال الرسالة', text2: insertError?.message, position: 'bottom' });
        return;
      }

      if (attachment) {
        const upload = await uploadSupportAttachment({
          userId: user.id,
          ticketId: inserted.id,
          asset: attachment,
        });

        if (!upload.ok) {
          Toast.show({
            type: 'error',
            text1: upload.code === 'FILE_TOO_LARGE' ? 'حجم الملف كبير جداً' : 'تعذّر رفع المرفق',
            text2: upload.reason,
            position: 'bottom',
          });
          return;
        }

        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ attachment_urls: [upload.url] })
          .eq('id', inserted.id);

        if (updateError) {
          Toast.show({
            type: 'error',
            text1: 'تم إرسال الرسالة لكن تعذّر حفظ رابط المرفق',
            text2: updateError.message,
            position: 'bottom',
          });
          return;
        }
      }

      setSubject('');
      setMessage('');
      setAttachment(null);

      Toast.show({ type: 'success', text1: 'تم إرسال رسالتك بنجاح', position: 'bottom' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

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
            <Ionicons name={chevronBack} size={26} color="#fff" />
          </Pressable>
          <Text className="flex-1 font-cairo-bold text-lg text-white" style={{ textAlign: 'center' }}>
            اتصل بالدعم
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: insets.bottom + 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text className="mb-3 font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
          التواصل السريع
        </Text>

        <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: borderMuted }}>
          <QuickCard
            title="البريد الإلكتروني للدعم"
            value={SUPPORT_EMAIL}
            iconName="mail-outline"
            onOpen={() => void openEmail(t('profile.cannotOpenEmail'))}
            onCopy={() => void copyToClipboard(SUPPORT_EMAIL)}
            mainText={mainText}
            subText={subText}
            borderMuted={borderMuted}
          />
          <QuickCard
            title="الهاتف"
            value={SUPPORT_PHONE_DISPLAY}
            iconName="call"
            onOpen={() => void openPhone(t('profile.cannotOpenPhone'))}
            onCopy={() => void copyToClipboard(SUPPORT_PHONE_DISPLAY)}
            mainText={mainText}
            subText={subText}
            borderMuted={borderMuted}
          />
          <QuickCard
            title="دعم واتساب"
            value={SUPPORT_PHONE_DISPLAY}
            iconName="chat"
            isLast
            onOpen={() => void openWhatsApp()}
            onCopy={() => void copyToClipboard(SUPPORT_PHONE_DISPLAY)}
            mainText={mainText}
            subText={subText}
            borderMuted={borderMuted}
          />
        </View>

        <View
          className="mt-6 rounded-2xl px-4 py-5"
          style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: borderMuted }}>
          <SocialMediaLinks titleAlign="right" titleStyle={{ color: mainText }} />
        </View>

        <Text className="mb-3 mt-6 font-cairo-bold text-base" style={{ color: mainText, textAlign: 'right' }}>
          إرسال رسالة
        </Text>

        <Text className="mb-2 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
          الموضوع
        </Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="ما الذي يمكننا مساعدتك فيه؟"
          placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
          className="rounded-2xl px-4 py-3 font-cairo"
          style={{ backgroundColor: inputBg, color: mainText, textAlign: 'right' }}
        />

        <Text className="mb-2 mt-4 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
          message
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="اكتب رسالتك هنا..."
          placeholderTextColor={isDark ? '#9ca3af' : '#94a3b8'}
          multiline
          textAlignVertical="top"
          className="rounded-2xl px-4 py-3 font-cairo"
          style={{ backgroundColor: inputBg, color: mainText, minHeight: 160, textAlign: 'right' }}
        />

        <Text className="mb-2 mt-5 font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
          مرفق (اختياري)
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={pickAttachment}
          className="items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 active:opacity-80"
          style={{ borderColor: borderMuted, backgroundColor: cardBg }}>
          <MaterialIcons name="attach-file" size={26} color={subText} />
          <Text className="mt-2 font-cairo-semibold text-sm" style={{ color: mainText, textAlign: 'center' }}>
            إرفاق ملف (صورة أو مستند)
          </Text>
          <Text className="mt-1 font-cairo text-xs" style={{ color: subText, textAlign: 'center' }}>
            JPG • PNG • PDF — max {bytesToHint(SUPPORT_ATTACHMENT_MAX_BYTES)}
          </Text>
          {attachment?.name ? (
            <View className="mt-3 w-full flex-row-reverse items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: inputBg }}>
              <Text className="flex-1 font-cairo text-xs" style={{ color: mainText, textAlign: 'right' }} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setAttachment(null)}
                className="ml-2 rounded-lg px-2 py-1 active:opacity-80">
                <Text className="font-cairo-semibold text-xs" style={{ color: BRAND_NAVY }}>
                  إزالة
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={() => void onSubmit()}
          className="mt-7 flex-row-reverse items-center justify-center rounded-xl py-4"
          style={{ backgroundColor: canSubmit ? BRAND_NAVY : SUBMIT_DISABLED }}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text className="ml-2 font-cairo-bold text-base text-white">إرسال رسالة</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function QuickCard({
  title,
  value,
  iconName,
  onOpen,
  onCopy,
  mainText,
  subText,
  borderMuted,
  isLast,
}: {
  title: string;
  value: string;
  iconName: 'mail-outline' | 'call' | 'chat';
  onOpen: () => void;
  onCopy: () => void;
  mainText: string;
  subText: string;
  borderMuted: string;
  isLast?: boolean;
}) {
  return (
    <View style={!isLast ? { borderBottomWidth: 1, borderBottomColor: borderMuted } : undefined}>
      <View className="flex-row-reverse items-center px-4 py-4" style={{ gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onCopy}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: '#EEF2F6' }}>
          <Ionicons name="copy-outline" size={18} color={BRAND_NAVY} />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onOpen} className="flex-1 active:opacity-80">
          <Text className="font-cairo text-xs" style={{ color: subText, textAlign: 'right' }}>
            {title}
          </Text>
          <Text className="mt-1 font-cairo-semibold text-sm" style={{ color: mainText, textAlign: 'right' }}>
            {value}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: '#EEF2F6' }}>
          <MaterialIcons name={iconName} size={18} color={BRAND_NAVY} />
        </Pressable>
      </View>
    </View>
  );
}

