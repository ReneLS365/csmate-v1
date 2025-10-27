// src/lib/exporters.js
import { toCalcInput } from '@/store/selectors';
import { computeTotals, projectByVariant } from '@/lib/calc';

export function exportJSON(state) {
  const o = computeTotals(toCalcInput(state));
  const selectedVariant = state.selectedVariant ?? 'noAdd';
  const jobType = state.jobType ?? 'montage';
  const project_final = projectByVariant(o, selectedVariant);

  return {
    // behold eksisterende felter (bagud-kompatibilitet)
    version: 2,

    // totals
    materials: o.materials,
    sledPercent: o.sledPercent,
    sledKr: o.sledKr,
    extraAndKm: o.extraAndKm,
    totalAccord: o.totalAccord,
    hourlyNoAdd: o.hourlyNoAdd,
    hourlyUdd1: o.hourlyUdd1,
    hourlyUdd2: o.hourlyUdd2,
    hourlyUdd2Mentor: o.hourlyUdd2Mentor,

    // historiske projektsummer (beholdes for kompatibilitet)
    project_noAdd: o.project_noAdd,
    project_udd1: o.project_udd1,
    project_udd2: o.project_udd2,
    project_udd2Mentor: o.project_udd2Mentor,

    // NY officiel projektsum
    project_final,

    // meta for reproducerbarhed
    selectedVariant,
    jobType,

    // nyttige infofelter
    hours: o.hours,
    kmInfo: state.kmKr ?? 0,
    tralleløftInfo: state.tralleloftKr ?? state.tralleløftKr ?? 0
  };
}

// CSV – append kolonner bagerst; kun project_final som den officielle
export const CSV_HEADER_APPEND =
  'materials;sled_percent;sled_kr;extra_and_km;total_accord;hourly_no_add;hourly_udd1;hourly_udd2;hourly_udd2_mentor;project_final;hours;km_info;tralleløft_info;job_type;variant';

export function exportCSVRow(state) {
  const input = toCalcInput(state);
  const o = computeTotals(input);
  const variant = state.selectedVariant ?? 'noAdd';
  const jobType = state.jobType ?? 'montage';
  const project_final = projectByVariant(o, variant);

  const vals = [
    o.materials,
    o.sledPercent,
    o.sledKr,
    o.extraAndKm,
    o.totalAccord,
    o.hourlyNoAdd,
    o.hourlyUdd1,
    o.hourlyUdd2,
    o.hourlyUdd2Mentor,
    project_final,
    o.hours,
    (state.kmKr ?? 0),
    (state.tralleloftKr ?? state.tralleløftKr ?? 0),
    jobType,
    variant
  ];
  // Brug ; separator og dansk komma for decimals
  return vals.map(v => String(v).replace('.', ',')).join(';');
}

// PDF: render kun værdier fra selectComputed(state) i samme rækkefølge som Review.
// Ingen beregninger i PDF-laget.
