import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, useWindowDimensions, View } from 'react-native';
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

const BRAND = '#154375';
const AREA_TOP = '#60A5FA';
const AREA_BOTTOM = '#93C5FD';
const GRID = 'rgba(148,163,184,0.35)';

type Point = { month: number; value: number };

function formatAxisK(n: number, locale: string): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toLocaleString(locale);
}

export function GrowthChart({
  series,
  numberLocale,
  legendLabel,
}: {
  series: Point[];
  numberLocale: string;
  legendLabel: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [layoutW, setLayoutW] = useState(0);
  const reveal = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;
  const H = 200;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 28;

  const w = layoutW >= 60 ? layoutW : Math.max(0, Math.round(windowWidth) - 48);

  const innerW = Math.max(0, w - padL - padR);
  const innerH = H - padT - padB;

  const chartPoints = useMemo(() => {
    if (series.length === 0) return [];
    if (series.length === 1) {
      const only = series[0];
      return [
        { month: only.month, value: only.value },
        { month: Math.max(only.month + 1, 1), value: only.value },
      ];
    }
    return series;
  }, [series]);

  const { linePath, areaPath, yTicks, xLabels, maxY } = useMemo(() => {
    if (chartPoints.length < 2 || innerW <= 0 || innerH <= 0) {
      return {
        linePath: '',
        areaPath: '',
        yTicks: [] as number[],
        xLabels: [] as { x: number; label: string }[],
        maxY: 1,
      };
    }
    const last = chartPoints[chartPoints.length - 1];
    const lastMonth = Math.max(1, last.month);
    const minVal = Math.min(...chartPoints.map((p) => p.value));
    const maxVal = Math.max(...chartPoints.map((p) => p.value), minVal + 1);
    const maxYAxis = maxVal === minVal ? maxVal * 1.08 : maxVal * 1.08;
    const yTicks = [0, maxYAxis * 0.5, maxYAxis];
    const toX = (month: number) => padL + (month / lastMonth) * innerW;
    const toY = (value: number) =>
      padT + innerH - (value / maxYAxis) * innerH;

    let dLine = '';
    chartPoints.forEach((pt, i) => {
      const x = toX(pt.month);
      const y = toY(pt.value);
      dLine += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    const firstX = toX(chartPoints[0].month);
    const lastX = toX(last.month);
    const baseY = padT + innerH;
    let dArea = `M ${firstX} ${baseY}`;
    chartPoints.forEach((pt) => {
      dArea += ` L ${toX(pt.month)} ${toY(pt.value)}`;
    });
    dArea += ` L ${lastX} ${baseY} Z`;

    const xLabels: { x: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const month = Math.round((lastMonth * i) / steps);
      xLabels.push({
        x: toX(month),
        label: String(month),
      });
    }

    return { linePath: dLine, areaPath: dArea, yTicks, xLabels, maxY: maxYAxis };
  }, [chartPoints, innerW, innerH]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!linePath || !areaPath || innerW <= 0 || innerH <= 0) return;
    reveal.stopAnimation();
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [areaPath, innerH, innerW, linePath, reveal, chartPoints]);

  const chartOpacity = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 1],
  });

  const AnimatedView = useMemo(() => Animated.createAnimatedComponent(View), []);

  return (
    <View
      className="w-full"
      style={{ minHeight: H }}
      onLayout={(e) => setLayoutW(Math.round(e.nativeEvent.layout.width))}>
      {w >= 60 && linePath ? (
        <AnimatedView style={{ opacity: chartOpacity }}>
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="simAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={AREA_TOP} stopOpacity={0.32} />
              <Stop offset="1" stopColor={AREA_BOTTOM} stopOpacity={0.06} />
            </LinearGradient>
          </Defs>

          {yTicks.map((tick, i) => {
            const y = padT + innerH - (tick / maxY) * innerH;
            return (
              <Line
                key={`grid-${i}`}
                x1={padL}
                y1={y}
                x2={padL + innerW}
                y2={y}
                stroke={GRID}
                strokeWidth={1}
              />
            );
          })}

          <G>
            <Path d={areaPath} fill="url(#simAreaGrad)" />
            <Path d={linePath} stroke={BRAND} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </G>

          {yTicks.map((tick, i) => {
            const y = padT + innerH - (tick / maxY) * innerH;
            return (
              <SvgText
                key={`ylab-${i}`}
                x={padL - 6}
                y={y + 4}
                fontSize={10}
                fill="#64748b"
                textAnchor="end">
                {formatAxisK(tick, numberLocale)}
              </SvgText>
            );
          })}

          {xLabels.map((xl, i) => (
            <SvgText
              key={`xlab-${i}`}
              x={xl.x}
              y={H - 8}
              fontSize={10}
              fill="#64748b"
              textAnchor="middle">
              {xl.label}
            </SvgText>
          ))}
        </Svg>
        </AnimatedView>
      ) : null}

      <View className="mt-2 flex-row items-center gap-2 px-1">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
        <Text className="font-cairo text-xs text-muted-label">{legendLabel}</Text>
      </View>
    </View>
  );
}
