import ApprovalControls from '@/components/ApprovalControls';
import TemplateSelect from '@/components/TemplateSelect';
import AdminGate from '@/components/AdminGate';
import { getPersistedTemplate, loadTemplate, DEFAULT_TEMPLATE_ID } from '@/lib/templates';
import { selectComputed } from '@/store/selectors';
import { createReviewLayout } from '@/modules/review-sections';

export default function ReviewPanel({ state = {}, setState }) {
  const o = selectComputed(state);
  const persistedTemplate = getPersistedTemplate();
  const templateId = state?.templateId ?? persistedTemplate ?? DEFAULT_TEMPLATE_ID;
  const template = loadTemplate(templateId);
  const isAdmin = Boolean(state?.isAdmin);
  const canMutate = typeof setState === 'function';
  const workers = Array.isArray(state?.workers) ? state.workers : [];

  function patchState(patch) {
    if (!canMutate) return;
    setState((prev) => ({ ...(prev ?? {}), ...patch }));
  }

  function handleTemplateChange(nextId) {
    const nextTemplate = loadTemplate(nextId);
    patchState({ templateId: nextTemplate.id, template: nextTemplate, isAdmin: false, role: 'sjakbajs' });
  }

  function handleAdminChange(nextIsAdmin) {
    const unlocked = Boolean(nextIsAdmin);
    patchState({ isAdmin: unlocked, role: unlocked ? 'chef' : 'sjakbajs' });
  }

  const fmt2 = (v) => new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const pct0 = (v) => new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(v) + ' %';
  const kr = (v) => `${fmt2(v)} kr`;
  const t = (v) => `${fmt2(v)} t`;

  const layout = createReviewLayout({
    computed: o,
    workers,
    templateLabel: template.label,
    jobType: o.jobType,
    variant: o.selectedVariant
  });

  function formatRowValue(row) {
    switch (row.format) {
      case 'currency':
        return kr(row.value ?? 0);
      case 'breakdown': {
        const amountText = kr(row.value ?? 0);
        const info = row.info;
        if (!info) return amountText;
        let infoText = '';
        switch (info.type) {
          case 'percent':
            infoText = pct0(info.percent ?? 0);
            break;
          case 'qtyPrice': {
            const qtyLabel = info.unitLabel ? `${fmt2(info.qty ?? 0)} ${info.unitLabel}` : fmt2(info.qty ?? 0);
            infoText = `${qtyLabel} × ${kr(info.unitPrice ?? 0)}`;
            break;
          }
          case 'trolley': {
            const qtyText = info.qty ? `${fmt2(info.qty)} løft` : '';
            const entryText = Array.isArray(info.entries)
              ? info.entries
                .filter((entry) => entry && Number(entry.qty) > 0)
                .map((entry) => `${fmt2(entry.qty)} × ${kr(entry.unitPrice ?? 0)}`)
                .join(' · ')
              : '';
            infoText = [qtyText, entryText].filter(Boolean).join(' · ');
            break;
          }
          default:
            infoText = '';
        }
        return infoText ? `${amountText} (${infoText})` : amountText;
      }
      case 'sled':
        return `${pct0(row.value?.percent ?? 0)} (${kr(row.value?.amount ?? 0)})`;
      case 'hourly':
        return `${fmt2(row.value ?? 0)} kr/t`;
      case 'team': {
        const workersCount = Number(row.value?.workersCount) || 0;
        const hoursText = t(row.value?.hours ?? 0);
        if (!workersCount) return hoursText;
        const label = workersCount === 1 ? '1 medarbejder' : `${workersCount} medarbejdere`;
        return `${label} · ${hoursText}`;
      }
      case 'hours':
        return t(row.value ?? 0);
      case 'text':
        return String(row.value ?? '');
      default:
        return '';
    }
  }

  function renderRow(row) {
    const classes = ['review-row'];
    if (row.format === 'header') classes.push('review-row--header');
    if (row.subtle) classes.push('review-row--subtle');
    if (row.emphasize) classes.push('review-row--total');
    return (
      <div key={row.id} className={classes.join(' ')}>
        <span>{row.label}</span>
        {row.format !== 'header' && <b>{formatRowValue(row)}</b>}
      </div>
    );
  }

  return (
    <section className="review-panel">
      {layout.summary.map(renderRow)}
      {layout.hourly.map(renderRow)}
      {layout.project.map(renderRow)}

      <div className="review-metadata">
        {layout.metadata.map(renderRow)}
        <div className="review-controls">
          <TemplateSelect value={templateId} onChange={handleTemplateChange} disabled={!canMutate} />
          <AdminGate templateId={templateId} isAdmin={isAdmin} disabled={!canMutate} onAdminChange={handleAdminChange} />
          {canMutate && <ApprovalControls state={state} setState={setState} />}
        </div>
      </div>
    </section>
  );
}
