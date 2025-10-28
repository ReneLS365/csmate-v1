/**
 * @purpose Build deterministic review section layout data so UI and tests share the same ordering rules.
 * @inputs Computed totals plus optional worker roster, template label, job type and selected variant identifiers.
 * @outputs Structured arrays describing review summary, hourly rates, project totals and metadata rows.
 */

function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normaliseWorkers(workers) {
  if (!Array.isArray(workers)) return [];
  return workers.filter((worker) => {
    if (worker == null) return false;
    const hasName = typeof worker.name === 'string' && worker.name.trim().length > 0;
    const hasHours = Number.isFinite(Number(worker.hours));
    const hasAllowance = Number.isFinite(Number(worker.hourlyWithAllowances));
    return hasName || hasHours || hasAllowance;
  });
}

function buildBreakdownRows(computed) {
  const rows = [];
  const breakdown = computed?.extrasBreakdown ?? {};

  rows.push({
    id: 'extra-sled',
    label: '   Slæb',
    value: coerceNumber(computed?.sledKr),
    format: 'breakdown',
    subtle: true,
    info: { type: 'percent', percent: coerceNumber(breakdown?.sled?.percent) }
  });

  rows.push({
    id: 'extra-km',
    label: '   Kilometer',
    value: coerceNumber(computed?.kmKr),
    format: 'breakdown',
    subtle: true,
    info: {
      type: 'qtyPrice',
      qty: coerceNumber(breakdown?.km?.qty),
      unitPrice: coerceNumber(breakdown?.km?.unitPrice),
      unitLabel: 'km'
    }
  });

  rows.push({
    id: 'extra-holes',
    label: '   Boring af huller',
    value: coerceNumber(breakdown?.holes?.total),
    format: 'breakdown',
    subtle: true,
    info: {
      type: 'qtyPrice',
      qty: coerceNumber(breakdown?.holes?.qty),
      unitPrice: coerceNumber(breakdown?.holes?.unitPrice)
    }
  });

  rows.push({
    id: 'extra-close-hole',
    label: '   Luk af hul',
    value: coerceNumber(breakdown?.closeHole?.total),
    format: 'breakdown',
    subtle: true,
    info: {
      type: 'qtyPrice',
      qty: coerceNumber(breakdown?.closeHole?.qty),
      unitPrice: coerceNumber(breakdown?.closeHole?.unitPrice)
    }
  });

  rows.push({
    id: 'extra-concrete',
    label: '   Boring i beton',
    value: coerceNumber(breakdown?.concreteDrill?.total),
    format: 'breakdown',
    subtle: true,
    info: {
      type: 'qtyPrice',
      qty: coerceNumber(breakdown?.concreteDrill?.qty),
      unitPrice: coerceNumber(breakdown?.concreteDrill?.unitPrice)
    }
  });

  rows.push({
    id: 'extra-folding-rail',
    label: '   Opslåeligt rækværk',
    value: coerceNumber(breakdown?.foldingRail?.total),
    format: 'breakdown',
    subtle: true,
    info: {
      type: 'qtyPrice',
      qty: coerceNumber(breakdown?.foldingRail?.qty),
      unitPrice: coerceNumber(breakdown?.foldingRail?.unitPrice)
    }
  });

  rows.push({
    id: 'extra-trolley',
    label: '   Tralleløft',
    value: coerceNumber(breakdown?.trolleyLift?.total),
    format: 'breakdown',
    subtle: true,
    info: {
      type: 'trolley',
      qty: coerceNumber(breakdown?.trolleyLift?.qty),
      entries: Array.isArray(breakdown?.trolleyLift?.entries) ? breakdown.trolleyLift.entries : []
    }
  });

  const extrasOther = coerceNumber(breakdown?.extrasOtherKr);
  if (extrasOther > 0) {
    rows.push({
      id: 'extra-other',
      label: '   Øvrige ekstraarbejde',
      value: extrasOther,
      format: 'currency',
      subtle: true
    });
  }

  return rows;
}

export function createReviewLayout(options = {}) {
  const computed = options.computed && typeof options.computed === 'object' ? options.computed : {};
  const workers = normaliseWorkers(options.workers);
  const templateLabel = typeof options.templateLabel === 'string' ? options.templateLabel : '';
  const jobType = typeof options.jobType === 'string' ? options.jobType : 'montage';
  const variant = typeof options.variant === 'string' ? options.variant : 'noAdd';

  const hoursFromComputed = coerceNumber(computed.hours, NaN);
  const fallbackHours = workers.reduce((sum, worker) => sum + coerceNumber(worker.hours), 0);
  const totalHours = Number.isFinite(hoursFromComputed) ? hoursFromComputed : fallbackHours;
  const workersCount = workers.length;

  const summary = [
    { id: 'materials', label: '1. Materialer', value: coerceNumber(computed.materialsKr ?? computed.materials), format: 'currency' },
    { id: 'extraWork', label: '2. Ekstra arbejde', value: coerceNumber(computed.extraWorkKr ?? computed.extraWork), format: 'currency' },
    ...buildBreakdownRows(computed),
    { id: 'accordSum', label: '3. Samlet akkordsum', value: coerceNumber(computed.accordSumKr ?? computed.totalAccord), format: 'currency', emphasize: true },
    { id: 'hours', label: '4. Timer', value: coerceNumber(totalHours), format: 'hours' },
    { id: 'hourlyNoAdd', label: '5. Timepris (uden tillæg)', value: coerceNumber(computed.hourlyNoAdd), format: 'hourly' }
  ];

  const hourly = [
    { id: 'hourlyUdd1', label: '6. Timeløn m. UDD1', value: coerceNumber(computed.hourlyUdd1), format: 'hourly' },
    { id: 'hourlyUdd2', label: '7. Timeløn m. UDD2', value: coerceNumber(computed.hourlyUdd2), format: 'hourly' },
    {
      id: 'hourlyUdd2Mentor',
      label: '8. Timeløn m. UDD2 + Mentor',
      value: coerceNumber(computed.hourlyUdd2Mentor),
      format: 'hourly'
    }
  ];

  const project = [];

  const metadata = [
    { id: 'template', label: 'Skabelon', value: templateLabel, format: 'text', subtle: true },
    {
      id: 'team',
      label: 'Medarbejdere & timer',
      value: { workersCount, hours: totalHours },
      format: 'team',
      subtle: true
    },
    { id: 'jobType', label: 'Jobtype', value: jobType, format: 'text', subtle: true },
    { id: 'variant', label: 'Variant', value: variant, format: 'text', subtle: true }
  ];

  return { summary, hourly, project, metadata };
}
