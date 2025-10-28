export function round2(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Tralleløft modelleres som en ekstra-linje (qty * unitPrice).
 * "kmQty" vises i (info), mens "kmRate" * "kmQty" indgår i totalen.
 */
export function computeAccord(input = {}) {
  const materials = Number(input.materialsSum) || 0;

  const sledKr = round2(materials * (Number(input.sledPercent) || 0));
  const kmQty = Number(input.kmQty) || 0;
  const kmRate = Number(input.kmRate) || 0;
  const kmKrOverride = Number(input.kmKr);
  const kmKr = Number.isFinite(kmKrOverride) ? round2(kmKrOverride) : round2(kmQty * kmRate);

  const extras = Array.isArray(input.extras) ? input.extras : [];
  const extrasOtherKr = round2(
    extras.reduce(
      (sum, entry) => sum + (Number(entry.qty) || 0) * (Number(entry.unitPrice) || 0),
      0
    )
  );

  const extraWorkKr = round2(sledKr + kmKr + extrasOtherKr);
  const accordSumKr = round2(materials + extraWorkKr);

  const hours = Number(input.hoursTotal) || 0;
  const hourlyNoAdd = hours > 0 ? round2(accordSumKr / hours) : 0;

  const udd1Add = Number(input.udd1Add) || 0;
  const udd2Add = Number(input.udd2Add) || 0;
  const mentorAdd = Number(input.mentorAdd) || 0;

  return {
    materialsKr: materials,
    sledKr,
    kmQty,
    kmRate,
    kmKr,
    extrasOtherKr,
    extraWorkKr,
    accordSumKr,
    hours,
    hourlyNoAdd,
    hourlyUdd1: round2(hourlyNoAdd + udd1Add),
    hourlyUdd2: round2(hourlyNoAdd + udd2Add),
    hourlyUdd2Mentor: round2(hourlyNoAdd + udd2Add + mentorAdd)
  };
}
