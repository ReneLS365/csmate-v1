/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('populateWorkersFromLabor', () => {
  const BASE_HTML = `
    <div id="actionHint"></div>
    <div id="workers"></div>
    <div id="lonResult"></div>
    <select id="jobType">
      <option value="montage">Montage</option>
      <option value="demontage">Demontage</option>
    </select>
  `;

  let populateWorkersFromLabor;
  let updateTotalsMock;
  let beregnLonMock;
  let warnSpy;

  beforeEach(async () => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = BASE_HTML;
    const workersModule = await import('../app/src/modules/workers.js');
    ({ populateWorkersFromLabor } = workersModule);
    updateTotalsMock = vi.fn();
    beregnLonMock = vi.fn();
    workersModule.configureWorkerModule({
      formatNumber: (value) => new Intl.NumberFormat('da-DK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(Number.isFinite(value) ? value : Number(value) || 0),
      toNumber: (value) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
          const normalized = value.replace(/\./g, '').replace(',', '.');
          const parsed = Number.parseFloat(normalized);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      },
      updateTotals: updateTotalsMock,
      beregnLon: () => {
        beregnLonMock();
        document.querySelectorAll('.worker-row').forEach((row, index) => {
          const output = row.querySelector('.worker-output');
          if (output) {
            output.textContent = `${index + 1} kr/t`;
          }
        });
      },
      syncLonAuditState: () => {}
    });
  });

  afterEach(() => {
    warnSpy?.mockRestore();
    document.body.innerHTML = '';
  });

  it('restores mentortillæg and udd selections and refreshes worker output', () => {
    const entries = [
      { hours: 7.5, mentortillaeg: 1.5, udd: 'udd2' },
      { hours: 3, mentortillaeg: null }
    ];

    populateWorkersFromLabor(entries);

    const rows = document.querySelectorAll('.worker-row');
    expect(rows.length).toBe(2);

    const allowanceFormatter = new Intl.NumberFormat('da-DK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    const firstAllowanceInput = rows[0].querySelector('.worker-tillaeg');
    const secondAllowanceInput = rows[1].querySelector('.worker-tillaeg');
    expect(firstAllowanceInput?.value).toBe(allowanceFormatter.format(1.5));
    expect(secondAllowanceInput?.value).toBe(allowanceFormatter.format(0));

    const firstUddSelect = rows[0].querySelector('.worker-udd');
    const secondUddSelect = rows[1].querySelector('.worker-udd');
    expect(firstUddSelect?.value).toBe('udd2');
    expect(secondUddSelect?.value).toBe('udd1');

    const firstOutputText = rows[0].querySelector('.worker-output')?.textContent ?? '';
    expect(firstOutputText).toContain('kr/t');
    expect(updateTotalsMock).toHaveBeenCalledWith(true);
    expect(beregnLonMock).toHaveBeenCalledTimes(1);
  });
});
