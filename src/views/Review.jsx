// src/views/Review.jsx
import { selectComputed } from '@/store/selectors';

export default function ReviewPanel({ state }) {
  const o = selectComputed(state);

  const fmt2 = (v) => new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const pct0 = (v) => new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(v) + ' %';
  const kr = (v) => `${fmt2(v)} kr`;
  const t  = (v) => `${fmt2(v)} t`;

  return (
    <section className="review">
      <div className="row"><span>1. Materialer</span><b>{kr(o.materials)}</b></div>
      <div className="row"><span>2. Slæb</span><b>{pct0(o.sledPercent)} ({kr(o.sledKr)})</b></div>
      <div className="row"><span>3. Ekstra arbejde + km</span><b>{kr(o.extraAndKm)}</b></div>

      <div className="row total"><span>4. Samlet akkordsum</span><b>{kr(o.totalAccord)}</b></div>

      <div className="row"><span>5. Timepris (uden tillæg)</span><b>{fmt2(o.hourlyNoAdd)} kr/t</b></div>
      <div className="row"><span>7. Timeløn m. UDD1</span><b>{fmt2(o.hourlyUdd1)} kr/t</b></div>
      <div className="row"><span>8. Timeløn m. UDD2</span><b>{fmt2(o.hourlyUdd2)} kr/t</b></div>
      <div className="row"><span>9. Timeløn m. UDD2 + Mentor</span><b>{fmt2(o.hourlyUdd2Mentor)} kr/t</b></div>

      <div className="row header">10. Samlet projektsum (valgt: {o.jobType}, {o.selectedVariant})</div>
      <div className="row total"><span>FINAL</span><b>{kr(o.project_final)}</b></div>

      <div className="row subtle"><span>Timer ({o.jobType})</span><b>{t(o.hours)}</b></div>
    </section>
  );
}
