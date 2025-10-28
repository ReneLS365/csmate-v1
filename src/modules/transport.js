/**
 * @purpose Beregn procentuelt transporttillæg ud fra HP3-trin baseret på distance og tenantregler.
 * @inputs Distance i meter (number) og transport_rules objekt fra template med included_distance_m og tiers.
 * @outputs Procenttillæg som tal med to decimaler uden afrundingstab (0 hvis ingen tillæg).
 */

import { round2 } from '@/modules/calc';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureTiers(rules) {
  return Array.isArray(rules?.tiers) ? rules.tiers : [];
}

export function calculateTransportSurcharge(distanceMeters, rules) {
  const distance = toNumber(distanceMeters, 0);
  if (distance <= 0) return 0;

  const included = toNumber(rules?.included_distance_m, 0);
  if (distance <= included) return 0;

  const tiers = ensureTiers(rules);
  if (tiers.length === 0) return 0;

  let totalPercent = 0;

  for (const tier of tiers) {
    const step = Math.max(1, toNumber(tier?.step_m, 1));
    const percent = toNumber(tier?.percent, 0);
    if (percent <= 0) continue;

    const lowerBound = toNumber(tier?.from_m, included);
    const upperBoundRaw = tier?.to_m;
    const upperBound = upperBoundRaw == null ? Infinity : toNumber(upperBoundRaw, Infinity);

    if (distance <= lowerBound) continue;

    const spanEnd = Math.min(distance, upperBound);
    if (spanEnd <= lowerBound) continue;

    const covered = spanEnd - lowerBound;
    const steps = Math.ceil(covered / step);
    if (steps <= 0) continue;

    totalPercent += steps * percent;
  }

  return round2(totalPercent);
}

export function resolveTransportRules(template) {
  const rules = template?.transport_rules;
  if (!rules) return { included_distance_m: 0, tiers: [] };
  const included = toNumber(rules.included_distance_m, 0);
  const tiers = ensureTiers(rules).map((tier) => ({
    from_m: toNumber(tier?.from_m, included),
    to_m: tier?.to_m == null ? null : toNumber(tier.to_m, null),
    step_m: Math.max(1, toNumber(tier?.step_m, 1)),
    percent: toNumber(tier?.percent, 0)
  }));
  return { included_distance_m: included, tiers };
}
