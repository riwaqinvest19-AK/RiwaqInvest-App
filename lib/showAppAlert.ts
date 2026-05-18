import { Alert, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

import { nextDialogId, presentAppDialog } from '@/lib/appDialog';

/**
 * Blocking notice for auth flows on web (signup confirmation, validation errors).
 * RN Alert.alert is unreliable on web; window.alert ensures the user sees the message.
 */
export function showAuthAlert(title: string, message: string) {
  const body = message.trim();
  const heading = title.trim();

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = heading && body ? `${heading}\n\n${body}` : body || heading;
    window.alert(text || 'Riwaq Invest');
    return;
  }

  showAppAlert(title, message);
}

/**
 * Confirmation dialog. On web uses window.confirm (Alert.alert buttons are unreliable on RN web).
 */
export function showConfirmAlert(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  const heading = title.trim();
  const body = message.trim();

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = heading && body ? `${heading}\n\n${body}` : body || heading;
    return Promise.resolve(window.confirm(text));
  }

  return new Promise((resolve) => {
    Alert.alert(heading, body, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

import type { AlertChoice } from '@/lib/appDialog';

export type { AlertChoice };

/**
 * Action sheet–style dialog (native Alert; same on web where supported).
 */
export function showAppChoiceAlert(
  title: string,
  message: string,
  choices: AlertChoice[],
  cancelLabel: string,
) {
  const heading = title.trim();
  const body = message.trim();

  if (Platform.OS === 'web') {
    presentAppDialog({
      kind: 'choice',
      id: nextDialogId(),
      title: heading,
      message: body,
      choices,
      cancelLabel,
    });
    return;
  }

  Alert.alert(heading, body, [
    ...choices.map((c) => ({
      text: c.label,
      style: c.style ?? 'default',
      onPress: c.onPress,
    })),
    { text: cancelLabel, style: 'cancel' },
  ]);
}

export function showAppAlert(title: string, message: string) {
  const body = message.trim();
  const heading = title.trim();

  if (Platform.OS === 'web') {
    presentAppDialog({
      kind: 'alert',
      id: nextDialogId(),
      title: heading || 'Riwaq Invest',
      message: body || heading,
      okLabel: '',
    });
    return;
  }

  if (heading && body) {
    Alert.alert(heading, body);
  } else {
    Alert.alert('', body || heading);
  }
}
