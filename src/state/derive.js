import { computeAccord, round2 } from '../lib/calc.js';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalisePercent(value) {
  if (value == null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n <= 1 && n >= 0) return n;
  return n / 100;
}

function normaliseExtraEntry(qty, unitPrice) {
  const q = toNumber(qty, 0);
  const p = toNumber(unitPrice, 0);
  return {
    qty: q,
    unitPrice: p,
    total: round2(q * p)
  };
}

function collectTrolleyEntries(state) {
  const entries = [];

  const push = (qty, price) => {
    const q = toNumber(qty, 0);
    const p = toNumber(price, 0);
    if (q === 0 && p === 0) return;
    entries.push({ qty: q, unitPrice: p });
  };

  if (Array.isArray(state?.trolleyLiftEntries)) {
    state.trolleyLiftEntries.forEach((entry) => {
      if (!entry) return;
      push(entry.qty, entry.unitPrice);
    });
  }

  if (state?.trolleyLiftQty != null || state?.trolleyLiftPrice != null) {
    push(state.trolleyLiftQty, state?.trolleyLiftPrice ?? state?.trolleyLiftRate);
  }

  if (state?.trolleyLift35Qty != null || state?.trolleyLift35Price != null) {
    push(state.trolleyLift35Qty, state?.trolleyLift35Price ?? state?.trolleyLift35Rate);
  }

  if (state?.trolleyLift50Qty != null || state?.trolleyLift50Price != null) {
    push(state.trolleyLift50Qty, state?.trolleyLift50Price ?? state?.trolleyLift50Rate);
  }

  return entries;
}

