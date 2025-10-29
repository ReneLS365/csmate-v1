import { describe, it, expect, beforeEach } from 'vitest';
import { mapRoleFromClaims, attachRoleToSession, can } from '../src/auth/guards.js';
import { saveSession, clearSession, loadSession } from '../src/lib/storage.js';
import { ConfigSchema } from '../src/lib/schema.js';

function base64UrlEncode(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  const source = typeof btoa === 'function'
    ? btoa(json)
    : Buffer.from(json, 'utf8').toString('base64');
  return source.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createIdToken(payload) {
  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const body = base64UrlEncode(payload);
  return `${header}.${body}.`;
}

function cloneConfig() {
  if (typeof structuredClone === 'function') return structuredClone(ConfigSchema);
  return JSON.parse(JSON.stringify(ConfigSchema));
}

beforeEach(() => {
  clearSession();
});

describe('auth guards', () => {
  it('mapRoleFromClaims prioriterer claim-regler', () => {
    const config = cloneConfig();
    const claims = { roles: ['csmate_admin'] };
    expect(mapRoleFromClaims(claims, config)).toBe('admin');
  });

  it('mapRoleFromClaims falder tilbage til domænemapping', () => {
    const config = cloneConfig();
    config.auth.roleMapping.rules = [];
    config.auth.domainRules = [{ domain: 'hulmose.dk', to: 'foreman' }];
    const claims = { email: 'per@hulmose.dk' };
    expect(mapRoleFromClaims(claims, config)).toBe('foreman');
  });

  it('attachRoleToSession beriger og persisterer rolle fra id_token', () => {
    const config = cloneConfig();
    const idToken = createIdToken({ roles: ['csmate_worker'] });
    saveSession({ idToken, user: { username: 'worker@hulmose.dk' } });
    const session = attachRoleToSession(config);
    expect(session?.role).toBe('worker');
    expect(loadSession()?.role).toBe('worker');
  });

  it('can() bruger rolle-regler fra config', () => {
    const config = cloneConfig();
    saveSession({ role: 'foreman' });
    expect(can('approve', config)).toBe(true);
    expect(can('admin-only', config)).toBe(false);
  });
});
