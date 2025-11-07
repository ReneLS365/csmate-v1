export function mountDevIfHash() {
  if (location.hash !== '#dev') return;
  const host = document.getElementById('tab-help');
  if (!host) return;
  const section = document.createElement('section');
  section.id = 'dev';
  section.innerHTML = `
    <h2>/dev</h2>
    <div class="grid two">
      <div>
        <h3>Meta</h3>
        <ul>
          <li>App-version: <code id="meta-appver"></code></li>
          <li>SW-version: <code id="meta-swver"></code></li>
          <li>Template: <code id="meta-template"></code></li>
          <li>UA: <code id="meta-ua"></code></li>
          <li>Viewport: <code id="meta-vp"></code></li>
          <li>Storage: <code id="meta-storage"></code></li>
        </ul>
        <button id="btn-dev-health" class="btn">Kør health-check</button>
        <ul id="health-list"></ul>
      </div>
      <div>
        <h3>Seneste handlinger</h3>
        <pre id="audit-view" style="max-height:300px;overflow:auto;"></pre>
      </div>
    </div>
  `;
  host.appendChild(section);

  const appVer = window.APP_VERSION || '0.0.0';
  const templateMeta = window.TemplateStore?.activeMeta?.();
  const auditTail = window.AuditLog?.tail?.(50) || [];
  document.getElementById('meta-appver').textContent = appVer;
  document.getElementById('meta-template').textContent = templateMeta?.name || 'ukendt';
  document.getElementById('meta-ua').textContent = navigator.userAgent;
  document.getElementById('meta-vp').textContent = `${window.innerWidth}x${window.innerHeight}`;
  document.getElementById('meta-storage').textContent = `jobs=${window.JobStore?.count?.() || 0}, backup=${localStorage.getItem('csmate.backup.ts') || '-'}`;

  fetch('service-worker.js', { cache: 'no-store' })
    .then(r => r.text())
    .then(t => {
      const m = t.match(/SW_VERSION\s*=\s*['"]([^'\"]+)['"]/);
      document.getElementById('meta-swver').textContent = m?.[1] || 'ukendt';
    })
    .catch(() => {
      document.getElementById('meta-swver').textContent = 'ukendt';
    });

  document.getElementById('audit-view').textContent = JSON.stringify(auditTail, null, 2);

  document.getElementById('btn-dev-health').addEventListener('click', () => {
    const list = document.getElementById('health-list');
    list.innerHTML = '';
    const add = (label, ok) => {
      const li = document.createElement('li');
      li.textContent = `${ok ? '✅' : '❌'} ${label}`;
      list.appendChild(li);
    };
    try {
      window.JobStore?.create?.({ name: '_dev_test' });
      add('JobStore write', true);
    } catch {
      add('JobStore write', false);
    }
    try {
      const tMeta = window.TemplateStore?.activeMeta?.();
      add('Template load', !!tMeta);
    } catch {
      add('Template load', false);
    }
    try {
      add('Beregning baseline', window.Calc?.test?.() === true);
    } catch {
      add('Beregning baseline', false);
    }
  });
}

window.addEventListener('hashchange', () => {
  if (location.hash === '#dev') {
    location.reload();
  }
});
