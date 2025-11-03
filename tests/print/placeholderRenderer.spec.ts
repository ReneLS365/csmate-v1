import { describe, expect, it } from 'vitest';

import { renderTemplate } from '@/lib/print/placeholderRenderer';

describe('renderTemplate', () => {
  it('erstatter simple nøgler', () => {
    const template = '<p>{{firma}}</p>';
    const output = renderTemplate(template, { firma: 'Stillads ApS' });
    expect(output).toContain('Stillads ApS');
  });

  it('render loop sektioner', () => {
    const template = '<ul>{{#linjer}}<li>{{navn}} - {{sum}}</li>{{/linjer}}</ul>';
    const output = renderTemplate(template, {
      linjer: [
        { navn: 'Ramme', sum: '10,00' },
        { navn: 'Gelænder', sum: '20,00' }
      ]
    });
    expect(output).toContain('Ramme - 10,00');
    expect(output).toContain('Gelænder - 20,00');
  });
});
