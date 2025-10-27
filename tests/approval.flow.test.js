import { describe, it, expect } from 'vitest';
import { canTransition, nextStateByAction } from '../src/lib/approval.js';

describe('Approval flow', () => {
  it('sjakbajs må kun kladde <-> afventer', () => {
    expect(canTransition('sjakbajs', 'kladde', 'afventer')).toBe(true);
    expect(canTransition('sjakbajs', 'afventer', 'kladde')).toBe(true);
    expect(canTransition('sjakbajs', 'afventer', 'godkendt')).toBe(false);
  });

  it('kontor håndterer godkend/afvis og genåbn', () => {
    expect(canTransition('kontor', 'afventer', 'godkendt')).toBe(true);
    expect(canTransition('kontor', 'afventer', 'afvist')).toBe(true);
    expect(canTransition('kontor', 'godkendt', 'afventer')).toBe(true);
    expect(canTransition('kontor', 'afvist', 'afventer')).toBe(true);
  });

  it('nextStateByAction logger gyldige hop', () => {
    const s1 = { role: 'sjakbajs', status: 'kladde', approvalLog: [] };
    const s2 = nextStateByAction(s1, 'afventer');
    expect(s2.status).toBe('afventer');
    expect(s2.approvalLog?.length).toBe(1);
    const entry = s2.approvalLog[0];
    expect(entry.from).toBe('kladde');
    expect(entry.to).toBe('afventer');
    expect(entry.by).toBe('sjakbajs');
  });
});
