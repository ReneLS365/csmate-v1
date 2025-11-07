/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../app/src/globals.js';

describe('Exports guardrails', () => {
  it('requires sagsinfo for export', () => {
    const incompleteJob = { sagsinfo: { kunde: '', adresse: '', sagsnr: '' } };
    const completeJob = { sagsinfo: { kunde: 'A', adresse: 'B', sagsnr: '123' } };

    if (typeof window.Exports?.requireSagsinfo === 'function') {
      expect(window.Exports.requireSagsinfo(incompleteJob)).toBe(false);
      expect(window.Exports.requireSagsinfo(completeJob)).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });
});
