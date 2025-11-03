import { describe, expect, afterEach, beforeEach, it } from 'vitest';

import { buildPrintableDataForSystem } from '@/lib/print/dataMapping';

declare global {
  // eslint-disable-next-line no-var
  var __APP_STATE__: any;
  // eslint-disable-next-line no-var
  var BOSTA_DATA: any;
}

describe('buildPrintableDataForSystem', () => {
  beforeEach(() => {
    globalThis.BOSTA_DATA = [
      { varenr: 'B001', navn: 'Test vare', enhed: 'stk', pris: 25 }
    ];
    globalThis.__APP_STATE__ = {
      firma: 'Stillads ApS',
      projekt: 'Testprojekt',
      adresse: 'Testvej 1',
      sagsnr: 'A-123',
      dagsdato: '2025-01-02',
      includeDemontage: true,
      extras: [{ label: 'Ekstra', sum: 100 }],
      cart: {
        bosta: [
          { varenr: 'B001', antal: 2 }
        ]
      }
    };
  });

  afterEach(() => {
    delete globalThis.__APP_STATE__;
    delete globalThis.BOSTA_DATA;
  });

  it('beregner linjesum og totaler korrekt', () => {
    const result = buildPrintableDataForSystem('bosta');
    expect(result.linjer).toHaveLength(1);
    expect(result.linjer[0]?.sum).toBe('50,00');
    const totalLabels = result.totaler.map((entry) => entry.label);
    expect(totalLabels).toContain('I alt');
  });
});
