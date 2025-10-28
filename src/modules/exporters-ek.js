/**
 * @purpose Produce E-Komplet compatible CSV rows with final project totals.
 * @inputs Current accord state including identifiers, status and calculation fields.
 * @outputs Semicolon separated string using Danish decimal formatting.
 */

import { round2 } from '@/lib/calc.js';
import { deriveTotals } from '@/state/derive.js';

export const EK_HEADER = 'project_id;job_type;variant;hours;base_wage;hourly_no_add;overskud_pr_time;overskud_total;accord_sum';

function formatValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2).replace('.', ',');
  }
  if (value == null) return '';
  return String(value).replace('.', ',');
}

export function exportEKCSV(state) {
  const totals = deriveTotals(state);
  const baseWageRaw = state?.pay?.base_wage_hourly ?? state?.baseWage ?? state?.base_wage_hourly ?? 0;
  const baseWage = round2(Number.isFinite(Number(baseWageRaw)) ? Number(baseWageRaw) : 0);
  const hours = round2(totals.hours);
  const hourlyNoAdd = round2(totals.hourlyNoAdd);
  const overskudPerTime = round2(Math.max(hourlyNoAdd - baseWage, 0));
  const overskudTotal = round2(Math.max(overskudPerTime * hours, 0));

  const row = [
    state?.id ?? '',
    totals.jobType ?? state?.jobType ?? 'montage',
    state?.selectedVariant ?? 'noAdd',
    hours,
    baseWage,
    hourlyNoAdd,
    overskudPerTime,
    overskudTotal,
    round2(totals.accordSumKr)
  ];

  return row.map(formatValue).join(';');
}
