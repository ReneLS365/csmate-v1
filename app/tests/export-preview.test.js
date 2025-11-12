import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('truncerer kun forhåndsvisning og downloader fuldt indhold', () => {
    const originalBlob = global.Blob;
    const originalUrl = global.URL;
    const originalClick = HTMLAnchorElement.prototype.click;

    const blobSpy = vi.fn();
    class MockBlob {
      constructor(parts, options) {
        blobSpy(parts, options);
        return { parts, options };
      }
    }

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();

    try {
      global.Blob = MockBlob;
      global.URL = {
        createObjectURL,
        revokeObjectURL
      };
      HTMLAnchorElement.prototype.click = clickSpy;

      const longText = 'x'.repeat(250000);
      showExportPreview(longText, 'csv');

      const dlg = document.getElementById('export-preview');
      if (dlg && typeof dlg.close !== 'function') {
        dlg.close = vi.fn();
      }

      const pre = document.getElementById('export-preview-pre');
      expect(pre.textContent.length).toBe(200000);

      const downloadButton = document.getElementById('dl-ok');
      downloadButton.click();

      expect(blobSpy).toHaveBeenCalledTimes(1);
      const [parts] = blobSpy.mock.calls[0];
      expect(parts[0].length).toBe(longText.length);
      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    } finally {
      global.Blob = originalBlob;
      global.URL = originalUrl;
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
});
