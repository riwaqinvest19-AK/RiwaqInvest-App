import { Ionicons } from '@expo/vector-icons';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  Linking,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_E164 } from '@/constants/Support';

const BRAND_NAVY = '#154375';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

function configureNextLayoutAnimation() {
  LayoutAnimation.configureNext({
    duration: 220,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

function SupportCtaCard({
  title,
  subtitle,
  buttonLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View
      className="mt-5 overflow-hidden rounded-3xl px-5 py-5"
      style={{
        backgroundColor: BRAND_NAVY,
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      }}>
      <Text className="font-cairo-bold text-lg text-white" style={{ textAlign: 'right' }}>
        {title}
      </Text>
      <Text
        className="mt-2 font-cairo text-sm text-white/90"
        style={{ textAlign: 'right', lineHeight: 20 }}>
        {subtitle}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="mt-4 self-end rounded-2xl bg-white px-5 py-3"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}>
        <Text className="font-cairo-semibold text-base" style={{ color: BRAND_NAVY, textAlign: 'center' }}>
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function AccordionItem({
  item,
  expanded,
  onToggle,
  cardBg,
  mainText,
  subText,
  divider,
}: {
  item: FaqItem;
  expanded: boolean;
  onToggle: () => void;
  cardBg: string;
  mainText: string;
  subText: string;
  divider: string;
}) {
  const rotation = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);

  const chevronStyle = useAnimatedStyle(() => {
    const deg = rotation.value * 180; // down(0) -> up(180)
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  return (
    <View
      className="mb-3 overflow-hidden rounded-3xl"
      style={{
        backgroundColor: cardBg,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="px-4 py-4"
        hitSlop={8}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            className="font-cairo-semibold text-base"
            style={{ color: mainText, textAlign: 'right', flex: 1, paddingLeft: 12 }}>
            {item.question}
          </Text>
          <Animated.View style={[{ width: 28, alignItems: 'center' }, chevronStyle]}>
            <Ionicons name="chevron-down" size={22} color={subText} />
          </Animated.View>
        </View>
      </Pressable>

      {expanded ? (
        <View className="px-4 pb-4">
          <View style={{ height: 1, backgroundColor: divider, opacity: 0.7 }} />
          <Text
            className="mt-3 font-cairo text-sm"
            style={{ color: subText, textAlign: 'right', lineHeight: 20 }}>
            {item.answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function FaqScreen() {
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

  const pageBg = isDark ? '#0a0a0a' : '#F2F4F7';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const mainText = isDark ? '#f2f2f7' : '#0f172a';
  const subText = isDark ? '#a1a1a6' : '#6B7C93';
  const divider = isDark ? '#2c2c2e' : '#E8EEF5';

  useEffect(() => {
    if (Platform.OS === 'android') {
      // LayoutAnimation is disabled by default on Android
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const faqItems: FaqItem[] = useMemo(
    () => [
      { id: '1', question: t('profile.faqQ1'), answer: t('profile.faqA1') },
      { id: '2', question: t('profile.faqQ2'), answer: t('profile.faqA2') },
      { id: '3', question: t('profile.faqQ3'), answer: t('profile.faqA3') },
      { id: '4', question: t('profile.faqQ4'), answer: t('profile.faqA4') },
      { id: '5', question: t('profile.faqQ5'), answer: t('profile.faqA5') },
    ],
    [t],
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function openSupport() {
    const message = t('profile.supportDefaultMessage');

    const whatsappDeepLink = `whatsapp://send?phone=${SUPPORT_WHATSAPP_E164}&text=${encodeURIComponent(message)}`;
    const whatsappWeb = `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;

    const subject = 'Riwaq Invest Support';
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

    try {
      // Prefer WhatsApp app; on iOS use wa.me if the deep link is blocked
      if (Platform.OS !== 'web') {
        const canDeepLink = await Linking.canOpenURL(whatsappDeepLink);
        if (canDeepLink) {
          await Linking.openURL(whatsappDeepLink);
          return;
        }
      }
      if (Platform.OS === 'web' || Platform.OS === 'ios') {
        await Linking.openURL(whatsappWeb);
        return;
      }

      const canEmail = await Linking.canOpenURL(mailto);
      if (canEmail) {
        await Linking.openURL(mailto);
      }
    } catch {
      // ignore — no-op
    }
  }

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
        <Text className="flex-1 text-center font-cairo-bold text-lg text-white">{t('profile.faqTitle')}</Text>
        <View className="w-8" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        {faqItems.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <AccordionItem
              key={item.id}
              item={item}
              expanded={expanded}
              onToggle={() => {
                configureNextLayoutAnimation();
                setExpandedId(expanded ? null : item.id);
              }}
              cardBg={cardBg}
              mainText={mainText}
              subText={subText}
              divider={divider}
            />
          );
        })}

        <SupportCtaCard
          title={t('profile.supportChooseTitle')}
          subtitle={t('profile.faqA4')}
          buttonLabel={t('profile.contactSupport')}
          onPress={openSupport}
        />
      </ScrollView>
    </View>
  );
}
