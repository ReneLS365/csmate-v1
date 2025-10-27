/**
 * @purpose Serialise accord state into JSON/CSV exports with deterministic totals.
 * @inputs Raw application state snapshots resolved through calculation selectors.
 * @outputs JSON payload for persistence and CSV row strings for Excel/E-Komplet compatibility.
 */

import { toCalcInput } from '@/modules/selectors';
import { computeTotals, projectByVariant } from '@/modules/calc';

export function exportJSON(state) {
  const o = computeTotals(toCalcInput(state));
  const selectedVariant = state?.selectedVariant ?? 'noAdd';
  const jobType = state?.jobType ?? 'montage';
  const project_final = projectByVariant(o, selectedVariant);

  return {
    version: 2,
    materials: o.materials,
    sledPercent: o.sledPercent,
    sledKr: o.sledKr,
    extraWork: o.extraWork,
    tralleloft: o.tralleloft,
    km: o.km,
    extraAndKm: o.extraAndKm,
    totalAccord: o.totalAccord,
    hourlyNoAdd: o.hourlyNoAdd,
    hourlyUdd1: o.hourlyUdd1,
    hourlyUdd2: o.hourlyUdd2,
    hourlyUdd2Mentor: o.hourlyUdd2Mentor,
    project_noAdd: o.project_noAdd,
    project_udd1: o.project_udd1,
    project_udd2: o.project_udd2,
    project_udd2Mentor: o.project_udd2Mentor,
    project_final,
    selectedVariant,
    jobType,
    hours: o.hours,
    kmInfo: state?.kmKr ?? 0,
    tralleløftInfo: state?.tralleloftKr ?? state?.tralleløftKr ?? 0
  };
}

export const CSV_HEADER_APPEND =
  'materials;sled_percent;sled_kr;extra_work;tralleløft;km;extra_and_km;total_accord;hourly_no_add;hourly_udd1;hourly_udd2;hourly_udd2_mentor;project_final;hours;km_info;tralleløft_info;job_type;variant';

export function exportCSVRow(state) {
  const input = toCalcInput(state);
  const o = computeTotals(input);
  const variant = state?.selectedVariant ?? 'noAdd';
  const jobType = state?.jobType ?? 'montage';
  const project_final = projectByVariant(o, variant);

  const vals = [
    o.materials,
    o.sledPercent,
    o.sledKr,
    o.extraWork,
    o.tralleloft,
    o.km,
    o.extraAndKm,
    o.totalAccord,
    o.hourlyNoAdd,
    o.hourlyUdd1,
    o.hourlyUdd2,
    o.hourlyUdd2Mentor,
    project_final,
    o.hours,
    state?.kmKr ?? 0,
    state?.tralleloftKr ?? state?.tralleløftKr ?? 0,
    jobType,
    variant
  ];
  return vals.map(v => String(v).replace('.', ',')).join(';');
}
