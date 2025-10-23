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
  let warnSpy;

  beforeEach(async () => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = BASE_HTML;
    ({ populateWorkersFromLabor } = await import('../app/main.js'));
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
  });
});
