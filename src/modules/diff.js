/**
 * @purpose Create lightweight hashes for state comparisons when tracking dirty banners.
 * @inputs Serializable state objects representing current and persisted payloads.
 * @outputs String hash suitable for equality checks between snapshots.
 */

export function hashState(state) {
  const s = JSON.stringify(state ?? {});
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return String(h);
}
