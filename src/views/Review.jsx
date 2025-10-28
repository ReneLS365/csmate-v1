import ApprovalControls from '@/components/ApprovalControls';
import TemplateSelect from '@/components/TemplateSelect';
import AdminGate from '@/components/AdminGate';
import { getPersistedTemplate, loadTemplate, DEFAULT_TEMPLATE_ID } from '@/lib/templates';
import { selectComputed } from '@/store/selectors';

export default function ReviewPanel({ state = {}, setState }) {
  const o = selectComputed(state);
  const persistedTemplate = getPersistedTemplate();
  const templateId = state?.templateId ?? persistedTemplate ?? DEFAULT_TEMPLATE_ID;
  const template = loadTemplate(templateId);
  const isAdmin = Boolean(state?.isAdmin);
  const canMutate = typeof setState === 'function';

  function patchState(patch) {
    if (!canMutate) return;
    setState((prev) => ({ ...(prev ?? {}), ...patch }));
  }

  function handleTemplateChange(nextId) {
    patchState({ templateId: nextId, isAdmin: false });
  }

  function handleAdminChange(nextIsAdmin) {
    patchState({ isAdmin: Boolean(nextIsAdmin) });
  }

  const fmt2 = (v) => new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const pct0 = (v) => new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(v) + ' %';
  const kr = (v) => `${fmt2(v)} kr`;
  const t = (v) => `${fmt2(v)} t`;

  return (
    <section className="review-panel">
      <div className="review-row"><span>1. Materialer</span><b>{kr(o.materials)}</b></div>
      <div className="review-row"><span>2. Slæb</span><b>{pct0(o.sledPercent)} ({kr(o.sledKr)})</b></div>
      <div className="review-row"><span>3. Ekstra arbejde</span><b>{kr(o.extraWork)}</b></div>
      <div className="review-row"><span>4. Tralleløft</span><b>{kr(o.tralleloft)}</b></div>
      <div className="review-row"><span>5. Km</span><b>{kr(o.km)}</b></div>

      <div className="review-row review-row--total"><span>6. Samlet akkordsum</span><b>{kr(o.totalAccord)}</b></div>

      <div className="review-row"><span>7. Timepris (uden tillæg)</span><b>{fmt2(o.hourlyNoAdd)} kr/t</b></div>
      <div className="review-row"><span>8. Timeløn m. UDD1</span><b>{fmt2(o.hourlyUdd1)} kr/t</b></div>
      <div className="review-row"><span>9. Timeløn m. UDD2</span><b>{fmt2(o.hourlyUdd2)} kr/t</b></div>
      <div className="review-row"><span>10. Timeløn m. UDD2 + Mentor</span><b>{fmt2(o.hourlyUdd2Mentor)} kr/t</b></div>

      <div className="review-row review-row--header">11. Samlet projektsum (valgt: {o.jobType}, {o.selectedVariant})</div>
      <div className="review-row review-row--total"><span>FINAL</span><b>{kr(o.project_final)}</b></div>

      <div className="review-metadata">
        <div className="review-row review-row--subtle"><span>Skabelon</span><b>{template.label}</b></div>
        <div className="review-row review-row--subtle"><span>Timer ({o.jobType})</span><b>{t(o.hours)}</b></div>
        <div className="review-controls">
          <TemplateSelect value={templateId} onChange={handleTemplateChange} disabled={!canMutate} />
          <AdminGate templateId={templateId} isAdmin={isAdmin} disabled={!canMutate} onAdminChange={handleAdminChange} />
          {canMutate && (
            <ApprovalControls state={state} setState={setState} disabled={!isAdmin} />
          )}
        </div>
      </div>
    </section>
  );
}
