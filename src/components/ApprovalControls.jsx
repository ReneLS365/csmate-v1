/**
 * @purpose Provide role-aware approval controls with inline audit logging support.
 * @inputs Current state with role/status and setState updater from parent view.
 * @outputs Button controls that mutate state via nextStateByAction respecting allowed transitions.
 */

import { nextStateByAction } from '@/modules/approval';
import { hasPerm } from '@/lib/approval-perms';
import ApprovalBadge from './ApprovalBadge';

export default function ApprovalControls({ state, setState, disabled = false }) {
  const role = state?.role ?? 'sjakbajs';
  const status = state?.status ?? 'kladde';

  const canSend = hasPerm(state, 'send');
  const canApprove = hasPerm(state, 'approve');
  const canReject = hasPerm(state, 'reject');
  const canReopen = canApprove || canReject;

  function go(to) {
    if (disabled) return;
    if (typeof setState === 'function') {
      setState((prev) => nextStateByAction(prev, to));
    }
  }

  return (
    <div className="approval-controls">
      <div className="approval-controls__header">
        <ApprovalBadge status={status} />
        <small className="approval-controls__role">Rolle: <b>{role}</b></small>
      </div>

      {canSend && (
        <div className="approval-controls__actions">
          <button
            type="button"
            className="approval-button"
            disabled={disabled || status === 'afventer'}
            onClick={() => go('afventer')}
          >
            Send til godkendelse
          </button>
          <button
            type="button"
            className="approval-button"
            disabled={disabled || status === 'kladde'}
            onClick={() => go('kladde')}
          >
            Tilbage til kladde
          </button>
        </div>
      )}

      {(canApprove || canReject) && (
        <div className="approval-controls__actions">
          {canApprove && (
            <button
              type="button"
              className="approval-button"
              disabled={disabled || status !== 'afventer'}
              onClick={() => go('godkendt')}
            >
              Godkend
            </button>
          )}
          {canReject && (
            <button
              type="button"
              className="approval-button"
              disabled={disabled || status !== 'afventer'}
              onClick={() => go('afvist')}
            >
              Afvis
            </button>
          )}
          {canReopen && (
            <button
              type="button"
              className="approval-button"
              disabled={
                disabled || !['godkendt', 'afvist'].includes(status)
              }
              onClick={() => go('afventer')}
            >
              Genåbn
            </button>
          )}
        </div>
      )}
    </div>
  );
}
