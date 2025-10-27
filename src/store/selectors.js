// src/store/selectors.js
import { computeTotals, projectByVariant, DEFAULT_SLED_INT } from '@/lib/calc';

export function toCalcInput(state) {
  // Vælg timer ud fra jobType
  const jobType = state.jobType ?? 'montage'; // 'montage' | 'demontage'
  const hours =
    jobType === 'demontage'
      ? (state.hoursDemontage ?? state.hours ?? 0)
      : (state.hoursMontage ?? state.hours ?? 0);

  return {
    materials: state.materialsSum ?? 0,
    sledPercent: state.sledPercent ?? DEFAULT_SLED_INT,
    extraWork: (state.extraWorkKr ?? 0) + (state.tralleloftKr ?? state.tralleløftKr ?? 0),
    km: state.kmKr ?? 0,
    hours,
    udd1: state.udd1KrPerHour ?? 0,
    udd2: state.udd2KrPerHour ?? 0,
    mentor: state.mentorKrPerHour ?? 0
  };
}

export function selectComputed(state) {
  const o = computeTotals(toCalcInput(state));
  const selectedVariant = state.selectedVariant ?? 'noAdd'; // 'noAdd' | 'udd1' | 'udd2' | 'udd2Mentor'
  const jobType = state.jobType ?? 'montage';
  const project_final = projectByVariant(o, selectedVariant);
  return { ...o, project_final, selectedVariant, jobType };
}
