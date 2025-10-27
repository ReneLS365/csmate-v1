/**
 * @purpose Safely normalise numeric user input while supporting Danish decimal separators.
 * @inputs Raw string/number values from forms plus optional fallback boundaries.
 * @outputs Coerced number or integer percentage constrained within expected bounds.
 */

export function toNumber(v, fallback = 0) {
  const s = String(v ?? '').trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export function toIntPercent(v, fallback = 0) {
  const s = String(v ?? '').trim().replace(',', '.');
  const n = Math.round(Number(s));
  return Number.isFinite(n) ? n : fallback;
}

export function clampInt(v, min = 0, max = 100) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
