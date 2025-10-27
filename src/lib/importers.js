// src/lib/importers.js
import { DEFAULT_SLED_INT } from '@/lib/calc';

function restoreOldState(payload) {
  // Behold eksisterende keys, mappet til state
  return { ...payload };
}

export function importJSON(payload) {
  const v = Number(payload?.version || 1);
  const state = restoreOldState(payload);

  const hasTralleloftKr =
    state.tralleløftKr != null || state.tralleloftKr != null;
  const tralleloftInfo =
    state.tralleløftInfo ?? payload?.tralleløftInfo ?? payload?.tralleloftInfo;

  // V2 eksport gemmer info under tralleløftInfo. Map tilbage til forventet key.
  if (!hasTralleloftKr && tralleloftInfo != null) {
    const amount = Number(tralleloftInfo);
    const normalized = Number.isFinite(amount) ? amount : 0;
    state.tralleløftKr = normalized;
    state.tralleloftKr = normalized;
  }

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
