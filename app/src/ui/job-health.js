const JOBS_KEY = 'csmate.jobs.v1';

function formatTimestamp (value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return '–';
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function countMaterials (job) {
  if (!job || typeof job !== 'object') return 0;
  let total = 0;
  if (Array.isArray(job.systems)) {
    for (const sys of job.systems) {
      const materials = Array.isArray(sys?.materialer) ? sys.materialer : Array.isArray(sys?.materials) ? sys.materials : [];
      for (const line of materials) {
        const qty = Number(line?.antal ?? line?.quantity ?? 0);
        if (Number.isFinite(qty)) total += qty;
      }
    }
  }
  if (total === 0 && Array.isArray(job.materials)) {
    for (const line of job.materials) {
      const qty = Number(line?.antal ?? line?.quantity ?? 0);
      if (Number.isFinite(qty)) total += qty;
    }
  }
  return total;
}

async function resolveQueueSize () {
  try {
    const module = await import('../core/net-queue.js');
    if (typeof module.size === 'function') {
      return await module.size();
    }
    if (Array.isArray(module.queue)) return module.queue.length;
  } catch {}
  return 0;
}

async function resolvePendingCount () {
  try {
    const module = await import('../sync.js');
    if (typeof module.pendingCount === 'function') {
      return module.pendingCount();
    }
  } catch {}
  return 0;
}

export async function renderJobHealth () {
  const div = document.getElementById('job-health');
  if (!div) return;

  let jobs = [];
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    jobs = raw ? JSON.parse(raw) : [];
  } catch {
    jobs = [];
  }
  const active = Array.isArray(jobs) && jobs.length ? jobs[jobs.length - 1] : null;
  const materials = countMaterials(active);
  const updatedAt = active?.updatedAt || active?.createdAt || null;
  const lastSaved = updatedAt ? formatTimestamp(updatedAt) : '–';

  const [queueSize, pending] = await Promise.all([
    resolveQueueSize(),
    resolvePendingCount()
  ]);
  const waiting = queueSize + pending;

  div.textContent = `Materialer: ${materials} | Ventende: ${waiting} | Sidst gemt: ${lastSaved}`;
}

const safeRender = () => { renderJobHealth(); };

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (!event.key || event.key === JOBS_KEY || event.key === 'csmate.sync.queue.v1') {
      safeRender();
    }
  });
  window.addEventListener('csmate:pending-change', safeRender);
  window.addEventListener('csmate:jobs-changed', safeRender);
  setInterval(safeRender, 10000);
}
