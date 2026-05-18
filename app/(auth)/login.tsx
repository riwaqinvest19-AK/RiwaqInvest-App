import { MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
  authenticateWithBiometrics,
  biometricI18nSuffix,
  getBiometricCapability,
} from '@/lib/biometricAuth';
import { getBiometricLoginEnabled } from '@/lib/biometricPreference';
import { readBiometricLoginPayload, saveBiometricLoginPayload } from '@/lib/biometricLogin';
import { getAuthEmailRedirectTo } from '@/lib/authRedirect';
import { processWebAuthCallbackOnLoad } from '@/lib/authEmailCallback';
import { isEmailConfirmed } from '@/lib/authSession';
import { showAppAlert, showAuthAlert } from '@/lib/showAppAlert';
import { getSupabaseConfigErrorKey, mapAuthErrorMessage } from '@/lib/supabaseConfig';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { supabase } from '@/lib/supabase';

const ICON = '#6B7C93';

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [biometricLoginVisible, setBiometricLoginVisible] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [emailConfirmedBanner, setEmailConfirmedBanner] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [bio, saved] = await Promise.all([
          getBiometricLoginEnabled(),
          AsyncStorage.getItem(STORAGE_KEYS.biometricCredentialsSaved),
        ]);
        setBiometricLoginVisible(bio && saved === 'true');

        if (Platform.OS === 'web') {
          const result = await processWebAuthCallbackOnLoad();
          if (result.handled && result.kind === 'email_confirmed') {
            setEmailConfirmedBanner(true);
          } else if (result.handled && result.kind === 'error') {
            showAuthAlert('', mapAuthErrorMessage(result.message, t));
          }
        }
      })();
    }, [t]),
  );

  if (!fontsLoaded) {
    return null;
  }

  const persistBiometricCredentialsIfEnabled = async (trimmedEmail: string, pwd: string) => {
    try {
      const bio = await getBiometricLoginEnabled();
      if (bio) {
        await saveBiometricLoginPayload({ email: trimmedEmail, password: pwd });
        await AsyncStorage.setItem(STORAGE_KEYS.biometricCredentialsSaved, 'true');
        setBiometricLoginVisible(true);
      }
    } catch (e) {
      console.warn('[login] biometric credential save', e);
    }
  };

  const onSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      showAppAlert('', t('auth.validationRequiredFields'));
      return;
    }

    const configKey = getSupabaseConfigErrorKey();
    if (configKey) {
      showAppAlert('', t(configKey));
      return;
    }

    setSubmitting(true);
    setShowResendConfirm(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          setShowResendConfirm(true);
        }
        showAppAlert('', mapAuthErrorMessage(error.message, t));
        return;
      }

      if (!isEmailConfirmed(data.user)) {
        await supabase.auth.signOut();
        setShowResendConfirm(true);
        showAppAlert('', t('auth.emailNotConfirmed'));
        return;
      }

      await persistBiometricCredentialsIfEnabled(trimmedEmail, password);
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  const onResendConfirmation = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showAppAlert('', t('auth.validationRequiredFields'));
      return;
    }
    setResendBusy(true);
    try {
      const emailRedirectTo = getAuthEmailRedirectTo();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo },
      });
      if (error) {
        showAppAlert('', mapAuthErrorMessage(error.message, t));
        return;
      }
      showAppAlert('', t('auth.resendConfirmSent'));
    } finally {
      setResendBusy(false);
    }
  };

  const onBiometricLogin = async () => {
    if (biometricBusy) return;
    setBiometricBusy(true);
    try {
      const cap = await getBiometricCapability();
      if (!cap.hasHardware) {
        Alert.alert('', t('profile.securityScreen.biometric.noHardware'));
        return;
      }
      if (!cap.isEnrolled) {
        const enrolledKey = `profile.securityScreen.biometric.notEnrolled.${biometricI18nSuffix(cap.kind)}`;
        Alert.alert('', t(enrolledKey, { defaultValue: t('profile.securityScreen.biometric.notEnrolled.generic') }));
        return;
      }
      const res = await authenticateWithBiometrics(t('auth.biometricPrompt'), t('auth.alertCancel'));
      if (!res.success) {
        return;
      }
      const creds = await readBiometricLoginPayload();
      if (!creds) {
        Alert.alert('', t('auth.biometricNoCredentials'));
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) {
        const msg = (error.message ?? '').toLowerCase();
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          showAppAlert('', t('auth.emailNotConfirmed'));
        } else {
          Alert.alert('', error.message || t('auth.errorInvalidCredentials'));
        }
        return;
      }
      if (!isEmailConfirmed(data.user)) {
        await supabase.auth.signOut();
        showAppAlert('', t('auth.emailNotConfirmed'));
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setBiometricBusy(false);
    }
  };

  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  const writingDirection = I18nManager.isRTL ? 'rtl' : 'ltr';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      keyboardVerticalOffset={0}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 32, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View className="items-center pt-4">
          <RiwaqLogo />
        </View>

        <Text
          className="mt-6 text-center font-cairo-bold text-2xl text-brand-navy"
          style={{ writingDirection }}>
          {t('auth.loginTitle')}
        </Text>
        <Text
          className="mt-1 text-center font-cairo text-sm text-muted-label"
          style={{ writingDirection }}>
          {t('auth.loginWelcome')}
        </Text>

        {emailConfirmedBanner ? (
          <View
            className="mt-5 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            accessibilityRole="alert">
            <Text
              className="font-cairo text-sm leading-6 text-emerald-800"
              style={{ textAlign, writingDirection }}>
              {t('auth.emailConfirmedSuccess')}
            </Text>
          </View>
        ) : null}

        <View className="mt-8 w-full gap-4">
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
          <LabeledField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            startAdornment={
              <MaterialIcons name="lock" size={22} color={ICON} />
            }
            endAdornment={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? t('auth.a11yHidePassword')
                    : t('auth.a11yShowPassword')
                }
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
        </View>

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/(auth)/forgot-password' as Href)}
          className="mt-2 w-full"
          hitSlop={6}>
          <Text
            className="w-full font-cairo text-sm text-sky-700"
            style={{ textAlign, writingDirection }}>
            {t('auth.forgotPassword')}
          </Text>
        </Pressable>

        {showResendConfirm ? (
          <Pressable
            accessibilityRole="button"
            disabled={resendBusy || submitting}
            onPress={() => void onResendConfirmation()}
            className="mt-3 w-full"
            hitSlop={6}>
            <Text
              className="w-full font-cairo text-sm text-sky-700"
              style={{ textAlign, writingDirection }}>
              {resendBusy ? '…' : t('auth.resendConfirmLink')}
            </Text>
          </Pressable>
        ) : null}

        {biometricLoginVisible ? (
          <Pressable
            accessibilityRole="button"
            disabled={biometricBusy || submitting}
            onPress={() => void onBiometricLogin()}
            className="mt-4 h-12 w-full flex-row items-center justify-center gap-2 rounded-2xl border-2 border-brand-navy active:opacity-90 disabled:opacity-60">
            {biometricBusy ? (
              <ActivityIndicator color="#154375" />
            ) : (
              <>
                <MaterialIcons name="fingerprint" size={24} color="#154375" />
                <Text className="font-cairo-bold text-base text-brand-navy">{t('auth.loginWithBiometric')}</Text>
              </>
            )}
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          disabled={submitting}
          className="mt-6 h-14 w-full items-center justify-center rounded-2xl bg-brand-navy active:opacity-90 disabled:opacity-60"
          style={Platform.OS === 'web' ? { cursor: submitting ? 'auto' : 'pointer' } : undefined}
          onPress={(e) => {
            if (Platform.OS === 'web') {
              e?.stopPropagation?.();
            }
            void onSubmit();
          }}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-cairo-bold text-lg text-white">{t('auth.loginButton')}</Text>
          )}
        </Pressable>

        <View className="mt-6 flex-row flex-wrap items-center justify-center">
          <Text className="text-center font-cairo text-sm text-gray-600">
            {t('auth.noAccountQuestion')}{' '}
          </Text>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.push('/(auth)/signup' as Href)}
            style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}>
            <Text className="text-center font-cairo text-sm text-sky-700">
              {t('auth.createAccountLink')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
