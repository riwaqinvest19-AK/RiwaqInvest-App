import { Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

export default function PersonalInfoScreen() {
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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        router.replace('/(auth)/login');
        return;
      }
      setEmail(user.email ?? '');
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        Alert.alert('', t('profile.loadError'));
        return;
      }
      setFullName(data?.full_name ?? '');
      setPhone(data?.phone_number ?? '');
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      Alert.alert('', t('auth.validationRequiredFields'));
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user?.id) {
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          phone_number: trimmedPhone || null,
        })
        .eq('id', user.id);
      if (error) {
        Alert.alert('', t('profile.saveError'));
        return;
      }
      Alert.alert('', t('profile.saveSuccess'), [{ text: t('common.ok'), onPress: () => router.back() }]);
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
          {t('profile.personalInfoTitle')}
        </Text>
        <View className="w-8" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_NAVY} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          style={{ paddingBottom: insets.bottom }}>
          <ScrollView
            className="flex-grow px-4 pb-8 pt-6"
            keyboardShouldPersistTaps="handled">
            <View className="rounded-2xl p-4" style={{ backgroundColor: cardBg }}>
              <LabeledField
                label={t('auth.fullName')}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('auth.fullNamePlaceholder')}
                autoCapitalize="words"
                textContentType="name"
              />
              <View className="h-5" />
              <LabeledField
                label={t('auth.email')}
                value={email}
                onChangeText={() => {}}
                placeholder=""
                editable={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <View className="h-5" />
              <LabeledField
                label={t('auth.phone')}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.phonePlaceholder')}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
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
                <Text className="text-center font-cairo-bold text-lg text-white">{t('profile.save')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
