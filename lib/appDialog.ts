import { Platform } from 'react-native';

export type AlertChoice = {
  label: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppDialogPayload =
  | {
      kind: 'alert';
      id: number;
      title: string;
      message: string;
      okLabel: string;
    }
  | {
      kind: 'choice';
      id: number;
      title: string;
      message: string;
      choices: AlertChoice[];
      cancelLabel: string;
    };

type Listener = (payload: AppDialogPayload | null) => void;

let nextId = 1;
let listener: Listener | null = null;

export function subscribeAppDialog(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

export function dismissAppDialog() {
  listener?.(null);
}

/** Web: imperative dialog host. Native: no-op (use Alert). */
export function presentAppDialog(payload: AppDialogPayload) {
  if (Platform.OS !== 'web') return;
  listener?.(payload);
}

export function nextDialogId(): number {
  return nextId++;
}
