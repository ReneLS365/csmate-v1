import { describe, it, expect, beforeEach } from 'vitest';
import { buildEkompletPayload } from '../src/lib/exporters-ek.js';
import { saveSession, clearSession } from '../src/lib/storage.js';

beforeEach(() => {
  clearSession();
});

describe('buildEkompletPayload', () => {
  it('inkluderer session-bruger og rolle i payload', () => {
    saveSession({ user: { username: 'foreman@hulmose.dk' }, role: 'foreman' });
    const state = {
      address: 'Hulmosevej 1',
      date: '2025-02-12',
      status: 'afventer',
      materialsSum: 5000,
      totals: { materials: 5000 },
      sledPercent: 0.07,
      kmQty: 10,
      kmRate: 3.2,
      holesQty: 5,
      holePrice: 4.7,
      hoursTotal: 20
    };

    const payload = buildEkompletPayload(state);
    expect(payload.user).toBe('foreman@hulmose.dk');
    expect(payload.role).toBe('foreman');
    expect(payload.materialsKr).toBeGreaterThan(0);
    expect(payload.accordSumKr).toBeGreaterThan(0);
  });
});
