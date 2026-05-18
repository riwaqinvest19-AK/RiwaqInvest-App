import Svg, { Path } from 'react-native-svg';

export const PORTFOLIO_CHART_COLORS = ['#003366', '#2563B8', '#C5A048', '#1E5F8A', '#7C9FC8'];

type Slice = { key: string; value: number; color: string };

function describeDonutSlice(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const p1 = {
    x: cx + outerR * Math.sin(rad(startAngleDeg)),
    y: cy - outerR * Math.cos(rad(startAngleDeg)),
  };
  const p2 = {
    x: cx + outerR * Math.sin(rad(endAngleDeg)),
    y: cy - outerR * Math.cos(rad(endAngleDeg)),
  };
  const p3 = {
    x: cx + innerR * Math.sin(rad(endAngleDeg)),
    y: cy - innerR * Math.cos(rad(endAngleDeg)),
  };
  const p4 = {
    x: cx + innerR * Math.sin(rad(startAngleDeg)),
    y: cy - innerR * Math.cos(rad(startAngleDeg)),
  };
  const sweep = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${sweep} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${sweep} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

type PortfolioDonutChartProps = {
  slices: { key: string; value: number }[];
  size?: number;
};

/** Donut chart for portfolio weighting; angles originate at top, clockwise. */
export function PortfolioDonutChart({ slices, size = 200 }: PortfolioDonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.38;
  const innerR = size * 0.24;

  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((acc, s) => acc + s.value, 0);
  if (total <= 0) {
    return null;
  }

  const colored: Slice[] = positive.map((s, i) => ({
    key: s.key,
    value: s.value,
    color: PORTFOLIO_CHART_COLORS[i % PORTFOLIO_CHART_COLORS.length],
  }));

  let angle = 0;
  const paths = colored.flatMap((slice) => {
    const span = (slice.value / total) * 360;
    const start = angle;
    const end = angle + span;
    angle = end;
    if (span >= 359.99) {
      return [
        <Path
          key={`${slice.key}-a`}
          d={describeDonutSlice(cx, cy, innerR, outerR, 0, 180)}
          fill={slice.color}
        />,
        <Path
          key={`${slice.key}-b`}
          d={describeDonutSlice(cx, cy, innerR, outerR, 180, 360)}
          fill={slice.color}
        />,
      ];
    }
    return [
      <Path
        key={slice.key}
        d={describeDonutSlice(cx, cy, innerR, outerR, start, end)}
        fill={slice.color}
      />,
    ];
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </Svg>
  );
}
