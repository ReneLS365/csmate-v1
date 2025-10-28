/**
 * @purpose Hydrate saved accord payloads into the latest state schema with sensible defaults.
 * @inputs JSON payloads from export v1/v2/v3 including sled percent and tralleløft data.
 * @outputs Normalised state ready for application store consumption.
 */

function normalisePercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n >= 0 && n <= 1) return n;
  return n / 100;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureAddOns(payload) {
  const addOns = payload?.addOns && typeof payload.addOns === 'object' ? payload.addOns : {};
  return {
    udd1: toNumber(payload?.udd1Add ?? payload?.udd1KrPerHour ?? addOns.udd1, 0),
    udd2: toNumber(payload?.udd2Add ?? payload?.udd2KrPerHour ?? addOns.udd2, 0),
    mentor: toNumber(payload?.mentorAdd ?? payload?.mentorKrPerHour ?? addOns.mentor, 0)
  };
}

function ensureTrolleyEntries(payload) {
  if (Array.isArray(payload?.trolleyLiftEntries)) {
    return payload.trolleyLiftEntries.map((entry) => ({
      qty: toNumber(entry?.qty, 0),
      unitPrice: toNumber(entry?.unitPrice, 0)
    }));
  }
  return undefined;
}

export function importJSON(payload) {
  const version = Number(payload?.version ?? 1);
  const materials = toNumber(payload?.materialsKr ?? payload?.materials, 0);
  const sledPercent = normalisePercent(payload?.sledPercent ?? payload?.sledPercentDecimal ?? payload?.sledPercentInt);
  const kmRate = toNumber(payload?.kmRate, 0);
  const kmQty = toNumber(payload?.kmQty, kmRate > 0 ? (toNumber(payload?.kmKr ?? payload?.km, 0) / kmRate) : 0);

  const state = {
    jobType: payload?.jobType ?? 'montage',
    selectedVariant: payload?.selectedVariant ?? 'noAdd',
    materialsSum: materials,
    totals: { materials },
    sledPercent,
    kmQty,
    kmRate,
    holePrice: toNumber(payload?.holePrice, 0),
    holesQty: toNumber(payload?.holesQty ?? payload?.holes, 0),
    closeHolePrice: toNumber(payload?.closeHolePrice, 0),
    closeHoleQty: toNumber(payload?.closeHoleQty ?? payload?.lukAfHulAntal, 0),
    concretePrice: toNumber(payload?.concretePrice, 0),
    concreteQty: toNumber(payload?.concreteQty ?? payload?.boringBetonAntal, 0),
    foldingRailPrice: toNumber(payload?.foldingRailPrice, 0),
    foldingRailQty: toNumber(payload?.foldingRailQty ?? payload?.opskydeligtAntal, 0),
    trolleyLiftPrice: toNumber(payload?.trolleyLiftPrice, 0),
    trolleyLiftQty: toNumber(payload?.trolleyLiftQty, 0),
    trolleyLiftEntries: ensureTrolleyEntries(payload),
    extrasOtherKr: toNumber(payload?.extrasOtherKr, 0),
    hoursTotal: toNumber(payload?.hoursTotal ?? payload?.hours, 0),
    addOns: ensureAddOns(payload)
  };

  if (version < 3) {
    state.trolleyLiftEntries = state.trolleyLiftEntries ?? undefined;

    const legacyKmAmount = toNumber(payload?.kmKr ?? payload?.km, 0);
    const legacyKmRate = toNumber(payload?.kmRate, 0);
    const legacyKmQty = Number(payload?.kmQty);

    if (legacyKmRate > 0) {
      state.kmRate = legacyKmRate;
      if (Number.isFinite(legacyKmQty)) {
        state.kmQty = legacyKmQty;
      } else if (legacyKmAmount !== 0) {
        state.kmQty = toNumber(legacyKmAmount / legacyKmRate, state.kmQty);
      }
    } else {
      if (Number.isFinite(legacyKmQty)) {
        state.kmQty = legacyKmQty;
      }
      if (legacyKmAmount !== 0) {
        state.kmKr = legacyKmAmount;
        state.kmInfo = { total: legacyKmAmount };
      }
    }

    state.holesQty = state.holesQty || 0;
    state.closeHoleQty = state.closeHoleQty || 0;
    state.concreteQty = state.concreteQty || 0;
    state.foldingRailQty = state.foldingRailQty || 0;
    state.trolleyLiftQty = state.trolleyLiftQty || 0;
  }

  return state;
}
