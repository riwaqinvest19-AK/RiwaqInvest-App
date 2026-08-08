export type RiskLevel = 'low' | 'medium' | 'high';

/** Nominal annual rates (%) shown in the risk cards. */
export const RISK_ANNUAL_PCT: Record<RiskLevel, number> = {
  low: 6,
  medium: 9,
  high: 14,
};

export const SIM_BOUNDS = {
  minAmount: 10_000,
  maxAmount: 1_000_000,
  minMonths: 6,
  maxMonths: 60, // 5 years
} as const;

/**
 * Monthly compounding of the nominal annual rate: FV = P * (1 + r/12)^n
 */
export function simulateCompound(
  principal: number,
  months: number,
  annualRatePct: number,
) {
  const p = Math.max(0, principal);
  const m = Math.max(0, months);
  const r = Math.max(0, annualRatePct) / 100;
  if (p <= 0 || m <= 0) {
    return {
      futureValue: 0,
      profit: 0,
      returnRatePct: 0,
      avgMonthlyProfit: 0,
    };
  }
  const factor = Math.pow(1 + r / 12, m);
  const futureValue = p * factor;
  const profit = futureValue - p;
  const returnRatePct = (profit / p) * 100;
  const avgMonthlyProfit = profit / m;
  return { futureValue, profit, returnRatePct, avgMonthlyProfit };
}

export function buildGrowthSeries(
  principal: number,
  months: number,
  annualRatePct: number,
  maxSteps = 48,
) {
  const p = Math.max(0, principal);
  const m = Math.max(0, months);
  const r = Math.max(0, annualRatePct) / 100;
  if (p <= 0 || m <= 0) return [{ month: 0, value: p }];

  const monthlyFactor = 1 + r / 12;
  const step = Math.max(1, Math.ceil(m / maxSteps));
  const points: { month: number; value: number }[] = [{ month: 0, value: p }];
  for (let mo = step; mo < m; mo += step) {
    points.push({ month: mo, value: p * Math.pow(monthlyFactor, mo) });
  }
  points.push({ month: m, value: p * Math.pow(monthlyFactor, m) });
  return points;
}
