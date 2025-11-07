/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '../app/src/globals.js';

beforeEach(() => {
  localStorage.clear();
});

describe('JobStore', () => {
  it('create/update/load cycle', () => {
    const id = window.JobStore.create({ navn: 'test', sagsinfo: { kunde: 'init' } });
    expect(typeof id).toBe('string');

    const updated = window.JobStore.update(id, { sagsinfo: { kunde: 'A' } });
    expect(updated?.sagsinfo?.kunde).toBe('A');

    const job = window.JobStore.get(id);
    expect(job?.sagsinfo?.kunde).toBe('A');
  });
});
