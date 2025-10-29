import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE_ID,
  loadTemplate,
  normalizeTemplate,
  persistTemplateSelection,
  getPersistedTemplate
} from '@/modules/templates';
import { createInitialState } from '@/main.js';
import { sha256Hex } from '@/lib/sha256.js';

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

describe('template helpers', () => {
  it('loads hulmose template og persisterer valg', async () => {
    const storage = createStorage();
    const template = loadTemplate('hulmose');

    expect(template.id).toBe('hulmose');
    expect(template.label).toContain('Hulmose');
    const expectedHash = await sha256Hex('hulmose-2025-admin');
    expect(template._meta?.admin_code).toBe(expectedHash);

    const persistedId = persistTemplateSelection('hulmose', storage);
    expect(persistedId).toBe('hulmose');
    expect(getPersistedTemplate(storage)).toBe('hulmose');
  });

  it('falder tilbage til hulmose når ældre hulmoses-id anvendes', () => {
    const template = loadTemplate('hulmoses');
    expect(template.id).toBe('hulmose');
    expect(template._meta?.template).toBe('hulmose');
  });

  it('normalises malformed template payloads defensively', () => {
    const raw = {
      _meta: { company: 'Acme', admin_code: 'secret' },
      pay: {
        base_wage_hourly: 'nan',
        allowances_per_hour: { udd1: '14', bogus: 'abc' },
        overtime_multipliers: { weekday: '2', weekend: null }
      },
      roles: { chef: ['approve', 123], arbejder: 'send' },
      price_table: { A100: '12.34', B200: 'invalid' }
    };

    const normalised = normalizeTemplate(raw, 'custom');
    expect(normalised.id).toBe('custom');
    expect(normalised.label).toBe('Acme');
    expect(normalised.pay.base_wage_hourly).toBe(0);
    expect(normalised.pay.allowances_per_hour).toEqual({ udd1: 14 });
    expect(normalised.pay.overtime_multipliers).toEqual({ weekday: 2, weekend: 1 });
    expect(normalised.roles.chef).toEqual(['approve']);
    expect(normalised.roles.arbejder).toEqual([]);
    expect(Object.keys(normalised.price_table)).toEqual(['A100']);
  });

  it('bootstraps initial state from persistence or defaults', () => {
    const storage = createStorage();
    persistTemplateSelection('default', storage);

    const stateFromStorage = createInitialState({ storage });
    expect(stateFromStorage.templateId).toBe('default');
    expect(stateFromStorage.template.id).toBe('default');
    expect(stateFromStorage.isAdmin).toBe(false);

    const fallbackState = createInitialState({ storage: createStorage() });
    expect(fallbackState.templateId).toBe(DEFAULT_TEMPLATE_ID);
    expect(fallbackState.template.id).toBe(DEFAULT_TEMPLATE_ID);
  });
});
