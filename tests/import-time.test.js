import { describe, expect, beforeEach, it } from 'vitest';
import {
  setTimeRowsContainer,
  mergeRowsWithSag,
  getTimeRows,
} from '../timeRows.js';

const sampleRows = [
  {
    Sektion: 'TIME',
    'Employee Name': 'Anna Andersen',
    'Employee Id': 'A-102',
    Date: '2024-03-12',
    Hours: '7,5',
    'Wage Type': 'Overtid',
    Notes: 'Aftenhold',
  },
  {
    SEKTION: 'TIME',
    'EMPLOYEE NAME': 'Bo Bæk',
    'EMPLOYEE ID': 'B77',
    DATE: '2024-03-13',
    HOURS: '8',
    'WAGE TYPE': 'Normal',
    NOTES: '',
  },
];

describe('TIME row import', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'timeRowsTable';
    document.body.appendChild(container);
    setTimeRowsContainer(container);
  });

  it('normalises imported rows to camelCase shape and renders them', () => {
    const result = mergeRowsWithSag({ TIME: sampleRows });

    expect(result.TIME).toEqual([
      {
        employeeName: 'Anna Andersen',
        employeeId: 'A-102',
        date: '2024-03-12',
        hours: 7.5,
        wageType: 'Overtid',
        notes: 'Aftenhold',
      },
      {
        employeeName: 'Bo Bæk',
        employeeId: 'B77',
        date: '2024-03-13',
        hours: 8,
        wageType: 'Normal',
        notes: '',
      },
    ]);

    expect(getTimeRows()).toEqual(result.TIME);
    expect(container.textContent).toContain('Anna Andersen');
    expect(container.textContent).toContain('7.5');
    expect(container.textContent).toContain('Normal');
  });

  it('clears the rendered table when no TIME rows are provided', () => {
    mergeRowsWithSag({ TIME: sampleRows });
    mergeRowsWithSag({ TIME: [] });

    expect(getTimeRows()).toEqual([]);
    expect(container.textContent).toContain('Ingen tidsregistreringer');
  });
});
