// app/services/tenant-service.js
//
// Dette modul er det ENESTE sted, der må læse/skriv firms + template-meta.
// Lige nu: localStorage + static JSON.
// Senere: kan skiftes til API-kald, uden at UI skal ændres.

const LOCAL_FIRMS_KEY = 'csmate-firms';

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('Failed to load ' + path);
  return res.json();
}

function loadLocalFirms() {
  try {
    const raw = window.localStorage.getItem(LOCAL_FIRMS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.firms)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalFirms(config) {
  window.localStorage.setItem(LOCAL_FIRMS_KEY, JSON.stringify(config));
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
