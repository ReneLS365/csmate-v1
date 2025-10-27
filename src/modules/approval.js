/**
 * @purpose Enforce role-based approval transitions with audit logging for projekter.
 * @inputs Current state containing role, status and historical approval log entries.
 * @outputs Boolean checks for transitions plus updated state snapshots with appended log items.
 */

const ALLOWED = {
  sjakbajs: new Set(['kladde->afventer', 'afventer->kladde']),
  kontor: new Set(['afventer->godkendt', 'afventer->afvist', 'godkendt->afventer', 'afvist->afventer'])
};

export function canTransition(role, from, to) {
  return ALLOWED[role]?.has(`${from}->${to}`) || false;
}

export function nextStateByAction(state, to) {
  const role = state?.role ?? 'sjakbajs';
  const from = state?.status ?? 'kladde';
  if (!canTransition(role, from, to)) return state;
  const entry = { at: Date.now(), from, to, by: role };
  const log = Array.isArray(state?.approvalLog) ? state.approvalLog.slice() : [];
  log.push(entry);
  return { ...state, status: to, approvalLog: log };
}