export function deriveTotals(state = {}) {
  const jobType = state?.jobType ?? 'montage';
  const hoursSource = jobType === 'demontage'
    ? (state?.hoursDemontage ?? state?.hours ?? state?.hoursTotal)
    : (state?.hoursMontage ?? state?.hours ?? state?.hoursTotal);
  const hoursTotal = toNumber(hoursSource, 0);

  const materialsSum = toNumber(state?.totals?.materials ?? state?.materialsSum, 0);
  const sledPercentRaw = state?.sledPercent ?? state?.sledPercentDecimal ?? 0;
  const sledPercent = normalisePercent(sledPercentRaw);

  const kmQtyRaw = toNumber(state?.kmQty ?? state?.km, 0);
  const kmRate = toNumber(state?.kmRate, toNumber(state?.kmSats ?? state?.kmRateDefault, 0));

  const kmInfo = state?.kmInfo;
  const kmCostFallbacks = [
    state?.kmKr,
    typeof kmInfo === 'object' ? kmInfo?.total ?? kmInfo?.kr ?? kmInfo?.amount : undefined,
    typeof kmInfo === 'number' ? kmInfo : undefined
  ];

  let kmQty = kmQtyRaw;
  let kmKrOverride;

  for (const candidate of kmCostFallbacks) {
    const value = Number(candidate);
    if (!Number.isFinite(value)) continue;
    if (kmRate > 0) {
      if (kmQty === 0 && value !== 0) {
        kmQty = toNumber(value / kmRate, kmQty);
      }
    } else {
      kmKrOverride = value;
    }
    break;
  }

  const holePrice = state?.holePrice ?? state?.holesUnitPrice;
  const closeHolePrice = state?.closeHolePrice ?? state?.closeHoleUnitPrice;
  const concretePrice = state?.concretePrice ?? state?.concreteUnitPrice;
  const foldingRailPrice = state?.foldingRailPrice ?? state?.foldingRailUnitPrice;

  const extrasBreakdown = {
    sled: { percent: round2(sledPercent * 100), amount: 0 },
    km: { qty: kmQty, unitPrice: kmRate, total: 0 },
    holes: normaliseExtraEntry(state?.holesQty ?? state?.antalBoringHuller, holePrice),
    closeHole: normaliseExtraEntry(state?.closeHoleQty ?? state?.antalLukHuller, closeHolePrice),
    concreteDrill: normaliseExtraEntry(state?.concreteQty ?? state?.antalBoringBeton, concretePrice),
    foldingRail: normaliseExtraEntry(state?.foldingRailQty ?? state?.antalOpskydeligt, foldingRailPrice)
  };

  const trolleyEntries = collectTrolleyEntries(state);
  const trolleyTotals = trolleyEntries.reduce((acc, entry) => {
    const q = toNumber(entry.qty, 0);
    const p = toNumber(entry.unitPrice, 0);
    acc.qty += q;
    acc.total += q * p;
    if (q > 0) {
      acc.entries.push({ qty: q, unitPrice: p, total: round2(q * p) });
    }
    return acc;
  }, { qty: 0, total: 0, entries: [] });

  const trolleyUnitPrice = trolleyTotals.qty > 0 ? trolleyTotals.total / trolleyTotals.qty : toNumber(state?.trolleyLiftPrice, 0);
  const trolleyLift = {
    qty: trolleyTotals.qty,
    unitPrice: round2(trolleyUnitPrice),
    total: round2(trolleyTotals.total),
    entries: trolleyTotals.entries
  };

  const extrasArray = [
    { key: 'holes', ...extrasBreakdown.holes },
    { key: 'closeHole', ...extrasBreakdown.closeHole },
    { key: 'concreteDrill', ...extrasBreakdown.concreteDrill },
    { key: 'foldingRail', ...extrasBreakdown.foldingRail },
    ...trolleyEntries.map((entry) => ({ key: 'trolleyLift', qty: entry.qty, unitPrice: entry.unitPrice }))
  ].filter((entry) => (Number(entry.qty) || 0) !== 0 || (Number(entry.unitPrice) || 0) !== 0);

  const extrasFromState = Array.isArray(state?.extraLines)
    ? state.extraLines.map((entry) => ({
      key: entry?.key ?? 'extra',
      qty: toNumber(entry?.qty, 0),
      unitPrice: toNumber(entry?.unitPrice, 0)
    }))
    : [];

  extrasFromState.forEach((entry) => {
    if ((entry.qty || 0) === 0 && (entry.unitPrice || 0) === 0) return;
    extrasArray.push(entry);
  });

  const recognizedKeys = new Set(['holes', 'closeHole', 'concreteDrill', 'foldingRail', 'trolleyLift']);
  const extrasOtherRaw = extrasArray
    .filter((entry) => !recognizedKeys.has(entry.key))
    .reduce((sum, entry) => sum + toNumber(entry.qty, 0) * toNumber(entry.unitPrice, 0), 0);

  const result = computeAccord({
    materialsSum,
    sledPercent,
    kmQty,
    kmRate,
    kmKr: kmKrOverride,
    extras: extrasArray,
    hoursTotal,
    udd1Add: toNumber(state?.addOns?.udd1 ?? state?.udd1Add ?? state?.udd1KrPerHour, 0),
    udd2Add: toNumber(state?.addOns?.udd2 ?? state?.udd2Add ?? state?.udd2KrPerHour, 0),
    mentorAdd: toNumber(state?.addOns?.mentor ?? state?.mentorAdd ?? state?.mentorKrPerHour, 0)
  });

  extrasBreakdown.sled.amount = result.sledKr;
  extrasBreakdown.km.total = result.kmKr;

  const extrasOtherTotal = round2(extrasOtherRaw);

  return {
    ...result,
    jobType,
    sledPercent,
    kmRate,
    kmQty,
    extrasBreakdown: {
      ...extrasBreakdown,
      trolleyLift,
      extrasOtherKr: extrasOtherTotal < 0 ? 0 : extrasOtherTotal
    },
    trolleyLift,
    extraAndKm: result.extraWorkKr,
    totalAccord: result.accordSumKr
  };
}
