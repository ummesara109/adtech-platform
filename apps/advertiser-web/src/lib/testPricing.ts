/**
 * Development/test pricing for sample advertiser campaigns.
 * Not live commercial rates — labelled for demo use only.
 */
export const TEST_PRICING = {
  label: 'AutoAds development test pricing',
  /** INR charged per requested auto per campaign day (test only). */
  inrPerAutoPerDay: 45,
} as const

export function estimateTestBudgetInr(requestedAutos: number, dayCount: number) {
  return Math.max(0, Math.round(requestedAutos * dayCount * TEST_PRICING.inrPerAutoPerDay))
}
