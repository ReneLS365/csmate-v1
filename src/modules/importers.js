/**
 * @purpose Hydrate saved accord payloads into the latest state schema with sensible defaults.
 * @inputs JSON payloads from export v1/v2 including sled percent and tralleløft data.
 * @outputs Normalised state ready for application store consumption.
 */

import { DEFAULT_SLED_INT } from '@/modules/calc';

function restoreOldState(payload) {
  return { ...payload };
}

export function importJSON(payload) {
  const v = Number(payload?.version || 1);
  const state = restoreOldState(payload);

  if (v < 2) {
    if (state.sledPercent == null) state.sledPercent = DEFAULT_SLED_INT;
    if (state.tralleløftKr == null && state.tralleloftKr == null) state.tralleløftKr = 0;
  }

  const tralleløftInfo =
    payload?.tralleløftInfo ??
    payload?.tralleloftInfo ??
    state?.tralleløftInfo ??
    state?.tralleloftInfo;

  const hasPrimaryLift = state.tralleløftKr != null;
  const hasAsciiLift = state.tralleloftKr != null;

  if (!hasPrimaryLift && !hasAsciiLift && tralleløftInfo != null) {
    state.tralleløftKr = tralleløftInfo;
    state.tralleloftKr = tralleløftInfo;
  } else if (!hasPrimaryLift && hasAsciiLift) {
    state.tralleløftKr = state.tralleloftKr;
  }

  const n = Math.round(Number(state.sledPercent ?? DEFAULT_SLED_INT));
  state.sledPercent = Number.isFinite(n) ? n : DEFAULT_SLED_INT;

  state.jobType = state.jobType ?? 'montage';
  state.selectedVariant = state.selectedVariant ?? 'noAdd';

  return state;
}
