import { ActivityIndicator, View } from 'react-native';

import { RiwaqLogo } from '@/components/RiwaqLogo';

/**
 * Branded loading screen (works in Expo Go; native splash needs a dev/production build).
 */
export function AppSplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <RiwaqLogo splash />
      <ActivityIndicator className="mt-10" color="#154375" size="small" />
    </View>
  );
}
