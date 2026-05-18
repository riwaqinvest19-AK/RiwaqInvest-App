import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  I18nManager,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  dismissAppDialog,
  subscribeAppDialog,
  type AppDialogPayload,
} from '@/lib/appDialog';

const BRAND_NAVY = '#004080';

export function AppDialogHost() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<AppDialogPayload | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    return subscribeAppDialog(setDialog);
  }, []);

  if (Platform.OS !== 'web' || dialog == null) {
    return null;
  }

  const rtl = I18nManager.isRTL;
  const writingDirection = rtl ? ('rtl' as const) : ('ltr' as const);

  const close = () => {
    dismissAppDialog();
    setDialog(null);
  };

  const onChoice = (onPress?: () => void) => {
    close();
    onPress?.();
  };

  const okLabel = t('common.ok');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/45 px-5"
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}>
        <Pressable
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white px-5 py-5 shadow-lg"
          onPress={(e) => e.stopPropagation()}
          style={Platform.OS === 'web' ? { cursor: 'default' } : undefined}>
          {dialog.title ? (
            <Text
              className="text-center font-cairo-bold text-lg text-brand-navy"
              style={{ writingDirection }}>
              {dialog.title}
            </Text>
          ) : null}
          {dialog.message ? (
            <Text
              className={`text-center font-cairo text-sm leading-6 text-gray-600 ${
                dialog.title ? 'mt-3' : ''
              }`}
              style={{ writingDirection }}>
              {dialog.message}
            </Text>
          ) : null}

          {dialog.kind === 'alert' ? (
            <Pressable
              accessibilityRole="button"
              onPress={close}
              className="mt-5 h-12 items-center justify-center rounded-xl bg-brand-navy active:opacity-90"
              style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
              <Text className="font-cairo-bold text-base text-white">{dialog.okLabel || okLabel}</Text>
            </Pressable>
          ) : (
            <View className="mt-5 gap-2">
              {dialog.choices.map((choice, idx) => (
                <Pressable
                  key={`${dialog.id}-${idx}-${choice.label}`}
                  accessibilityRole="button"
                  onPress={() => onChoice(choice.onPress)}
                  className="h-12 items-center justify-center rounded-xl bg-brand-navy active:opacity-90"
                  style={
                    Platform.OS === 'web'
                      ? { cursor: 'pointer', backgroundColor: BRAND_NAVY }
                      : { backgroundColor: BRAND_NAVY }
                  }>
                  <Text className="font-cairo-bold text-base text-white">{choice.label}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={close}
                className="h-12 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 active:opacity-90"
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
                <Text className="font-cairo-semibold text-base text-gray-800">{dialog.cancelLabel}</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
