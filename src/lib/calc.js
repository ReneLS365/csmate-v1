// src/lib/calc.js

// Politikker for slæb-procent
export const LOCK_SLED_INT = true;     // brug heltal
export const DEFAULT_SLED_INT = 7;     // default hvis ingen værdi
export const FORCE_SLED_TO_DEFAULT = false; // true => ignorér input og brug DEFAULT_SLED_INT

/**
 * @typedef {Object} CalcInput
 * @property {number} materials   // kr
 * @property {number} sledPercent // % (heltal når LOCK_SLED_INT=true)
 * @property {number} extraWork   // kr (inkl. tralleløft mv.)
 * @property {number} km          // kr
 * @property {number} hours       // timer (den allerede valgte: montage eller demontage)
 * @property {number} udd1        // kr/t
 * @property {number} udd2        // kr/t
 * @property {number} mentor      // kr/t
 */

export function round2(n) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}
function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/**
 * Tal ind -> tal ud. Ingen sideeffekter/formattering.
 */
export function computeTotals(i) {
  const materials = Number(i?.materials || 0);
  const rawSled = Number(i?.sledPercent ?? DEFAULT_SLED_INT);
  const extraWork = Number(i?.extraWork || 0);
  const km = Number(i?.km || 0);
  const hours = Number(i?.hours || 0);
  const udd1 = Number(i?.udd1 || 0);
  const udd2 = Number(i?.udd2 || 0);
  const mentor = Number(i?.mentor || 0);

  let sledPercent = rawSled;
  if (FORCE_SLED_TO_DEFAULT) sledPercent = DEFAULT_SLED_INT;
  if (LOCK_SLED_INT) sledPercent = toInt(sledPercent, DEFAULT_SLED_INT);

  // 1) Materialer
  const out_materials = materials;

  // 2) Slæb (kr)
  const sledKr = materials * (sledPercent / 100);

  // 3) Ekstra arbejde + km
  const out_extraAndKm = extraWork + km;

  // 4) Samlet akkordsum
  const out_totalAccord = out_materials + sledKr + out_extraAndKm;

  // 5) Timepris (uden tillæg)
  const out_hourlyNoAdd = hours > 0 ? out_totalAccord / hours : 0;

  // 7/8/9) Timeløn inkl. tillæg
  const out_hourlyUdd1 = out_hourlyNoAdd + udd1;
  const out_hourlyUdd2 = out_hourlyNoAdd + udd2;
  const out_hourlyUdd2Mentor = out_hourlyNoAdd + udd2 + mentor;

  // 10) Projektsummer (base + løn)
  const wage_noAdd = out_hourlyNoAdd * hours;
  const wage_udd1 = out_hourlyUdd1 * hours;
  const wage_udd2 = out_hourlyUdd2 * hours;
  const wage_udd2Mentor = out_hourlyUdd2Mentor * hours;
  const baseCost = out_materials + sledKr + out_extraAndKm;

  return {
    // grundtal
    materials: round2(out_materials),
    sledPercent: LOCK_SLED_INT ? toInt(sledPercent) : round2(sledPercent),
    sledKr: round2(sledKr),
    extraAndKm: round2(out_extraAndKm),
    totalAccord: round2(out_totalAccord),
    hourlyNoAdd: round2(out_hourlyNoAdd),

    // timepriser
    hourlyUdd1: round2(out_hourlyUdd1),
    hourlyUdd2: round2(out_hourlyUdd2),
    hourlyUdd2Mentor: round2(out_hourlyUdd2Mentor),

    // projektsummer (alle varianter)
    project_noAdd: round2(baseCost + wage_noAdd),
    project_udd1: round2(baseCost + wage_udd1),
    project_udd2: round2(baseCost + wage_udd2),
    project_udd2Mentor: round2(baseCost + wage_udd2Mentor),

    // nyttigt
    hours: round2(hours),
    wage_noAdd: round2(wage_noAdd),
    wage_udd1: round2(wage_udd1),
    wage_udd2: round2(wage_udd2),
    wage_udd2Mentor: round2(wage_udd2Mentor)
  };
}

/**
 * Vælg projektsum efter variant.
 * @param {ReturnType<typeof computeTotals>} o
 * @param {'noAdd'|'udd1'|'udd2'|'udd2Mentor'} variant
 */
export function projectByVariant(o, variant = 'noAdd') {
  switch (variant) {
    case 'udd1':        return o.project_udd1;
    case 'udd2':        return o.project_udd2;
    case 'udd2Mentor':  return o.project_udd2Mentor;
    case 'noAdd':
    default:            return o.project_noAdd;
  }
}
