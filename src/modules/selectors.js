/**
 * @purpose Transform persisted state into deterministic calculation payloads and computed totals.
 * @inputs Arbitrary state snapshot containing jobType, variants, price fields and hours fallbacks.
 * @outputs Rounded accord totals enriched with selected variant metadata for the review UI.
 */

import { deriveTotals } from '@/state/derive.js';

export function selectComputed(state) {
  const totals = deriveTotals(state);
  const selectedVariant = state?.selectedVariant ?? 'noAdd';
  const jobType = totals.jobType ?? (state?.jobType ?? 'montage');
  return { ...totals, selectedVariant, jobType };
}
