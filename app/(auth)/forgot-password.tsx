import { MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
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
import { getPasswordResetRedirectTo } from '@/lib/authRedirect';
import { supabase } from '@/lib/supabase';

const ICON = '#6B7C93';

export default function ForgotPasswordScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const writingDirection = I18nManager.isRTL ? 'rtl' : 'ltr';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!fontsLoaded) {
    return null;
  }

  const onSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('', t('auth.validationRequiredFields'));
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo = getPasswordResetRedirectTo();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (error) {
        Alert.alert('', error.message || t('auth.errorGeneric'));
        return;
      }
      setSent(true);
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
          onPress={() => router.back()}
          className="mb-4 w-12 py-2 active:opacity-80"
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
          className="mt-8 text-center font-cairo-bold text-2xl text-brand-navy"
          style={{ writingDirection }}>
          {t('auth.forgotPasswordTitle')}
        </Text>
        <Text
          className="mt-3 text-center font-cairo text-sm leading-6 text-muted-label"
          style={{ writingDirection }}>
          {sent ? t('auth.forgotPasswordSent') : t('auth.forgotPasswordHint')}
        </Text>

        {!sent ? (
          <>
            <View className="mt-8 w-full">
              <LabeledField
                label={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                startAdornment={<MaterialIcons name="email" size={22} color={ICON} />}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              className="mt-10 h-14 w-full items-center justify-center rounded-2xl bg-brand-navy active:opacity-90 disabled:opacity-60"
              onPress={() => void onSend()}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-cairo-bold text-lg text-white">{t('auth.forgotPasswordSend')}</Text>
              )}
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
