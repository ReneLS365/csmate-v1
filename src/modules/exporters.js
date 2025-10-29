/**
 * @purpose Serialise accord state into JSON/CSV exports with deterministic totals.
 * @inputs Raw application state snapshots resolved through calculation selectors.
 * @outputs JSON payload for persistence and CSV row strings for Excel/E-Komplet compatibility.
 */

import { deriveTotals } from '@/state/derive.js';
import { round2 } from '@/lib/calc.js';
import { loadSession } from '@/lib/storage.js';

function formatNumber(value) {
  return round2(value ?? 0);
}

function buildExportPayload(state) {
  const totals = deriveTotals(state);
  const breakdown = totals.extrasBreakdown ?? {};
  const holes = breakdown.holes ?? { qty: 0, unitPrice: 0, total: 0 };
  const closeHole = breakdown.closeHole ?? { qty: 0, unitPrice: 0, total: 0 };
  const concrete = breakdown.concreteDrill ?? { qty: 0, unitPrice: 0, total: 0 };
  const foldingRail = breakdown.foldingRail ?? { qty: 0, unitPrice: 0, total: 0 };
  const trolleyLift = breakdown.trolleyLift ?? { qty: 0, unitPrice: 0, total: 0 };
  const extrasOtherKr = formatNumber(totals.extrasOtherKr);

  const session = loadSession() ?? {};
  const payload = {
    version: 3,
    user: session?.user?.username ?? session?.user?.email ?? '',
    role: session?.role ?? 'guest',
    materialsKr: formatNumber(totals.materialsKr),
    sledPercent: formatNumber(totals.sledPercent),
    sledKr: formatNumber(totals.sledKr),
    kmQty: formatNumber(totals.kmQty),
    kmRate: formatNumber(totals.kmRate),
    kmKr: formatNumber(totals.kmKr),
    holesQty: formatNumber(holes.qty),
    holePrice: formatNumber(holes.unitPrice),
    closeHoleQty: formatNumber(closeHole.qty),
    closeHolePrice: formatNumber(closeHole.unitPrice),
    concreteQty: formatNumber(concrete.qty),
    concretePrice: formatNumber(concrete.unitPrice),
    foldingRailQty: formatNumber(foldingRail.qty),
    foldingRailPrice: formatNumber(foldingRail.unitPrice),
    trolleyLiftQty: formatNumber(trolleyLift.qty),
    trolleyLiftPrice: formatNumber(trolleyLift.unitPrice),
    extrasOtherKr,
    extraWorkKr: formatNumber(totals.extraWorkKr),
    accordSumKr: formatNumber(totals.accordSumKr),
    hoursTotal: formatNumber(totals.hours),
    hourlyNoAdd: formatNumber(totals.hourlyNoAdd),
    hourlyUdd1: formatNumber(totals.hourlyUdd1),
    hourlyUdd2: formatNumber(totals.hourlyUdd2),
    hourlyUdd2Mentor: formatNumber(totals.hourlyUdd2Mentor),
    selectedVariant: state?.selectedVariant ?? 'noAdd',
    jobType: totals.jobType ?? state?.jobType ?? 'montage',
    udd1Add: formatNumber(state?.addOns?.udd1 ?? state?.udd1Add ?? state?.udd1KrPerHour),
    udd2Add: formatNumber(state?.addOns?.udd2 ?? state?.udd2Add ?? state?.udd2KrPerHour),
    mentorAdd: formatNumber(state?.addOns?.mentor ?? state?.mentorAdd ?? state?.mentorKrPerHour)
  };

  return payload;
}

export function exportJSON(state) {
  return buildExportPayload(state);
}

export const CSV_HEADER_APPEND = 'materials_kr;sled_percent;sled_kr;km_qty;km_rate;km_kr;holes_qty;hole_price;close_hole_qty;close_hole_price;concrete_qty;concrete_price;folding_rail_qty;folding_rail_price;trolley_lift_qty;trolley_lift_price;extras_other_kr;extra_work_kr;accord_sum_kr;hours_total;hourly_no_add;hourly_udd1;hourly_udd2;hourly_udd2_mentor;selected_variant;job_type';

function formatCSVValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2).replace('.', ',');
  }
  if (value == null) return '';
  return String(value).replace('.', ',');
}

export function exportCSVRow(state) {
  const payload = buildExportPayload(state);
  const values = [
    payload.materialsKr,
    payload.sledPercent,
    payload.sledKr,
    payload.kmQty,
    payload.kmRate,
    payload.kmKr,
    payload.holesQty,
    payload.holePrice,
    payload.closeHoleQty,
    payload.closeHolePrice,
    payload.concreteQty,
    payload.concretePrice,
    payload.foldingRailQty,
    payload.foldingRailPrice,
    payload.trolleyLiftQty,
    payload.trolleyLiftPrice,
    payload.extrasOtherKr,
    payload.extraWorkKr,
    payload.accordSumKr,
    payload.hoursTotal,
    payload.hourlyNoAdd,
    payload.hourlyUdd1,
    payload.hourlyUdd2,
    payload.hourlyUdd2Mentor,
    payload.selectedVariant,
    payload.jobType
  ];

  return values.map(formatCSVValue).join(';');
}
