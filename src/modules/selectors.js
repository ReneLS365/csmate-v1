/**
 * @purpose Transform persisted state into deterministic calculation payloads and computed totals.
 * @inputs Arbitrary state snapshot containing jobType, variants, price fields and hours fallbacks.
 * @outputs Plain calculation input structure plus enriched totals with final project selection metadata.
 */

import { computeTotals, projectByVariant, DEFAULT_SLED_INT } from '@/modules/calc';

export function toCalcInput(state) {
  const jobType = state?.jobType ?? 'montage';
  const hours = jobType === 'demontage'
    ? (state?.hoursDemontage ?? state?.hours ?? 0)
    : (state?.hoursMontage ?? state?.hours ?? 0);

  const tralleloft = state?.tralleloftKr ?? state?.tralleløftKr ?? 0;

  return {
    materials: state?.materialsSum ?? 0,
    sledPercent: state?.sledPercent ?? DEFAULT_SLED_INT,
    extraWork: state?.extraWorkKr ?? 0,
    tralleloft,
    km: state?.kmKr ?? 0,
    hours,
    udd1: state?.udd1KrPerHour ?? 0,
    udd2: state?.udd2KrPerHour ?? 0,
    mentor: state?.mentorKrPerHour ?? 0
  };
}

export function selectComputed(state) {
  const o = computeTotals(toCalcInput(state));
  const selectedVariant = state?.selectedVariant ?? 'noAdd';
  const jobType = state?.jobType ?? 'montage';
  const project_final = projectByVariant(o, selectedVariant);
  return { ...o, project_final, selectedVariant, jobType };
}
