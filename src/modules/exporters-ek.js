/**
 * @purpose Produce E-Komplet compatible CSV rows with final project totals.
 * @inputs Current accord state including identifiers, status and calculation fields.
 * @outputs Semicolon separated string using Danish decimal formatting.
 */

import { selectComputed } from '@/modules/selectors';

export const EK_HEADER = 'id;job_type;variant;status;hours;project_final';

export function exportEKCSV(state) {
  const o = selectComputed(state);
  const row = [
    state?.id ?? '',
    o.jobType,
    o.selectedVariant,
    state?.status ?? 'kladde',
    o.hours,
    o.project_final
  ];
  return row.map(v => String(v).replace('.', ',')).join(';');
}
