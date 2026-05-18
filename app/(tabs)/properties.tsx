import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ProjectRow, ProjectCard } from '@/components/projects/ProjectCard';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const BRAND_NAVY = '#154375';

export default function PropertiesScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const numberLocale = i18n.language.startsWith('ar') ? 'en-US' : i18n.language;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadProjects = useCallback(async () => {
    setError(null);

    const { data, error: qError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'published');

    if (qError) {
      setProjects([]);
      setError(qError.message);
      return;
    }

    const rows = (data ?? []) as ProjectRow[];
    rows.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
    setProjects(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      await loadProjects();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }, [loadProjects]);

  if (!fontsLoaded) {
    return null;
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter((p) => {
        const title = (p.title ?? '').toLowerCase();
        const loc = (p.location ?? '').toLowerCase();
        return title.includes(q) || loc.includes(q);
      })
    : projects;

  const chevronBack = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';

  return (
    <View className="flex-1" style={{ backgroundColor: '#EEF1F5' }}>
      <View style={{ backgroundColor: BRAND_NAVY, paddingTop: insets.top, paddingBottom: 14 }}>
        <View className="flex-row-reverse items-center justify-between px-4 pt-2">
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Ionicons name={chevronBack} size={26} color="#fff" />
          </Pressable>
          <Text className="flex-1 text-center font-cairo-bold text-lg text-white">
            {t('screens.propertiesTitle')}
          </Text>
          <View className="w-10" />
        </View>

        <View className="mt-4 px-4">
          <View
            className="flex-row-reverse items-center overflow-hidden rounded-2xl border bg-white px-3"
            style={{ borderColor: '#E8ECF0', minHeight: 52 }}>
            <Pressable accessibilityRole="button" hitSlop={10} className="pl-2 py-2 active:opacity-80">
              <MaterialIcons name="tune" size={20} color="#6B7C93" />
            </Pressable>
            <View style={{ width: 1, height: 26, backgroundColor: '#E8ECF0' }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="بحث"
              placeholderTextColor="#9CA3AF"
              className="flex-1 py-3 font-cairo text-base text-gray-900"
              style={{ textAlign: 'right', writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }}
              returnKeyType="search"
            />
            <Ionicons name="search" size={18} color="#6B7C93" />
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={BRAND_NAVY} />
        </View>
      ) : error ? (
        <Text className="px-4 text-right font-cairo text-sm text-red-600">
          {t('dashboard.projectsLoadError')}
        </Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
            gap: 12,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_NAVY} />
          }
          ListHeaderComponent={
            <Text className="mb-2 mt-3 text-right font-cairo text-xs text-slate-500">
              {filtered.length} العقارات
            </Text>
          }
          renderItem={({ item }) => (
            <ProjectCard
              href={`/project/${item.id}`}
              variant="full"
              project={item}
              numberLocale={numberLocale}
              t={t}
            />
          )}
          ListEmptyComponent={
            <Text className="mt-8 text-right font-cairo text-sm text-muted-label">
              {t('dashboard.noProjects')}
            </Text>
          }
        />
      )}
    </View>
  );
}
