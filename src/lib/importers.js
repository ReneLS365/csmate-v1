// src/lib/importers.js
import { DEFAULT_SLED_INT } from '@/lib/calc';

function restoreOldState(payload) {
  // Behold eksisterende keys, mappet til state
  return { ...payload };
}

export function importJSON(payload) {
  const v = Number(payload?.version || 1);
  const state = restoreOldState(payload);

  // defaults for ældre payloads
  if (v < 2) {
    if (state.sledPercent == null) state.sledPercent = DEFAULT_SLED_INT;
    if (state.tralleløftKr == null && state.tralleloftKr == null) state.tralleløftKr = 0;
  }

  // sikr heltal for slæb
  const n = Math.round(Number(state.sledPercent ?? DEFAULT_SLED_INT));
  state.sledPercent = Number.isFinite(n) ? n : DEFAULT_SLED_INT;

  // sikr meta defaults
  state.jobType = state.jobType ?? 'montage';
  state.selectedVariant = state.selectedVariant ?? 'noAdd';

  return state;
}
