import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
};

export function VerificationSelfieModal({ visible, onClose, onCaptured }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      setReady(true);
    } catch (e) {
      console.warn('[selfie-modal-web]', e);
      setPermissionDenied(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      stopStream();
      setReady(false);
      setPermissionDenied(false);
      return;
    }
    void startCamera();
    return () => {
      stopStream();
    };
  }, [visible, startCamera, stopStream]);

  const onCapture = () => {
    const video = videoRef.current;
    if (!video || !ready || busy || video.videoWidth === 0) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCaptured(URL.createObjectURL(blob));
            onClose();
          }
          setBusy(false);
        },
        'image/jpeg',
        0.85,
      );
    } catch (e) {
      console.warn('[selfie-modal-web] capture', e);
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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

        {permissionDenied ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center font-cairo text-sm leading-6 text-white/90">
              {t('profile.verificationCameraPermissionBody')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void startCamera()}
              className="mt-6 rounded-xl bg-white px-6 py-3">
              <Text className="font-cairo-bold text-brand-navy">{t('profile.verificationCameraPermissionCta')}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-1 px-3 pb-4">
            <View className="flex-1 overflow-hidden rounded-2xl bg-neutral-900">
              {createElement('video', {
                ref: (el: HTMLVideoElement | null) => {
                  videoRef.current = el;
                },
                playsInline: true,
                muted: true,
                autoPlay: true,
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                },
              })}
            </View>
            <Text className="mt-3 px-1 text-center font-cairo text-xs leading-5 text-white/85">
              {t('profile.verificationSelfieHint')}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={!ready || busy}
              onPress={onCapture}
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
