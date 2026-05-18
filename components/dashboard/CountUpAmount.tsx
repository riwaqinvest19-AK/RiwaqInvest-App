import { useCallback, useEffect, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type CountUpAmountProps = Omit<TextProps, 'children'> & {
  target: number;
  durationMs?: number;
  locale?: string;
};

export function CountUpAmount({
  target,
  durationMs = 1000,
  locale = 'en-US',
  className,
  ...textProps
}: CountUpAmountProps) {
  const [display, setDisplay] = useState('0');
  const progress = useSharedValue(0);

  const syncDisplay = useCallback(
    (n: number) => {
      setDisplay(n.toLocaleString(locale));
    },
    [locale],
  );

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(target, {
      duration: durationMs,
      easing: Easing.out(Easing.exp),
    });
  }, [durationMs, progress, target]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(syncDisplay)(current);
      }
    },
    [syncDisplay],
  );

  return (
    <Text className={className} {...textProps}>
      {display}
    </Text>
  );
}
