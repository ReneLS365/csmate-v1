/**
 * @purpose Produce E-Komplet compatible CSV rows with final project totals.
 * @inputs Current accord state including identifiers, status and calculation fields.
 * @outputs Semicolon separated string using Danish decimal formatting.
 */

import { round2 } from '@/lib/calc.js';
import { deriveTotals } from '@/state/derive.js';
import { loadSession } from '@/lib/storage.js';

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

export function buildEkompletPayload(state, totalsOverride, config = {}) {
  const totals = totalsOverride ?? deriveTotals(state);
  const session = loadSession() ?? {};

  return {
    user: session?.user?.username ?? session?.user?.email ?? '',
    role: session?.role ?? 'guest',
    adresse: state?.address ?? state?.adresse ?? '',
    dato: state?.date ?? state?.dato ?? '',
    status: state?.status ?? 'kladde',
    materialsKr: round2(totals.materialsKr),
    sledPercent: round2(state?.sledPercent ?? config?.prices?.sledPercent ?? totals.sledPercent ?? 0),
    sledKr: round2(totals.sledKr),
    kmQty: round2(state?.km ?? state?.kmQty ?? totals.kmQty ?? 0),
    kmRate: round2(state?.kmRate ?? config?.prices?.kmRate ?? totals.kmRate ?? 0),
    kmKr: round2(totals.kmKr),
    holesKr: round2((state?.holesQty ?? 0) * (state?.holePrice ?? config?.prices?.extras?.holePrice ?? 0)),
    closeHoleKr: round2((state?.closeHoleQty ?? 0) * (state?.closeHolePrice ?? config?.prices?.extras?.closeHolePrice ?? 0)),
    concreteKr: round2((state?.concreteQty ?? 0) * (state?.concretePrice ?? config?.prices?.extras?.concretePrice ?? 0)),
    foldingRailKr: round2((state?.foldingRailQty ?? 0) * (state?.foldingRailPrice ?? config?.prices?.extras?.foldingRailPrice ?? 0)),
    trolleyLiftKr: round2((state?.trolleyLiftQty ?? 0) * (state?.trolleyLiftPrice ?? config?.prices?.extras?.trolleyLiftPrice ?? 0)),
    extraWorkKr: round2(totals.extraWorkKr),
    accordSumKr: round2(totals.accordSumKr),
    hoursTotal: round2(totals.hours),
    workers: Array.isArray(state?.workers) ? state.workers : []
  };
}
