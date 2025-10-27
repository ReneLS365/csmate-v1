/**
 * @purpose Calculate project totals in a deterministic order without double counting.
 * @inputs model: {
 *   materialLines?: Array<{ qty?: number, unitPrice?: number }>,
 *   slaebeBelob?: number,
 *   extra?: {
 *     tralleløft?: number,
 *     huller?: number,
 *     boring?: number,
 *     lukAfHul?: number,
 *     opskydeligt?: number,
 *     km?: number,
 *     oevrige?: number
 *   },
 *   workers?: Array<{ hours?: number, hourlyWithAllowances?: number }>,
 *   totalHours?: number
 * }
 * @outputs Object med nøglerne: materialer, ekstraarbejde, slaeb, samletAkkordsum,
 *          timeprisUdenTillaeg, montoerLonMedTillaeg, projektsum.
 */
const safe = value => (Number.isFinite(value) ? value : 0)

export function calculateTotals (model = {}) {
  const lines = Array.isArray(model.materialLines) ? model.materialLines : []
  const materialer = safe(
    lines.reduce((sum, line) => sum + safe(line?.qty) * safe(line?.unitPrice), 0)
  )

  const extra = model.extra || {}
  const ekstraarbejde = safe(
    safe(extra.tralleløft) +
    safe(extra.huller) +
    safe(extra.boring) +
    safe(extra.lukAfHul) +
    safe(extra.opskydeligt) +
    safe(extra.km) +
    safe(extra.oevrige)
  )

  const slaeb = safe(model.slaebeBelob)
  const samletAkkordsum = materialer + ekstraarbejde + slaeb

  const totalTimer = safe(model.totalHours)
  const timeprisUdenTillaeg = totalTimer > 0 ? samletAkkordsum / totalTimer : 0

  const workers = Array.isArray(model.workers) ? model.workers : []
  const montoerLonMedTillaeg = safe(
    workers.reduce((sum, worker) => sum + safe(worker?.hours) * safe(worker?.hourlyWithAllowances), 0)
  )

  const projektsum = samletAkkordsum + montoerLonMedTillaeg

  return {
    materialer,
    ekstraarbejde,
    slaeb,
    samletAkkordsum,
    timeprisUdenTillaeg,
    montoerLonMedTillaeg,
    projektsum
  }
}
