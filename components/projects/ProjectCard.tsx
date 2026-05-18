import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import type { TFunction } from 'i18next';
import { Image, Pressable, Text, View } from 'react-native';

export type ProjectRow = {
  id: string;
  title: string;
  location: string | null;
  expected_return: number | null;
  investment_progress: number;
  total_units: number;
  status: string;
  cover_image_url?: string | null;
  target_amount?: number | null;
  current_amount?: number | null;
  min_investment?: number | null;
  duration_months?: number | null;
  risk_level?: string | null;
  description?: string | null;
  risk_analysis?: string | null;
  document_url?: string | null;
};

export function formatFundingShort(dzd: number, locale: string): string {
  const abs = Math.abs(dzd);
  if (abs >= 1_000_000_000) {
    const v = dzd / 1_000_000_000;
    return `${trimFundingNumber(v)}B`;
  }
  if (abs >= 1_000_000) {
    const v = dzd / 1_000_000;
    return `${trimFundingNumber(v)}M`;
  }
  if (abs >= 1_000) {
    const v = dzd / 1_000;
    return `${trimFundingNumber(v)}K`;
  }
  return Math.round(dzd).toLocaleString(locale);
}

function trimFundingNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
}

export function cardShadow() {
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  } as const;
}

type ProjectCardProps = {
  project: ProjectRow;
  numberLocale: string;
  t: TFunction;
  href?: string;
  variant?: 'carousel' | 'full';
};

export function ProjectCard({
  project,
  numberLocale,
  t,
  href,
  variant = 'carousel',
}: ProjectCardProps) {
  const progress = Math.min(100, Math.max(0, Number(project.investment_progress)));
  const expectedNum =
    project.expected_return != null ? Number(project.expected_return) : Number.NaN;
  const expectedStr = Number.isFinite(expectedNum)
    ? expectedNum.toLocaleString(numberLocale, { maximumFractionDigits: 1 })
    : '—';

  const goal = project.target_amount;
  const raised = project.current_amount;
  const hasFunding =
    typeof goal === 'number' &&
    typeof raised === 'number' &&
    Number.isFinite(goal) &&
    Number.isFinite(raised) &&
    goal > 0;

  const locationLabel = project.location?.trim() || '—';

  const widthClass = variant === 'carousel' ? 'w-[300px] shrink-0' : 'w-full';

  const inner = (
    <>
      <View className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-slate-200">
        {project.cover_image_url ? (
          <Image
            source={{ uri: project.cover_image_url }}
            className="absolute inset-0 h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-slate-200">
            <Ionicons name="image-outline" size={36} color="#94a3b8" />
          </View>
        )}
        <View className="pointer-events-none absolute start-3 top-3 max-w-[58%] flex-row items-center gap-1 rounded-full bg-black/55 px-3 py-1.5">
          <Ionicons name="location-sharp" size={14} color="#fff" />
          <Text className="font-cairo-semibold text-xs text-white" numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
        <View className="pointer-events-none absolute end-3 top-3 max-w-[45%] rounded-full bg-accent-gold px-3 py-1.5">
          <Text className="text-right font-cairo-bold text-xs text-neutral-900" numberOfLines={1}>
            {t('dashboard.expectedReturn', { pct: expectedStr })}
          </Text>
        </View>
      </View>
      <View className="rounded-b-2xl bg-white p-4">
        <Text
          className="text-right font-cairo-bold text-base leading-6 text-neutral-900"
          numberOfLines={2}>
          {project.title}
        </Text>
        <View className="mt-3 flex-row items-center justify-between gap-2">
          {hasFunding ? (
            <Text
              className="min-w-0 flex-1 font-cairo-semibold text-xs text-neutral-800"
              numberOfLines={1}>
              {t('dashboard.fundingLine', {
                raised: formatFundingShort(raised, numberLocale),
                goal: formatFundingShort(goal, numberLocale),
              })}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          <Text className="shrink-0 font-cairo-semibold text-xs text-muted-label">
            {t('dashboard.funded', { pct: Math.round(progress) })}
          </Text>
        </View>
        <View className="mt-2 h-2 w-full flex-row justify-start overflow-hidden rounded-full bg-slate-200">
          <View className="h-full rounded-full bg-brand-navy" style={{ width: `${progress}%` }} />
        </View>
      </View>
    </>
  );

  const shell = (
    <Pressable
      accessibilityRole={href ? 'link' : undefined}
      className={`overflow-hidden rounded-2xl bg-white ${widthClass}`}
      style={cardShadow()}>
      {inner}
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href as Href} asChild>
        {shell}
      </Link>
    );
  }

  return shell;
}
