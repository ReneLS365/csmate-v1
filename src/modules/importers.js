/**
 * @purpose Hydrate exported akkord data into application state with numeric defaults.
 * @inputs JSON payload following the v3 export schema (materials, km, extra work, trolley lift).
 * @outputs Plain state object ready for selectors/deriveTotals.
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalisePercent(value) {
  if (value == null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n >= 0 && n <= 1) return n;
  return n / 100;
}

function ensureAddOns(payload) {
  const addOns = payload?.addOns && typeof payload.addOns === 'object' ? payload.addOns : {};
  return {
    udd1: toNumber(payload?.udd1Add ?? addOns.udd1, 0),
    udd2: toNumber(payload?.udd2Add ?? addOns.udd2, 0),
    mentor: toNumber(payload?.mentorAdd ?? addOns.mentor, 0)
  };
}

export function importJSON(payload = {}) {
  const materials = toNumber(payload.materialsKr ?? payload.materialsSum ?? payload.materials, 0);
  const sledPercent = normalisePercent(payload.sledPercent);
  const kmQty = toNumber(payload.kmQty, 0);
  const kmRate = toNumber(payload.kmRate, 0);

  return {
    version: 3,
    jobType: payload.jobType ?? 'montage',
    selectedVariant: payload.selectedVariant ?? 'noAdd',
    materialsSum: materials,
    totals: { materials },
    sledPercent,
    kmQty,
    km: kmQty,
    kmRate,
    holesQty: toNumber(payload.holesQty, 0),
    holePrice: toNumber(payload.holePrice, 0),
    closeHoleQty: toNumber(payload.closeHoleQty, 0),
    closeHolePrice: toNumber(payload.closeHolePrice, 0),
    concreteQty: toNumber(payload.concreteQty, 0),
    concretePrice: toNumber(payload.concretePrice, 0),
    foldingRailQty: toNumber(payload.foldingRailQty, 0),
    foldingRailPrice: toNumber(payload.foldingRailPrice, 0),
    trolleyLiftQty: toNumber(payload.trolleyLiftQty, 0),
    trolleyLiftPrice: toNumber(payload.trolleyLiftPrice, 0),
    extrasOtherKr: toNumber(payload.extrasOtherKr, 0),
    hoursTotal: toNumber(payload.hoursTotal ?? payload.hours, 0),
    hoursMontage: toNumber(payload.hoursTotal ?? payload.hours, 0),
    addOns: ensureAddOns(payload)
  };
}
