/** App-wide minimum investment amount in Algerian dinars (DZD). */
export const MIN_INVESTMENT_DZD = 10_000;

/** Resolves the minimum investable amount (currently fixed app-wide). */
export function effectiveMinInvestment(_projectMin?: number | null): number {
  return MIN_INVESTMENT_DZD;
}
