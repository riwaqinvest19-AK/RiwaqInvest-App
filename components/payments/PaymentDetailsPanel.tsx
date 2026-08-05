import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { I18nManager, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import {
  PAYMENT_ACCOUNT_HOLDER,
  PAYMENT_BANK_NAME,
  PAYMENT_RIB_COPY,
  PAYMENT_RIB_DISPLAY,
  PAYMENT_RIP_COPY,
  PAYMENT_RIP_DISPLAY,
} from '@/constants/PaymentDetails';

const BRAND = '#154375';

type DetailRowProps = {
  label: string;
  value: string;
  copyValue: string;
  onCopy: (value: string) => void;
  isLast?: boolean;
};

function DetailRow({ label, value, copyValue, onCopy, isLast }: DetailRowProps) {
  return (
    <View
      className="flex-row items-center px-4 py-3.5"
      style={
        !isLast
          ? { borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.35)' }
          : undefined
      }>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onCopy(copyValue)}
        className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
        style={{ backgroundColor: '#EEF2F6' }}>
        <Ionicons name="copy-outline" size={18} color={BRAND} />
      </Pressable>
      <View className="min-w-0 flex-1 px-3">
        <Text className="font-cairo text-xs text-muted-label" style={{ textAlign: 'right' }}>
          {label}
        </Text>
        <Text
          className="mt-1 font-cairo-semibold text-sm text-neutral-900"
          style={{ textAlign: 'right', writingDirection: 'ltr' }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function PaymentDetailsPanel({
  variant = 'light',
  showRip = true,
}: {
  variant?: 'light' | 'dark';
  showRip?: boolean;
}) {
  const { t } = useTranslation();
  const isDark = variant === 'dark';

  const onCopy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Toast.show({
      type: 'success',
      text1: t('wallet.copySuccess'),
      position: 'bottom',
    });
  };

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F5F8FC',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(148,163,184,0.25)',
      }}>
      <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.25)' }}>
        <Text
          className="font-cairo-bold text-sm"
          style={{ color: isDark ? '#fff' : '#0f172a', textAlign: 'right' }}>
          {t('wallet.paymentDetailsTitle')}
        </Text>
        <Text
          className="mt-1 font-cairo text-xs leading-5"
          style={{ color: isDark ? 'rgba(255,255,255,0.78)' : '#64748b', textAlign: 'right' }}>
          {showRip ? t('wallet.paymentDetailsSubtitleCcp') : t('wallet.paymentDetailsSubtitleBank')}
        </Text>
      </View>

      <DetailRow
        label={t('wallet.accountHolder')}
        value={PAYMENT_ACCOUNT_HOLDER}
        copyValue={PAYMENT_ACCOUNT_HOLDER}
        onCopy={onCopy}
      />
      <DetailRow
        label={t('wallet.bankName')}
        value={PAYMENT_BANK_NAME}
        copyValue={PAYMENT_BANK_NAME}
        onCopy={onCopy}
      />
      <DetailRow
        label={t('wallet.ribNumber')}
        value={PAYMENT_RIB_DISPLAY}
        copyValue={PAYMENT_RIB_COPY}
        onCopy={onCopy}
        isLast={!showRip}
      />
      {showRip ? (
        <DetailRow
          label={t('wallet.ripNumber')}
          value={PAYMENT_RIP_DISPLAY}
          copyValue={PAYMENT_RIP_COPY}
          onCopy={onCopy}
          isLast
        />
      ) : null}
    </View>
  );
}
