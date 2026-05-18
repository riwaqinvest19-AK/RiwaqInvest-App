import { MaterialIcons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { type Href, Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  I18nManager,
  Keyboard,
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
import { getAuthEmailRedirectTo } from '@/lib/authRedirect';
import { isEmailConfirmed } from '@/lib/authSession';
import { showAuthAlert } from '@/lib/showAppAlert';
import { getSupabaseConfigErrorKey, mapAuthErrorMessage } from '@/lib/supabaseConfig';
import { supabase } from '@/lib/supabase';

const ICON = '#6B7C93';

export default function SignupScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+213 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  if (!fontsLoaded) {
    return null;
  }

  const onSubmit = async () => {
    setFormError(null);
    setAwaitingEmailConfirmation(false);
    Keyboard.dismiss();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      const msg = t('auth.validationRequiredFields');
      setFormError(msg);
      showAuthAlert('', msg);
      return;
    }
    if (password.length < 6) {
      const msg = t('auth.validationPasswordShort');
      setFormError(msg);
      showAuthAlert('', msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = t('auth.validationPasswordMismatch');
      setFormError(msg);
      showAuthAlert('', msg);
      return;
    }

    const configKey = getSupabaseConfigErrorKey();
    if (configKey) {
      const msg = t(configKey);
      setFormError(msg);
      showAuthAlert('', msg);
      return;
    }

    setSubmitting(true);
    const emailRedirectTo = getAuthEmailRedirectTo();
    if (__DEV__) {
      console.log('[signup] emailRedirectTo:', emailRedirectTo);
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: trimmedName,
            phone: trimmedPhone || undefined,
          },
        },
      });

      if (error) {
        console.error('[signup] Supabase signUp error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          emailRedirectTo,
        });
        const msg = mapAuthErrorMessage(error.message, t);
        setFormError(msg);
        showAuthAlert('', msg);
        return;
      }

      if (data.session && isEmailConfirmed(data.user)) {
        router.replace('/(tabs)');
        return;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }

      const successTitle = t('auth.signupCheckEmailTitle');
      const successMsg = t('auth.signupCheckEmail', { email: trimmedEmail });
      setFormError(null);
      setRegisteredEmail(trimmedEmail);
      setAwaitingEmailConfirmation(true);
      setFullName('');
      setPassword('');
      setConfirmPassword('');
      showAuthAlert(successTitle, successMsg);
    } catch (err) {
      console.error('[signup] Unexpected signUp failure:', err, { emailRedirectTo });
      const msg = t('auth.errorGeneric');
      setFormError(msg);
      showAuthAlert('', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const writingDirection = I18nManager.isRTL ? 'rtl' : 'ltr';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      keyboardVerticalOffset={0}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 40, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View className="items-center pt-2">
          <RiwaqLogo />
        </View>

        <Text
          className="mt-5 text-center font-cairo-bold text-2xl text-brand-navy"
          style={{ writingDirection }}>
          {t('auth.signupTitle')}
        </Text>

        {awaitingEmailConfirmation ? (
          <View
            className="mt-5 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4"
            accessibilityRole="alert">
            <View className="flex-row items-start gap-3" style={{ flexDirection: 'row-reverse' }}>
              <MaterialIcons name="mark-email-read" size={28} color="#047857" />
              <View className="flex-1">
                <Text
                  className="font-cairo-bold text-base text-emerald-900"
                  style={{ textAlign: 'right', writingDirection }}>
                  {t('auth.signupCheckEmailTitle')}
                </Text>
                <Text
                  className="mt-2 font-cairo text-sm leading-6 text-emerald-800"
                  style={{ textAlign: 'right', writingDirection }}>
                  {t('auth.signupPendingBanner', {
                    email: registeredEmail ?? email.trim(),
                  })}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View className="mt-6 w-full gap-4">
          <LabeledField
            label={t('auth.fullName')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('auth.fullNamePlaceholder')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            startAdornment={
              <MaterialIcons name="person-outline" size={22} color={ICON} />
            }
          />
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
            label={t('auth.phone')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('auth.phonePlaceholder')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            startAdornment={
              <MaterialIcons name="phone" size={22} color={ICON} />
            }
          />
          <LabeledField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            textContentType="newPassword"
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
          <LabeledField
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry={!showConfirm}
            autoComplete="password-new"
            textContentType="newPassword"
            startAdornment={
              <MaterialIcons name="lock" size={22} color={ICON} />
            }
            endAdornment={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirm
                    ? t('auth.a11yHidePassword')
                    : t('auth.a11yShowPassword')
                }
                onPress={() => setShowConfirm((p) => !p)}
                hitSlop={12}
                className="p-1">
                <MaterialIcons
                  name={showConfirm ? 'visibility' : 'visibility-off'}
                  size={22}
                  color={ICON}
                />
              </Pressable>
            }
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => void onSubmit()}
          />
        </View>

        {formError ? (
          <Text
            className="mt-4 rounded-xl bg-red-50 px-3 py-3 font-cairo text-sm leading-6 text-red-700"
            style={{ textAlign: 'right', writingDirection }}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          disabled={submitting}
          className="mt-8 h-14 w-full items-center justify-center rounded-2xl bg-brand-navy active:opacity-90 disabled:opacity-60"
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
            <Text className="font-cairo-bold text-lg text-white">{t('auth.signupButton')}</Text>
          )}
        </Pressable>

        <View className="mt-6 flex-row flex-wrap items-center justify-center">
          <Text className="text-center font-cairo text-sm text-gray-600">
            {t('auth.hasAccountQuestion')}{' '}
          </Text>
          <Link href={'/(auth)/login' as Href} asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text className="text-center font-cairo text-sm text-sky-700">
                {t('auth.signInLink')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
