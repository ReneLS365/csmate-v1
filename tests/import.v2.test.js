// tests/import.v2.test.js
import { describe, it, expect } from 'vitest';
import { importJSON } from '../src/lib/importers.js';

describe('importJSON v2 tralleløft mapping', () => {
  it('maps tralleløftInfo metadata back to state keys', () => {
    const payload = {
      version: 2,
      tralleløftInfo: 88.4
    };

    const state = importJSON(payload);

    expect(state.tralleløftKr).toBe(88.4);
    expect(state.tralleloftKr).toBe(88.4);
  });

  it('keeps existing tralleløftKr when present', () => {
    const payload = {
      version: 2,
      tralleløftInfo: 88.4,
      tralleløftKr: 42
    };

    const state = importJSON(payload);

    expect(state.tralleløftKr).toBe(42);
    expect(state.tralleloftKr).toBeUndefined();
  });
});
