/**
 * @purpose Provide role-aware approval controls with inline audit logging support.
 * @inputs Current state with role/status and setState updater from parent view.
 * @outputs Button controls that mutate state via nextStateByAction respecting allowed transitions.
 */

import { nextStateByAction } from '@/modules/approval';
import ApprovalBadge from './ApprovalBadge';

export default function ApprovalControls({ state, setState }) {
  const role = state?.role ?? 'sjakbajs';
  const status = state?.status ?? 'kladde';

  function go(to) {
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

      {role === 'sjakbajs' && (
        <div className="approval-controls__actions">
          <button
            type="button"
            className="approval-button"
            disabled={status === 'afventer'}
            onClick={() => go('afventer')}
          >
            Send til godkendelse
          </button>
          <button
            type="button"
            className="approval-button"
            disabled={status === 'kladde'}
            onClick={() => go('kladde')}
          >
            Tilbage til kladde
          </button>
        </div>
      )}

      {role === 'kontor' && (
        <div className="approval-controls__actions">
          <button
            type="button"
            className="approval-button"
            disabled={status !== 'afventer'}
            onClick={() => go('godkendt')}
          >
            Godkend
          </button>
          <button
            type="button"
            className="approval-button"
            disabled={status !== 'afventer'}
            onClick={() => go('afvist')}
          >
            Afvis
          </button>
          <button
            type="button"
            className="approval-button"
            disabled={!(status === 'godkendt' || status === 'afvist')}
            onClick={() => go('afventer')}
          >
            Genåbn
          </button>
        </div>
      )}
    </div>
  );
}
