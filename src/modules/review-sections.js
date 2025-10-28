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
    { id: 'materials', label: '1. Materialer', value: coerceNumber(computed.materials), format: 'currency' },
    {
      id: 'sled',
      label: '2. Slæb',
      value: { percent: coerceNumber(computed.sledPercent), amount: coerceNumber(computed.sledKr) },
      format: 'sled'
    },
    { id: 'extraWork', label: '3. Ekstra arbejde', value: coerceNumber(computed.extraWork), format: 'currency' },
    { id: 'tralleloft', label: '4. Tralleløft', value: coerceNumber(computed.tralleloft), format: 'currency' },
    { id: 'km', label: '5. Km', value: coerceNumber(computed.km), format: 'currency' },
    { id: 'totalAccord', label: '6. Samlet akkordsum', value: coerceNumber(computed.totalAccord), format: 'currency', emphasize: true }
  ];

  const hourly = [
    { id: 'hourlyNoAdd', label: '7. Timepris (uden tillæg)', value: coerceNumber(computed.hourlyNoAdd), format: 'hourly' },
    { id: 'hourlyUdd1', label: '8. Timeløn m. UDD1', value: coerceNumber(computed.hourlyUdd1), format: 'hourly' },
    { id: 'hourlyUdd2', label: '9. Timeløn m. UDD2', value: coerceNumber(computed.hourlyUdd2), format: 'hourly' },
    {
      id: 'hourlyUdd2Mentor',
      label: '10. Timeløn m. UDD2 + Mentor',
      value: coerceNumber(computed.hourlyUdd2Mentor),
      format: 'hourly'
    }
  ];

  const project = [
    { id: 'projectHeader', label: `11. Samlet projektsum (valgt: ${jobType}, ${variant})`, format: 'header' },
    { id: 'projectFinal', label: 'FINAL', value: coerceNumber(computed.project_final), format: 'currency', emphasize: true }
  ];

  const metadata = [
    { id: 'template', label: 'Skabelon', value: templateLabel, format: 'text', subtle: true },
    {
      id: 'team',
      label: 'Medarbejdere & timer',
      value: { workersCount, hours: totalHours },
      format: 'team',
      subtle: true
    }
  ];

  return { summary, hourly, project, metadata };
}
