import { computeAccord, round2 } from '../lib/calc.js';

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

function buildExtraLine(qty, unitPrice) {
  const q = toNumber(qty, 0);
  const p = toNumber(unitPrice, 0);
  return { qty: q, unitPrice: p, total: round2(q * p) };
}

export function deriveTotals(state = {}) {
  const jobType = typeof state.jobType === 'string' ? state.jobType : 'montage';
  const hoursSource = jobType === 'demontage'
    ? (state.hoursDemontage ?? state.hours ?? state.hoursTotal)
    : (state.hoursMontage ?? state.hours ?? state.hoursTotal);
  const hoursTotal = toNumber(hoursSource, 0);

  const materialsSum = toNumber(state?.totals?.materials ?? state.materialsSum, 0);
  const sledPercent = normalisePercent(state.sledPercent ?? state.sledPercentDecimal ?? state.sledPercentInt ?? 0);

  const kmQty = toNumber(state.kmQty ?? state.km, 0);
  const kmRate = toNumber(state.kmRate ?? state.kmSats ?? state.kmRateDefault, 0);

  const holes = buildExtraLine(state.holesQty ?? state.antalBoringHuller, state.holePrice ?? state.holesUnitPrice);
  const closeHole = buildExtraLine(state.closeHoleQty ?? state.antalLukHuller, state.closeHolePrice ?? state.closeHoleUnitPrice);
  const concrete = buildExtraLine(state.concreteQty ?? state.antalBoringBeton, state.concretePrice ?? state.concreteUnitPrice);
  const foldingRail = buildExtraLine(state.foldingRailQty ?? state.antalOpskydeligt, state.foldingRailPrice ?? state.foldingRailUnitPrice);
  const trolleyLift = buildExtraLine(state.trolleyLiftQty, state.trolleyLiftPrice);

  const extrasBase = [
    { key: 'holes', qty: holes.qty, unitPrice: holes.unitPrice },
    { key: 'closeHole', qty: closeHole.qty, unitPrice: closeHole.unitPrice },
    { key: 'concreteDrill', qty: concrete.qty, unitPrice: concrete.unitPrice },
    { key: 'foldingRail', qty: foldingRail.qty, unitPrice: foldingRail.unitPrice },
    { key: 'trolleyLift', qty: trolleyLift.qty, unitPrice: trolleyLift.unitPrice }
  ];

  const extrasFromState = Array.isArray(state.extraLines)
    ? state.extraLines.map((entry) => ({
      key: entry?.key ?? 'extra',
      qty: toNumber(entry?.qty, 0),
      unitPrice: toNumber(entry?.unitPrice, 0)
    }))
    : [];

  const extras = [...extrasBase, ...extrasFromState];

  const result = computeAccord({
    materialsSum,
    sledPercent,
    kmQty,
    kmRate,
    extras,
    hoursTotal,
    udd1Add: toNumber(state?.addOns?.udd1 ?? state.udd1Add ?? state.udd1KrPerHour, 0),
    udd2Add: toNumber(state?.addOns?.udd2 ?? state.udd2Add ?? state.udd2KrPerHour, 0),
    mentorAdd: toNumber(state?.addOns?.mentor ?? state.mentorAdd ?? state.mentorKrPerHour, 0)
  });

  const recognisedTotals = round2(
    holes.total + closeHole.total + concrete.total + foldingRail.total + trolleyLift.total
  );
  const extrasOtherKr = Math.max(0, round2(result.extrasOtherKr - recognisedTotals));

  return {
    ...result,
    jobType,
    sledPercent,
    kmQty,
    kmRate,
    extrasBreakdown: {
      sled: { percent: round2(sledPercent * 100), amount: result.sledKr },
      km: { qty: kmQty, unitPrice: kmRate, total: result.kmKr },
      holes,
      closeHole,
      concreteDrill: concrete,
      foldingRail,
      trolleyLift,
      extrasOtherKr
    },
    extraAndKm: result.extraWorkKr,
    totalAccord: result.accordSumKr
  };
}
