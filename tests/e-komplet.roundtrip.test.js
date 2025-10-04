import { describe, expect, it, vi } from 'vitest';
import { EKompletPanel } from '../src/ui/e-komplet-panel.js';
import { applyMapping } from '../src/lib/e-komplet/import.js';

describe('E-komplet import mapping', () => {
  it('preserves Hour values when reverting from a custom mapping to standard headers', () => {
    const importService = vi.fn(({ rows, mapping }) => rows.map(row => applyMapping(row, mapping)));
    const panel = new EKompletPanel({ importService });

    const customMapping = [
      { canonical: 'Worker', source: 'Medarbejder' },
      { canonical: 'Hour', source: 'Timer registreret' }
    ];

    panel.setSavedMapping(customMapping);

    const customPayload = {
      headers: ['Medarbejder', 'Timer registreret'],
      rows: [
        {
          Medarbejder: 'Lene',
          'Timer registreret': '6.75'
        }
      ]
    };

    const firstResult = panel._handleImport(customPayload);

    expect(firstResult).toEqual([
      {
        Worker: 'Lene',
        Hour: '6.75'
      }
    ]);
    expect(importService).toHaveBeenCalledTimes(1);
    expect(importService.mock.calls[0][0].mapping).toEqual(customMapping);

    const standardPayload = {
      headers: ['Worker', 'Hour'],
      rows: [
        {
          Worker: 'Lene',
          Hour: '5.25'
        }
      ]
    };

    const secondResult = panel._handleImport(standardPayload);

    expect(importService).toHaveBeenCalledTimes(2);
    expect(importService.mock.calls[1][0].mapping).toBeNull();
    expect(secondResult).toEqual([
      {
        Worker: 'Lene',
        Hour: '5.25'
      }
    ]);

    const fallbackResult = applyMapping(standardPayload.rows[0], customMapping);
    expect(fallbackResult.Hour).toBe('5.25');
    expect(fallbackResult.Worker).toBe('Lene');
  });
});
