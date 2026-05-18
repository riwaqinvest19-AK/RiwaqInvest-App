import { MaterialIcons } from '@expo/vector-icons';
import { Cairo_400Regular, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabeledField } from '@/components/auth/LabeledField';
import { RiwaqLogo } from '@/components/RiwaqLogo';
import { setPasswordRecoveryActive } from '@/lib/authRecoveryState';
import { isEmailConfirmed } from '@/lib/authSession';
import { supabase } from '@/lib/supabase';

const ICON = '#6B7C93';

export default function ResetPasswordScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const writingDirection = I18nManager.isRTL ? 'rtl' : 'ltr';

  if (!fontsLoaded) {
    return null;
  }

  const onSubmit = async () => {
    if (password.length < 6) {
      Alert.alert('', t('auth.validationPasswordShort'));
      return;
    }
    if (password !== confirm) {
      Alert.alert('', t('auth.validationPasswordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('', error.message || t('auth.errorGeneric'));
        return;
      }
      setPasswordRecoveryActive(false);
      const { data: userData } = await supabase.auth.getUser();
      if (!isEmailConfirmed(userData.user)) {
        await supabase.auth.signOut();
        Alert.alert('', t('auth.emailNotConfirmed'));
        router.replace('/(auth)/login' as Href);
        return;
      }
      router.replace('/(tabs)' as Href);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void (async () => {
              await supabase.auth.signOut();
              setPasswordRecoveryActive(false);
              router.replace('/(auth)/login' as Href);
            })();
          }}
          className="mb-2 w-12 py-2 active:opacity-80"
          hitSlop={12}
          style={{ alignSelf: I18nManager.isRTL ? 'flex-end' : 'flex-start' }}>
          <MaterialIcons
            name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
            size={28}
            color="#154375"
          />
        </Pressable>

        <View className="items-center">
          <RiwaqLogo compact />
        </View>

        <Text
          className="mt-6 text-center font-cairo-bold text-2xl text-brand-navy"
          style={{ writingDirection }}>
          {t('auth.resetPasswordTitle')}
        </Text>
        <Text
          className="mt-2 text-center font-cairo text-sm leading-6 text-muted-label"
          style={{ writingDirection }}>
          {t('auth.resetPasswordHint')}
        </Text>

        <View className="mt-8 w-full gap-4">
          <LabeledField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            textContentType="newPassword"
            startAdornment={<MaterialIcons name="lock" size={22} color={ICON} />}
            endAdornment={
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={12}
                className="p-1">
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={22}
                  color={ICON}
                />
              </Pressable>
            }
          />
          <LabeledField
            label={t('auth.confirmPassword')}
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            textContentType="newPassword"
            startAdornment={<MaterialIcons name="lock-outline" size={22} color={ICON} />}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          className="mt-10 h-14 w-full items-center justify-center rounded-2xl bg-brand-navy active:opacity-90 disabled:opacity-60"
          onPress={() => void onSubmit()}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-cairo-bold text-lg text-white">{t('auth.resetPasswordSubmit')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
