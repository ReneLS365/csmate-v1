/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import '../app/src/globals.js';

describe('Calc baseline', () => {
  it('window.Calc.test() === true', () => {
    expect(window).toBeDefined();
    expect(typeof window.Calc?.test).toBe('function');
    expect(window.Calc.test()).toBe(true);
  });
});
