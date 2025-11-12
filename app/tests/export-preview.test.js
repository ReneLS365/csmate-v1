import { describe, it, expect, beforeEach } from 'vitest';
import { showExportPreview } from '../src/ui/export-preview.js';

describe('export-preview dialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('åbner dialog med indhold', () => {
    showExportPreview('a,b,c\n1,2,3', 'csv');
    const dlg = document.getElementById('export-preview');
    expect(dlg).toBeTruthy();
    const pre = dlg.querySelector('#export-preview-pre');
    expect(pre.textContent).toContain('a,b,c');
  });
});
