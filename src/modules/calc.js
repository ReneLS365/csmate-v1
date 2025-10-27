/**
 * @purpose Provide deterministic accord calculations and variant totals from a single source of truth.
 * @inputs CalcInput structure with monetary fields (kr) and percentage sled value.
 * @outputs Rounded totals for materials, sled, wages, and project variants including helper metadata.
 */

export const LOCK_SLED_INT = true;
export const DEFAULT_SLED_INT = 7;
export const FORCE_SLED_TO_DEFAULT = false;

/**
 * @typedef {Object} CalcInput
 * @property {number} materials
 * @property {number} sledPercent
 * @property {number} extraWork
 * @property {number} tralleloft
 * @property {number} km
 * @property {number} hours
 * @property {number} udd1
 * @property {number} udd2
 * @property {number} mentor
 */

export function round2(n) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/**
 * @param {CalcInput} i
 */
export function computeTotals(i) {
  const materials = Number(i?.materials || 0);
  const rawSled = Number(i?.sledPercent ?? DEFAULT_SLED_INT);
  const extraWork = Number(i?.extraWork || 0);
  const tralleloft = Number(i?.tralleloft || 0);
  const km = Number(i?.km || 0);
  const hours = Number(i?.hours || 0);
  const udd1 = Number(i?.udd1 || 0);
  const udd2 = Number(i?.udd2 || 0);
  const mentor = Number(i?.mentor || 0);

  let sledPercent = rawSled;
  if (FORCE_SLED_TO_DEFAULT) sledPercent = DEFAULT_SLED_INT;
  if (LOCK_SLED_INT) sledPercent = toInt(sledPercent, DEFAULT_SLED_INT);

  const out_materials = materials;
  const sledKr = materials * (sledPercent / 100);
  const extraBundle = extraWork + tralleloft;
  const out_extraAndKm = extraBundle + km;
  const out_totalAccord = out_materials + sledKr + out_extraAndKm;
  const out_hourlyNoAdd = hours > 0 ? out_totalAccord / hours : 0;
  const out_hourlyUdd1 = out_hourlyNoAdd + udd1;
  const out_hourlyUdd2 = out_hourlyNoAdd + udd2;
  const out_hourlyUdd2Mentor = out_hourlyNoAdd + udd2 + mentor;

  const wage_noAdd = out_hourlyNoAdd * hours;
  const wage_udd1 = out_hourlyUdd1 * hours;
  const wage_udd2 = out_hourlyUdd2 * hours;
  const wage_udd2Mentor = out_hourlyUdd2Mentor * hours;
  const baseCost = out_materials + sledKr + out_extraAndKm;

  return {
    materials: round2(out_materials),
    sledPercent: LOCK_SLED_INT ? toInt(sledPercent) : round2(sledPercent),
    sledKr: round2(sledKr),
    extraWork: round2(extraWork),
    tralleloft: round2(tralleloft),
    km: round2(km),
    extraAndKm: round2(out_extraAndKm),
    totalAccord: round2(out_totalAccord),
    hourlyNoAdd: round2(out_hourlyNoAdd),
    hourlyUdd1: round2(out_hourlyUdd1),
    hourlyUdd2: round2(out_hourlyUdd2),
    hourlyUdd2Mentor: round2(out_hourlyUdd2Mentor),
    project_noAdd: round2(baseCost + wage_noAdd),
    project_udd1: round2(baseCost + wage_udd1),
    project_udd2: round2(baseCost + wage_udd2),
    project_udd2Mentor: round2(baseCost + wage_udd2Mentor),
    hours: round2(hours),
    wage_noAdd: round2(wage_noAdd),
    wage_udd1: round2(wage_udd1),
    wage_udd2: round2(wage_udd2),
    wage_udd2Mentor: round2(wage_udd2Mentor)
  };
}

export function projectByVariant(o, variant = 'noAdd') {
  switch (variant) {
    case 'udd1':
      return o.project_udd1;
    case 'udd2':
      return o.project_udd2;
    case 'udd2Mentor':
      return o.project_udd2Mentor;
    case 'noAdd':
    default:
      return o.project_noAdd;
  }
}
