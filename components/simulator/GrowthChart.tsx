import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
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
  const [w, setW] = useState(0);
  const reveal = useRef(new Animated.Value(0)).current;
  const H = 200;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 28;

  const innerW = Math.max(0, w - padL - padR);
  const innerH = H - padT - padB;

  const { linePath, areaPath, yTicks, xLabels, maxY } = useMemo(() => {
    if (series.length < 2 || innerW <= 0 || innerH <= 0) {
      return {
        linePath: '',
        areaPath: '',
        yTicks: [] as number[],
        xLabels: [] as { x: number; label: string }[],
        maxY: 1,
      };
    }
    const last = series[series.length - 1];
    const lastMonth = Math.max(1, last.month);
    const maxVal = Math.max(...series.map((p) => p.value), 1);
    const maxYAxis = maxVal * 1.08;
    const yTicks = [0, maxYAxis * 0.5, maxYAxis];
    const toX = (month: number) => padL + (month / lastMonth) * innerW;
    const toY = (value: number) =>
      padT + innerH - (value / maxYAxis) * innerH;

    let dLine = '';
    series.forEach((pt, i) => {
      const x = toX(pt.month);
      const y = toY(pt.value);
      dLine += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    const firstX = toX(series[0].month);
    const lastX = toX(last.month);
    const baseY = padT + innerH;
    let dArea = `M ${firstX} ${baseY}`;
    series.forEach((pt) => {
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
  }, [series, innerW, innerH]);

  useEffect(() => {
    if (!linePath || !areaPath || innerW <= 0 || innerH <= 0) return;
    reveal.stopAnimation();
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating SVG width
    }).start();
  }, [areaPath, innerH, innerW, linePath, reveal, series]);

  const AnimatedRect = useMemo(() => Animated.createAnimatedComponent(Rect), []);

  return (
    <View className="w-full" onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w >= 60 ? (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="simAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={AREA_TOP} stopOpacity={0.32} />
              <Stop offset="1" stopColor={AREA_BOTTOM} stopOpacity={0.06} />
            </LinearGradient>
            <ClipPath id="simRevealClip">
              <AnimatedRect
                x={padL}
                y={padT}
                height={innerH}
                width={reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, innerW],
                })}
              />
            </ClipPath>
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

          <G clipPath="url(#simRevealClip)">
            <Path d={areaPath} fill="url(#simAreaGrad)" />
            <Path d={linePath} stroke={BRAND} strokeWidth={2.5} fill="none" />
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
      ) : null}

      <View className="mt-2 flex-row items-center gap-2 px-1">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
        <Text className="font-cairo text-xs text-muted-label">{legendLabel}</Text>
      </View>
    </View>
  );
}
