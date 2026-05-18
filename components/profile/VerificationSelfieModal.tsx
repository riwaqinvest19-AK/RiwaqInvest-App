import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#154375';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
};

export function VerificationSelfieModal({ visible, onClose, onCaptured }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) setReady(false);
  }, [visible]);

  const requestCam = useCallback(async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const onCapture = async () => {
    if (!camRef.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: Platform.OS === 'android',
        shutterSound: false,
      });
      if (photo?.uri) {
        onCaptured(photo.uri);
        onClose();
      }
    } catch (e) {
      console.warn('[selfie-modal]', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onShow={() => void requestCam()}>
      <View className="flex-1 bg-black" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose} className="p-2">
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text className="flex-1 text-center font-cairo-bold text-base text-white">
            {t('profile.verificationSelfieModalTitle')}
          </Text>
          <View className="w-10" />
        </View>

        {!permission?.granted ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center font-cairo text-sm leading-6 text-white/90">
              {t('profile.verificationCameraPermissionBody')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void requestPermission()}
              className="mt-6 rounded-xl bg-white px-6 py-3">
              <Text className="font-cairo-bold text-brand-navy">{t('profile.verificationCameraPermissionCta')}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-1 px-3 pb-4">
            <View className="flex-1 overflow-hidden rounded-2xl bg-neutral-900">
              <CameraView
                ref={camRef}
                style={{ flex: 1 }}
                facing="front"
                mirror
                active={visible}
                mode="picture"
                onCameraReady={() => setReady(true)}
              />
            </View>
            <Text className="mt-3 px-1 text-center font-cairo text-xs leading-5 text-white/85">
              {t('profile.verificationSelfieHint')}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={!ready || busy}
              onPress={() => void onCapture()}
              className="mt-4 h-14 items-center justify-center rounded-2xl bg-brand-navy disabled:opacity-50">
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-cairo-bold text-base text-white">{t('profile.verificationSelfieCapture')}</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
