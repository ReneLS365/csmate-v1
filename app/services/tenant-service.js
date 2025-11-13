// app/services/tenant-service.js
//
// Dette modul er det ENESTE sted, der må læse/skriv firms + template-meta.
// Lige nu: localStorage + static JSON.
// Senere: kan skiftes til API-kald, uden at UI skal ændres.

const LOCAL_FIRMS_KEY = 'csmate-firms';

const memoryStorage = (() => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
})();

function getStorage() {
  if (typeof window !== 'undefined' && window?.localStorage) {
    return window.localStorage;
  }
  return memoryStorage;
}

function readStorageValue(key) {
  try {
    return getStorage().getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key, value) {
  try {
    getStorage().setItem(key, value);
  } catch {
    // Ignore write errors (e.g. storage quota)
  }
}

async function loadJson(path) {
  const url = path.startsWith('/') ? path : `/${path.replace(/^\//, '')}`;

  if (typeof fetch === 'function') {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res?.ok) {
        return res.json();
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        throw error;
      }
    }
  }

  if (typeof window === 'undefined') {
    const [{ readFile }, { fileURLToPath }, { dirname, resolve }] = await Promise.all([
      import('fs/promises'),
      import('url'),
      import('path'),
    ]);
    const basePath = dirname(fileURLToPath(import.meta.url));
    const filePath = resolve(basePath, `.${url}`);
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  throw new Error('Failed to load ' + url);
}

function loadLocalFirms() {
  try {
    const raw = readStorageValue(LOCAL_FIRMS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.firms)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalFirms(config) {
  writeStorageValue(LOCAL_FIRMS_KEY, JSON.stringify(config));
}

export async function getFirmsConfig() {
  const seed = await loadJson('/data/firms.json');
  const local = loadLocalFirms();

  if (!local) return seed;

  const byId = new Map();
  for (const f of seed.firms) byId.set(f.id, f);
  for (const f of local.firms) byId.set(f.id, f);

  return {
    firms: Array.from(byId.values()),
  };
}

export async function updateFirmTemplate(firmId, templateId) {
  const config = await getFirmsConfig();
  const map = new Map(config.firms.map(f => [f.id, f]));
  const firm = map.get(firmId);
  if (!firm) return;

  firm.templateId = templateId;
  const newConfig = { firms: Array.from(map.values()) };

  // LIGE NU: localStorage.
  // TODO backend: PUT /api/firms/:id/template
  saveLocalFirms(newConfig);
}

export async function createFirm({ id, name, templateId = 'default' }) {
  const config = await getFirmsConfig();
  if (config.firms.find(f => f.id === id)) {
    return; // eksisterer allerede
  }
  config.firms.push({ id, name, templateId });
  // LIGE NU: localStorage.
  // TODO backend: POST /api/firms
  saveLocalFirms(config);
}

export async function getTemplatesMeta() {
  return loadJson('/data/templates/index.json');
}
