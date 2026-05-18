import '../global.css';
import '@/localization/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { Stack, useRootNavigationState, useRouter, useSegments, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import 'react-native-reanimated';

import { AppDialogHost } from '@/components/AppDialogHost';
import { AppSplashScreen } from '@/components/AppSplashScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { ThemePreferenceProvider } from '@/contexts/ThemePreferenceContext';
import i18n from '@/localization/i18n';
import {
  getAuthCallbackUrlOnLaunch,
  processSupabaseAuthCallbackUrl,
  type AuthCallbackResult,
} from '@/lib/authEmailCallback';
import { isPasswordRecoveryActive, setPasswordRecoveryActive } from '@/lib/authRecoveryState';
import {
  finalizeWebIconFonts,
  ICON_FONT_MAP,
  registerIconFontsForStaticRender,
} from '@/lib/iconFonts';

registerIconFontsForStaticRender();
import { isSessionEmailConfirmed } from '@/lib/authSession';
import { useExpoUpdates } from '@/lib/useExpoUpdates';
import { ensureNotificationHandler } from '@/lib/pushNotifications';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'language',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...ICON_FONT_MAP,
  });

  const [webIconsReady, setWebIconsReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (Platform.OS !== 'web') {
      setWebIconsReady(true);
      return;
    }
    let cancelled = false;
    void finalizeWebIconFonts()
      .then(() => {
        if (!cancelled) setWebIconsReady(true);
      })
      .catch((e) => {
        console.error('[icon-fonts] web finalize failed', e);
        if (!cancelled) setWebIconsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fontsLoaded]);

  const loaded = fontsLoaded && webIconsReady;

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (cancelled) return;
      setAuthReady(true);
    };

    const authTimeout = setTimeout(() => {
      if (cancelled) return;
      setSession(null);
      markReady();
    }, 12_000);

    void supabase.auth
      .getSession()
      .then(({ data: { session: next } }) => {
        if (cancelled) return;
        clearTimeout(authTimeout);
        setSession(next ?? null);
        markReady();
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(authTimeout);
        setSession(null);
        markReady();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryActive(true);
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecoveryActive(false);
      }
      setSession(next);
    });

    return () => {
      cancelled = true;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Hide Expo Go / native placeholder so the in-app branded splash is visible.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, [loaded, authReady]);

  if (!loaded || !authReady) {
    return <AppSplashScreen />;
  }

  return (
    <ThemePreferenceProvider>
      <>
        <RootLayoutNav session={session} />
        <AppDialogHost />
        <Toast />
      </>
    </ThemePreferenceProvider>
  );
}

function RootLayoutNav({ session }: { session: Session | null }) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const rootNavigation = useRootNavigationState();

  useExpoUpdates();

  useEffect(() => {
    ensureNotificationHandler();
  }, []);

  useEffect(() => {
    const routeAfterCallback = (result: AuthCallbackResult) => {
      if (!result.handled) return;
      if (result.kind === 'error') {
        console.warn('[auth-callback]', result.message);
        return;
      }
      if (result.kind === 'recovery') {
        router.replace('/(auth)/reset-password' as Href);
        return;
      }
      if (result.kind === 'email_confirmed' || (result.kind === 'session' && result.emailConfirmed)) {
        Toast.show({
          type: 'success',
          text1: i18n.t('auth.emailConfirmedSuccess'),
          visibilityTime: 6000,
          position: 'top',
        });
        router.replace('/(tabs)' as Href);
      }
    };

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const result = await processSupabaseAuthCallbackUrl(url);
      routeAfterCallback(result);
    };

    void getAuthCallbackUrlOnLaunch().then((u) => void handleUrl(u));
    const sub = Linking.addEventListener('url', ({ url }) => void handleUrl(url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEYS.language).then((lng) => {
      if (lng === 'ar' || lng === 'en' || lng === 'fr') {
        void i18n.changeLanguage(lng);
      }
    });
  }, []);

  useEffect(() => {
    if (!rootNavigation?.key) return;

    const root = segments[0];
    if (!root) return;

    const inAuth = root === '(auth)';
    const inTabs = root === '(tabs)';
    const isLanguage = root === 'language';
    const isOnboarding = root === 'onboarding';
    const authChild = inAuth ? ((segments[1] ?? '') as string) : '';
    const inPasswordReset = inAuth && authChild === 'reset-password';

    if (session) {
      if (isPasswordRecoveryActive() || inPasswordReset) {
        if (inAuth && !inPasswordReset) {
          router.replace('/(auth)/reset-password' as Href);
        }
        return;
      }

      if (!isSessionEmailConfirmed(session)) {
        if (inTabs || (!inAuth && !isLanguage && !isOnboarding)) {
          void supabase.auth.signOut();
          router.replace('/(auth)/login' as Href);
        }
        return;
      }

      if (inAuth || isLanguage || isOnboarding) {
        router.replace('/(tabs)');
      }
      return;
    }

    if (inTabs) {
      router.replace('/(auth)/login');
    }
  }, [session, segments, router, rootNavigation?.key]);

  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...baseTheme,
    direction: (I18nManager.isRTL ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
  };

  return (
    <ThemeProvider value={theme}>
      <Stack initialRouteName="language">
        <Stack.Screen name="language" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="project" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
