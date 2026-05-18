import { Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabeledField } from '@/components/auth/LabeledField';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';

const BRAND_NAVY = '#154375';

export default function ChangePasswordScreen() {
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

  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';

  const onSave = async () => {
    if (!oldPassword || !password || !confirm) {
      Alert.alert('', t('auth.validationRequiredFields'));
      return;
    }
    if (password !== confirm) {
      Alert.alert('', t('auth.validationPasswordMismatch'));
      return;
    }
    if (password.length < 6) {
      Alert.alert('', t('auth.validationPasswordShort'));
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const email = user?.email;
      if (!email) {
        Alert.alert('', t('profile.verificationLoginRequired'));
        return;
      }

      // Re-authenticate with the old password before changing credentials.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        Alert.alert('', t('profile.securityScreen.password.invalidOldPassword'));
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('', t('profile.passwordChangeError'));
        return;
      }
      setOldPassword('');
      setPassword('');
      setConfirm('');
      Alert.alert('', t('profile.passwordChangeSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg, paddingTop: insets.top }}>
      <View className="flex-row-reverse items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND_NAVY }}>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          className="p-1">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-center font-cairo-bold text-lg text-white">
          {t('profile.securityTitle')}
        </Text>
        <View className="w-8" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ paddingBottom: insets.bottom }}>
        <ScrollView className="flex-grow px-4 pb-8 pt-6" keyboardShouldPersistTaps="handled">
          <View className="rounded-2xl p-4" style={{ backgroundColor: cardBg }}>
            <LabeledField
              label={t('profile.securityScreen.password.oldPassword')}
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              textContentType="password"
            />
            <View className="h-5" />
            <LabeledField
              label={t('profile.newPassword')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              textContentType="newPassword"
            />
            <View className="h-5" />
            <LabeledField
              label={t('auth.confirmPassword')}
              value={confirm}
              onChangeText={setConfirm}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              textContentType="newPassword"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void onSave()}
            className="mt-8 w-full rounded-xl py-4 active:opacity-90"
            style={{ backgroundColor: BRAND_NAVY, opacity: saving ? 0.7 : 1 }}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-cairo-bold text-lg text-white">
                {t('profile.updatePassword')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
