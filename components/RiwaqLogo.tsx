import { Dimensions, Image, type ImageStyle, type StyleProp, View } from 'react-native';

import { LOGO_ASPECT, LOGO_SOURCE } from '@/components/brandAssets';

type RiwaqLogoProps = {
  /** Smaller size for tight layouts (e.g. headers, auth secondary screens). */
  compact?: boolean;
  /** Large centered lockup for splash / loading. */
  splash?: boolean;
  /** White circular backdrop — readable on navy headers. */
  onDark?: boolean;
  style?: StyleProp<ImageStyle>;
};

/**
 * Official Riwaq Invest lockup (graphic + wordmark).
 */
export function RiwaqLogo({ compact = false, splash = false, onDark = false, style }: RiwaqLogoProps) {
  const headerBadge = onDark && compact;
  const screenW = Dimensions.get('window').width;
  const width = splash
    ? Math.min(screenW * 0.58, 272)
    : headerBadge
      ? 34
      : compact
        ? 132
        : 200;
  const height = Math.round(width / LOGO_ASPECT);
  const badgeSize = headerBadge ? 52 : onDark ? 56 : undefined;
  const logoPad = headerBadge ? 9 : 0;

  const image = (
    <Image
      source={LOGO_SOURCE}
      accessibilityLabel="Riwaq Invest"
      resizeMode="contain"
      style={[{ width, height, backgroundColor: 'transparent' }, style]}
    />
  );

  if (!onDark) {
    return image;
  }

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-white"
      style={{
        width: badgeSize,
        height: badgeSize,
        padding: logoPad,
      }}>
      {image}
    </View>
  );
}
