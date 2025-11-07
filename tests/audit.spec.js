/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '../app/src/globals.js';

beforeEach(() => {
  window.AuditLog?.clear?.();
});

describe('Audit', () => {
  it('append and tail', () => {
    window.AuditLog.append({ type: 'TEST', ts: Date.now(), message: 'ok' });
    const tail = window.AuditLog.tail(1);
    expect(Array.isArray(tail)).toBe(true);
    expect(tail[0]?.type).toBe('TEST');
  });
});
