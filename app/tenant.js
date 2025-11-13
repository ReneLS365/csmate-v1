const LOCAL_ACTIVE_KEY = 'csmate-active-firm';
const LOCAL_FIRMS_KEY = 'csmate-firms';
const LOCAL_OVERRIDES_PREFIX = 'csmate-firm-overrides:';

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
    }
  };
})();

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return memoryStorage;
}

function getStoredValue(key) {
  try {
    return getStorage().getItem(key);
  } catch (error) {
    console.warn('localStorage getItem failed', error);
    return null;
  }
}

function setStoredValue(key, value) {
  try {
    getStorage().setItem(key, value);
  } catch (error) {
    console.warn('localStorage setItem failed', error);
  }
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {}
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function mapAuthUserToTenant(authUser) {
  const primaryMeta = authUser?.app_metadata;
  const fallbackMeta = authUser?.['https://csmate/app_metadata'];
  const metaSource =
    primaryMeta && typeof primaryMeta === 'object' && !Array.isArray(primaryMeta)
      ? primaryMeta
      : fallbackMeta;
  const meta = ensureObject(metaSource);

  const role = typeof meta.role === 'string' && meta.role.trim() ? meta.role.trim() : 'user';
  const firmId = typeof meta.firmId === 'string' && meta.firmId.trim() ? meta.firmId.trim() : null;
  const firms = ensureArray(meta.firms).map(id => String(id).trim()).filter(Boolean);
  if (!firms.length && firmId) {
    firms.push(firmId);
  }

  const storedActive = getStoredValue(LOCAL_ACTIVE_KEY);
  const activeFirmId = storedActive || (typeof meta.activeFirmId === 'string' && meta.activeFirmId.trim() ? meta.activeFirmId.trim() : null) || firmId;

  return {
    role,
    firmId,
    firms,
    activeFirmId: activeFirmId || null
  };
}

export function isCsmateAdmin(tenant) {
  return tenant?.role === 'csmate-admin';
}

export function isFirmaAdmin(tenant) {
  return tenant?.role === 'firma-admin' || tenant?.role === 'tenant-admin';
}

export function getTenantFirmId(tenant) {
  if (!tenant) return null;
  return tenant.activeFirmId || tenant.firmId || null;
}

export function setActiveFirmId(tenant, firmId) {
  if (!tenant || !firmId) return;
  setStoredValue(LOCAL_ACTIVE_KEY, firmId);
  tenant.activeFirmId = firmId;
}

async function loadJson(path) {
  const url = path.startsWith('/') ? path : `/${path.replace(/^\//, '')}`;
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (response && response.ok) {
        return response.json();
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
      import('path')
    ]);
    const basePath = dirname(fileURLToPath(import.meta.url));
    const filePath = resolve(basePath, `.${url}`);
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  throw new Error('Failed to load ' + url);
}

export async function loadFirmsConfig() {
  const seed = await loadJson('/data/firms.json');
  let local = null;
  try {
    const raw = getStoredValue(LOCAL_FIRMS_KEY);
    local = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Kunne ikke parse lokal firms config', error);
    local = null;
  }

  if (!local || !Array.isArray(local.firms)) {
    return seed;
  }

  const byId = new Map();
  ensureArray(seed.firms).forEach(firm => {
    if (firm?.id) {
      byId.set(firm.id, { ...firm });
    }
  });
  ensureArray(local.firms).forEach(firm => {
    if (firm?.id) {
      byId.set(firm.id, { ...firm });
    }
  });

  return { firms: Array.from(byId.values()) };
}

export function saveFirmsConfig(config) {
  setStoredValue(LOCAL_FIRMS_KEY, JSON.stringify(config));
}

export async function loadTemplateMeta() {
  return loadJson('/data/templates/index.json');
}

function loadFirmOverrides(firmId) {
  if (!firmId) return null;
  const key = `${LOCAL_OVERRIDES_PREFIX}${firmId}`;
  try {
    const raw = getStoredValue(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Kunne ikke parse overrides for', firmId, error);
    return null;
  }
}

export function saveFirmOverrides(firmId, overrides) {
  if (!firmId) return;
  const key = `${LOCAL_OVERRIDES_PREFIX}${firmId}`;
  setStoredValue(key, JSON.stringify(overrides));
}

function applyPriceOverrides(template, overrides) {
  if (!overrides) return template;
  const cloneTemplate = clone(template);
  const basePriceTable = ensureObject(cloneTemplate.price_table);
  const overrideItems = ensureArray(overrides.items);

  if (overrideItems.length) {
    overrideItems.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : null;
      if (!id) return;
      const price = Number(item.price);
      if (!Number.isFinite(price)) return;
      basePriceTable[id] = price;
    });
  }

  cloneTemplate.price_table = basePriceTable;
  if (Array.isArray(cloneTemplate.items)) {
    cloneTemplate.items = cloneTemplate.items.map(entry => {
      if (!entry || typeof entry !== 'object') return entry;
      const id = typeof entry.id === 'string' ? entry.id : null;
      if (!id) return entry;
      if (Object.prototype.hasOwnProperty.call(basePriceTable, id)) {
        return { ...entry, price: basePriceTable[id] };
      }
      return entry;
    });
  }
  return cloneTemplate;
}

function applyOverrides(baseTemplate, overrides) {
  if (!overrides) return baseTemplate;
  let template = clone(baseTemplate);
  template = applyPriceOverrides(template, overrides);
  if (overrides.pay && typeof overrides.pay === 'object') {
    template.pay = { ...template.pay, ...overrides.pay };
  }
  if (overrides.roles && typeof overrides.roles === 'object') {
    template.roles = { ...template.roles, ...overrides.roles };
  }
  return template;
}

export async function loadTemplateForTenant(tenant) {
  const firmsConfig = await loadFirmsConfig();
  const templates = await loadTemplateMeta();
  const firmId = getTenantFirmId(tenant) || 'demo';
  const firm = ensureArray(firmsConfig.firms).find(f => f.id === firmId) ||
    ensureArray(firmsConfig.firms).find(f => f.id === 'demo');

  const templateMeta = ensureArray(templates.templates).find(entry => entry.id === firm?.templateId);
  const templateFile = templateMeta?.file || 'default.json';
  const baseTemplate = await loadJson(`/data/templates/${templateFile}`);
  const overrides = loadFirmOverrides(firm?.id || firmId);
  const merged = applyOverrides(baseTemplate, overrides);
  return merged;
}

export function getTenantDisplayName(tenant, firmsConfig) {
  if (!tenant) return '';
  const firmId = getTenantFirmId(tenant);
  if (!firmId) return '';
  const firms = ensureArray(firmsConfig?.firms);
  const firm = firms.find(entry => entry.id === firmId);
  return firm?.name || firmId;
}
