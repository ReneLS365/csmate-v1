/**
 * @purpose Enforce role-based approval transitions with audit logging for projekter.
 * @inputs Current state containing role, status and historical approval log entries.
 * @outputs Boolean checks for transitions plus updated state snapshots with appended log items.
 */

import { resolvePermissionContext } from '@/modules/approval-perms';

const PERMISSION_TRANSITIONS = {
  send: ['kladde->afventer', 'afventer->kladde'],
  approve: ['afventer->godkendt', 'godkendt->afventer'],
  reject: ['afventer->afvist', 'afvist->afventer']
};

const LEGACY_TRANSITIONS = {
  sjakbajs: new Set(['kladde->afventer', 'afventer->kladde']),
  arbejder: new Set(['kladde->afventer', 'afventer->kladde']),
  formand: new Set(['kladde->afventer', 'afventer->kladde']),
  kontor: new Set(['afventer->godkendt', 'afventer->afvist', 'godkendt->afventer', 'afvist->afventer']),
  chef: new Set(['afventer->godkendt', 'afventer->afvist', 'godkendt->afventer', 'afvist->afventer'])
};

function normalizeState(input) {
  if (input && typeof input === 'object') {
    return input;
  }
  if (typeof input === 'string') {
    return { role: input };
  }
  return {};
}

function mergeTransitionsFromPermissions(state) {
  const { permissions, usedFallback } = resolvePermissionContext(state);
  const transitions = new Set();

  for (const permission of permissions) {
    const hops = PERMISSION_TRANSITIONS[permission];
    if (!hops) continue;
    for (const hop of hops) {
      transitions.add(hop);
    }
  }

  if (usedFallback && transitions.size === 0) {
    const legacy = LEGACY_TRANSITIONS[String(state?.role ?? '').toLowerCase()];
    if (legacy) {
      for (const hop of legacy) {
        transitions.add(hop);
      }
    }
  }

  return transitions;
}

export function canTransition(state, from, to) {
  if (typeof from !== 'string' || typeof to !== 'string') {
    return false;
  }

  const safeState = normalizeState(state);
  const transitionKey = `${from}->${to}`;
  const transitions = mergeTransitionsFromPermissions(safeState);
  return transitions.has(transitionKey);
}

export function nextStateByAction(state, to) {
  const safeState = normalizeState(state);
  const role = typeof safeState.role === 'string' ? safeState.role : 'sjakbajs';
  const from = typeof safeState.status === 'string' ? safeState.status : 'kladde';
  if (!canTransition(safeState, from, to)) return safeState;
  const entry = { at: Date.now(), from, to, by: role };
  const log = Array.isArray(safeState?.approvalLog) ? safeState.approvalLog.slice() : [];
  log.push(entry);
  return { ...safeState, status: to, approvalLog: log };
}
