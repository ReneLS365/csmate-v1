import { describe, expect, it } from 'vitest';

import { canPerformAction, DEFAULT_FALLBACK_ACTIONS } from '../app/src/utils/permissions.js';

const ROLE_PERMISSIONS = {
  owner: {
    canCreateJobs: true,
    canLockJobs: true
  },
  formand: {
    canCreateJobs: true,
    canLockJobs: true
  },
  montor: {
    canCreateJobs: false,
    canLockJobs: false
  }
};

describe('permissions helper', () => {
  it('allows creating jobs without active user via fallback', () => {
    expect(canPerformAction({
      user: null,
      action: 'canCreateJobs',
      rolePermissions: ROLE_PERMISSIONS
    })).toBe(true);
  });

  it('blocks privileged actions without user context', () => {
    expect(canPerformAction({
      user: null,
      action: 'canLockJobs',
      rolePermissions: ROLE_PERMISSIONS
    })).toBe(false);
  });

  it('respects role permissions when user is present', () => {
    expect(canPerformAction({
      user: { role: 'formand' },
      action: 'canCreateJobs',
      rolePermissions: ROLE_PERMISSIONS
    })).toBe(true);

    expect(canPerformAction({
      user: { role: 'montor' },
      action: 'canCreateJobs',
      rolePermissions: ROLE_PERMISSIONS
    })).toBe(false);
  });

  it('supports overriding fallback actions', () => {
    const fallback = new Set([...DEFAULT_FALLBACK_ACTIONS, 'canLockJobs']);
    expect(canPerformAction({
      user: null,
      action: 'canLockJobs',
      rolePermissions: ROLE_PERMISSIONS,
      fallbackAllow: fallback
    })).toBe(true);
  });

  it('handles unknown roles safely', () => {
    expect(canPerformAction({
      user: { role: 'unknown' },
      action: 'canCreateJobs',
      rolePermissions: ROLE_PERMISSIONS
    })).toBe(false);
  });
});
