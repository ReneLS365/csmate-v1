/**
 * @purpose Manage IndexedDB persistence for recent accord projects with retention and ordering helpers.
 * @inputs Project documents containing id, updatedAt metadata and raw state payloads.
 * @outputs CRUD helpers returning saved ids, project lists and prune counts for retention enforcement.
 */

const DB_NAME = 'csmate';
const DB_VERSION = 1;
const STORE = 'projects';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function mergeWorkers(existingWorkers, nextWorkers) {
  const base = Array.isArray(existingWorkers) ? existingWorkers : [];
  const patch = Array.isArray(nextWorkers) ? nextWorkers : [];
  if (patch.length === 0) return base.map(clone);

  const length = Math.max(base.length, patch.length);
  const merged = [];
  for (let index = 0; index < length; index += 1) {
    const prev = base[index];
    const next = patch[index];
    if (next == null && prev == null) continue;
    if (prev == null) {
      merged.push(clone(next));
      continue;
    }
    if (next == null) {
      merged.push(clone(prev));
      continue;
    }
    merged.push({ ...clone(prev), ...clone(next) });
  }
  return merged;
}

function mergePayload(existingPayload, nextState) {
  const base = existingPayload && typeof existingPayload === 'object' ? existingPayload : {};
  const patch = nextState && typeof nextState === 'object' ? nextState : {};
  const merged = { ...clone(base), ...clone(patch) };

  if ('workers' in base || 'workers' in patch) {
    merged.workers = mergeWorkers(base.workers, patch.workers);
  }

  if (Array.isArray(base.materialLines) && !Array.isArray(patch.materialLines)) {
    merged.materialLines = base.materialLines.map(clone);
  }

  if (Array.isArray(patch.materialLines)) {
    merged.materialLines = patch.materialLines.map(clone);
  }

  return merged;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeMode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, storeMode);
    const s = t.objectStore(STORE);
    let result;
    let deferred;
    const res = fn(s);

    if (res && typeof res === 'object') {
      if (typeof res.then === 'function') {
        deferred = res;
      }
      const handler = (event) => {
        result = event?.target?.result;
      };
      if (typeof res.addEventListener === 'function') {
        res.addEventListener('success', handler, { once: true });
      } else if ('onsuccess' in res) {
        const prev = res.onsuccess;
        res.onsuccess = (event) => {
          handler(event);
          if (typeof prev === 'function') prev(event);
        };
      } else {
        result = res;
      }
    } else {
      result = res;
    }

    t.oncomplete = () => {
      if (deferred) {
        deferred.then((val) => resolve(val)).catch(reject);
        return;
      }
      resolve(result);
    };
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('tx aborted'));
  });
}

export async function saveProject(p) {
  const now = Date.now();
  const id = String(p.id ?? (p.state?.id ?? 'anon'));
  const incomingState = p.state ?? {};
  let existing;
  try {
    existing = await getProject(id);
  } catch (error) {
    existing = null;
  }

  const mergedPayload = mergePayload(existing?.payload, incomingState);
  const jobType = incomingState.jobType ?? mergedPayload.jobType ?? existing?.jobType ?? 'montage';
  const selectedVariant = incomingState.selectedVariant ?? mergedPayload.selectedVariant ?? existing?.selectedVariant ?? 'noAdd';
  const updatedAt = p.updatedAt ?? now;

  const doc = {
    ...(existing ? clone(existing) : {}),
    id,
    version: 2,
    updatedAt,
    jobType,
    selectedVariant,
    payload: mergedPayload
  };

  await tx('readwrite', (s) => s.put(doc));
  await pruneToMax(20);
  return id;
}

export async function getProject(id) {
  return tx('readonly', (s) => s.get(String(id)));
}

export async function listProjects(limit = 20) {
  return tx('readonly', (s) => new Promise((resolve) => {
    const idx = s.index('updatedAt');
    const req = idx.openCursor(null, 'prev');
    const out = [];
    req.onsuccess = () => {
      const cur = req.result;
      if (cur && out.length < limit) {
        out.push(cur.value);
        cur.continue();
      } else {
        resolve(out);
      }
    };
  }));
}

export async function deleteProject(id) {
  return tx('readwrite', (s) => s.delete(String(id)));
}

export async function pruneToMax(max = 20) {
  const all = await listProjects(1000);
  const excess = all.slice(max);
  if (excess.length === 0) return 0;
  await tx('readwrite', (s) => {
    excess.forEach((d) => s.delete(d.id));
  });
  return excess.length;
}
