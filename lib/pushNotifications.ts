import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

let handlerConfigured = false;

export function ensureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureWebNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function showWebNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch (e) {
    console.warn('[notifications-web]', e);
  }
}

export async function ensurePushPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return ensureWebNotificationPermission();
  }
  ensureNotificationHandler();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function userWantsInvestmentNotifications(): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return true;
    const { data, error } = await supabase
      .from('profiles')
      .select('notify_investments')
      .eq('id', uid)
      .maybeSingle();
    if (error) return true;
    return Boolean((data as { notify_investments?: boolean } | null)?.notify_investments ?? true);
  } catch {
    return true;
  }
}

async function userWantsAccountNotifications(): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return true;
    const { data, error } = await supabase
      .from('profiles')
      .select('notify_account')
      .eq('id', uid)
      .maybeSingle();
    if (error) return true;
    return Boolean((data as { notify_account?: boolean } | null)?.notify_account ?? true);
  } catch {
    return true;
  }
}

export async function notifyInvestmentSuccessLocal(title: string, amountLabel: string) {
  if (Platform.OS === 'web') {
    const ok = await ensurePushPermission();
    if (!ok) return;
    if (!(await userWantsInvestmentNotifications())) return;
    showWebNotification(title || 'Riwaq Invest', amountLabel);
    return;
  }
  ensureNotificationHandler();
  const ok = await ensurePushPermission();
  if (!ok) return;
  if (!(await userWantsInvestmentNotifications())) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Riwaq Invest',
      body: amountLabel,
      sound: true,
    },
    trigger: null,
  });
}

export async function notifyWalletBalanceIncreaseLocal(title: string, body: string) {
  if (Platform.OS === 'web') {
    const ok = await ensurePushPermission();
    if (!ok) return;
    if (!(await userWantsAccountNotifications())) return;
    showWebNotification(title || 'Riwaq Invest', body);
    return;
  }
  ensureNotificationHandler();
  const ok = await ensurePushPermission();
  if (!ok) return;
  if (!(await userWantsAccountNotifications())) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Riwaq Invest',
      body,
      sound: true,
    },
    trigger: null,
  });
}
