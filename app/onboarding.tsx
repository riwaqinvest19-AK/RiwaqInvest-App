import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { MaterialIcons } from '@expo/vector-icons';
import { Cairo_400Regular, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  I18nManager,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SlideId = 'slide1' | 'slide2' | 'slide3';

type SlideDef = {
  id: SlideId;
  titleKey: 'onboarding.slide1.title' | 'onboarding.slide2.title' | 'onboarding.slide3.title';
  descriptionKey:
    | 'onboarding.slide1.description'
    | 'onboarding.slide2.description'
    | 'onboarding.slide3.description';
};

const SLIDES: SlideDef[] = [
  {
    id: 'slide1',
    titleKey: 'onboarding.slide1.title',
    descriptionKey: 'onboarding.slide1.description',
  },
  {
    id: 'slide2',
    titleKey: 'onboarding.slide2.title',
    descriptionKey: 'onboarding.slide2.description',
  },
  {
    id: 'slide3',
    titleKey: 'onboarding.slide3.title',
    descriptionKey: 'onboarding.slide3.description',
  },
];

function SlideIcon({ id }: { id: SlideId }) {
  if (id === 'slide1') {
    return (
      <View className="items-center justify-center">
        <View className="h-44 w-44 items-center justify-center rounded-full border border-gray-200 bg-white">
          <View className="h-32 w-32 items-center justify-center rounded-full bg-brand-icon-bg">
            <MaterialIcons name="apartment" size={56} color="#154375" />
          </View>
        </View>
      </View>
    );
  }
  if (id === 'slide2') {
    return (
      <View className="h-40 w-40 items-center justify-center rounded-full bg-gray-100">
        <MaterialCommunityIcons name="chart-pie" size={64} color="#C9A227" />
      </View>
    );
  }
  return (
    <View className="h-40 w-40 items-center justify-center rounded-full bg-brand-icon-bg">
      <MaterialIcons name="trending-up" size={56} color="#154375" />
    </View>
  );
}

export default function OnboardingScreen() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onPagerLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setPageHeight((prev) => (h > 0 && h !== prev ? h : prev));
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageHeight <= 0) return;
      const y = e.nativeEvent.contentOffset.y;
      const next = Math.round(y / pageHeight);
      setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
    },
    [pageHeight],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      router.replace('/(auth)/login');
      return;
    }
    if (pageHeight <= 0) return;
    const next = index + 1;
    scrollRef.current?.scrollTo({ y: next * pageHeight, animated: true });
    setIndex(next);
  }, [index, isLast, pageHeight, router]);

  const skip = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  const rowDir = I18nManager.isRTL ? 'flex-row-reverse' : 'flex-row';

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      <View style={{ paddingTop: insets.top + 8 }} className="px-6">
        <Pressable accessibilityRole="button" onPress={skip} hitSlop={12} className="self-start py-1">
          <Text className="font-cairo text-sm text-gray-400">{t('onboarding.skip')}</Text>
        </Pressable>
      </View>

      <View className="flex-1" onLayout={onPagerLayout}>
        {pageHeight > 0 ? (
          <ScrollView
            ref={scrollRef}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            contentContainerStyle={{ height: pageHeight * SLIDES.length }}>
            {SLIDES.map((slide) => (
              <View key={slide.id} style={{ height: pageHeight, width: '100%' }} className="px-8">
                <View className="flex-1 items-center justify-center pb-6">
                  <SlideIcon id={slide.id} />
                  <Text
                    key={`${slide.id}-title-${i18n.language}`}
                    className="mt-10 px-2 text-center font-cairo-bold text-2xl text-brand-navy"
                    style={{ writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}>
                    {t(slide.titleKey)}
                  </Text>
                  <Text
                    key={`${slide.id}-desc-${i18n.language}`}
                    className="mt-4 px-1 text-center font-cairo text-base leading-6 text-muted-label"
                    style={{ writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}>
                    {t(slide.descriptionKey)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View className="items-center pb-4">
        <View className={`${rowDir} items-center gap-2`}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`rounded-full ${i === index ? 'h-2 w-8 bg-brand-navy' : 'h-2 w-2 bg-gray-300'}`}
            />
          ))}
        </View>
      </View>

      <View className="px-6 pb-2">
        <Pressable
          accessibilityRole="button"
          onPress={goNext}
          className={`h-14 ${rowDir} items-center justify-center gap-1 rounded-xl bg-brand-navy active:opacity-90`}>
          <Text className="font-cairo-bold text-lg text-white">
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
