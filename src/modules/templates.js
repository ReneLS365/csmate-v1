/**
 * @purpose Manage tenant templates with deterministic normalisation and persisted selection helpers.
 * @inputs Template identifiers, raw template payloads and optional storage overrides for persistence.
 * @outputs Normalised template objects plus helpers for listing, loading and persisting template selection state.
 */

import defaultTemplate from '@/templates/default.json' assert { type: 'json' };
import hulmoseTemplate from '@/templates/hulmose.json' assert { type: 'json' };

const STATIC_TEMPLATES = {
  default: defaultTemplate,
  hulmose: hulmoseTemplate,
  hulmoses: hulmoseTemplate
};

export const DEFAULT_TEMPLATE_ID = 'hulmose';
const STORAGE_KEY = 'csmate.selectedTemplate';

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

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cloneTemplate(template) {
  if (typeof structuredClone === 'function') {
    return structuredClone(template);
  }
  return JSON.parse(JSON.stringify(template));
}

function getStorage(storage) {
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
    return storage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return memoryStorage;
}

export function resolveTemplateId(id) {
  if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(STATIC_TEMPLATES, id)) {
    return id;
  }
  return DEFAULT_TEMPLATE_ID;
}

export function normalizeTemplate(raw, fallbackId = DEFAULT_TEMPLATE_ID) {
  const base = ensureObject(raw);
  const metaInput = ensureObject(base._meta);
  const payInput = ensureObject(base.pay);
  const allowancesInput = ensureObject(payInput.allowances_per_hour);
  const overtimeInput = ensureObject(payInput.overtime_multipliers);
  const rolesInput = ensureObject(base.roles);
  const priceInput = ensureObject(base.price_table);

  const meta = {
    template: metaInput.template || fallbackId,
    currency: metaInput.currency || 'DKK',
    company: metaInput.company || '',
    source: metaInput.source || metaInput.generated || '',
    generated: metaInput.generated || '',
    admin_code: metaInput.admin_code || ''
  };

  const allowances = Object.fromEntries(
    Object.entries(allowancesInput).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)])
  );

  const weekdayRaw = Number(overtimeInput.weekday);
  const weekendRaw = Number(overtimeInput.weekend);
  const overtime = {
    weekday: Number.isFinite(weekdayRaw) && weekdayRaw > 0 ? weekdayRaw : 1,
    weekend: Number.isFinite(weekendRaw) && weekendRaw > 0 ? weekendRaw : 1
  };

  const baseWage = Number(payInput.base_wage_hourly);
  const pay = {
    ...payInput,
    base_wage_hourly: Number.isFinite(baseWage) ? baseWage : 0,
    allowances_per_hour: allowances,
    overtime_multipliers: overtime
  };

  const roles = Object.fromEntries(
    Object.entries(rolesInput).map(([role, actions]) => {
      if (!Array.isArray(actions)) return [role, []];
      return [role, actions.filter((item) => typeof item === 'string')];
    })
  );

  if (!roles.chef) roles.chef = [];
  if (!roles.formand) roles.formand = [];
  if (!roles.arbejder) roles.arbejder = [];

  const priceTable = Object.fromEntries(
    Object.entries(priceInput).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)])
  );

  const id = meta.template || fallbackId;
  const label = meta.company || id;

  return {
    ...base,
    _meta: { ...metaInput, ...meta, template: id },
    pay,
    roles,
    price_table: priceTable,
    id,
    label,
    priceTable
  };
}

export function loadTemplate(id = DEFAULT_TEMPLATE_ID) {
  const resolved = resolveTemplateId(id);
  const source = STATIC_TEMPLATES[resolved] ?? STATIC_TEMPLATES[DEFAULT_TEMPLATE_ID];
  const clone = cloneTemplate(source);
  return normalizeTemplate(clone, resolved);
}

export function listTemplates() {
  return Object.keys(STATIC_TEMPLATES).map((id) => {
    const template = loadTemplate(id);
    return { id: template.id, label: template.label, template };
  });
}

export function persistTemplateSelection(id, storage) {
  const resolved = resolveTemplateId(id);
  const store = getStorage(storage);
  try {
    store.setItem(STORAGE_KEY, resolved);
  } catch {}
  return resolved;
}

export function getPersistedTemplate(storage) {
  const store = getStorage(storage);
  try {
    const stored = store.getItem(STORAGE_KEY);
    if (typeof stored !== 'string' || stored.length === 0) return null;
    return resolveTemplateId(stored);
  } catch {
    return DEFAULT_TEMPLATE_ID;
  }
}

export function clearPersistedTemplate(storage) {
  const store = getStorage(storage);
  try {
    store.removeItem(STORAGE_KEY);
  } catch {}
}
