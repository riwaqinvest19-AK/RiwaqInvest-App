import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { SOCIAL_FACEBOOK_URL, SOCIAL_LINKEDIN_URL } from '@/constants/Support';

const FACEBOOK_BRAND = '#1877F2';
const LINKEDIN_BRAND = '#0A66C2';

async function openExternalUrl(url: string, errorMessage: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('', errorMessage);
  }
}

type SocialMediaLinksProps = {
  showTitle?: boolean;
  titleAlign?: 'left' | 'right' | 'center';
  titleStyle?: TextStyle;
  containerStyle?: ViewStyle;
  className?: string;
};

export function SocialMediaLinks({
  showTitle = true,
  titleAlign = 'right',
  titleStyle,
  containerStyle,
  className,
}: SocialMediaLinksProps) {
  const { t } = useTranslation();
  const textAlign = titleAlign === 'center' ? 'center' : titleAlign === 'left' ? 'left' : 'right';

  return (
    <View className={className} style={containerStyle}>
      {showTitle ? (
        <Text
          className="mb-3 font-cairo-bold text-base text-neutral-900"
          style={[{ textAlign }, titleStyle]}>
          {t('profile.followUsOnSocial')}
        </Text>
      ) : null}
      <View className="flex-row-reverse items-center justify-center gap-4">
        <SocialIconButton
          accessibilityLabel={t('profile.socialFacebook')}
          iconName="facebook"
          brandColor={FACEBOOK_BRAND}
          onPress={() => void openExternalUrl(SOCIAL_FACEBOOK_URL, t('profile.cannotOpenLink'))}
        />
        <SocialIconButton
          accessibilityLabel={t('profile.socialLinkedIn')}
          iconName="linkedin"
          brandColor={LINKEDIN_BRAND}
          onPress={() => void openExternalUrl(SOCIAL_LINKEDIN_URL, t('profile.cannotOpenLink'))}
        />
      </View>
    </View>
  );
}

function SocialIconButton({
  iconName,
  brandColor,
  accessibilityLabel,
  onPress,
}: {
  iconName: 'facebook' | 'linkedin';
  brandColor: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="h-14 w-14 items-center justify-center rounded-full active:opacity-80"
      style={{ backgroundColor: brandColor }}>
      <FontAwesome name={iconName} size={26} color="#fff" />
    </Pressable>
  );
}
