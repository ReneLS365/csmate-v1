/**
 * @purpose Gate tenant admin actions behind template-specific codes with a simple unlock/lock control.
 * @inputs Template id for lookup, current admin flag, optional disabled flag and change handler for parent state.
 * @outputs Form controls that verify against the template admin code before toggling admin mode.
 */

import { loadTemplate } from '@/lib/templates';

export default function AdminGate({ templateId, isAdmin = false, disabled = false, onAdminChange }) {
  const template = loadTemplate(templateId);
  const adminCode = template?._meta?.admin_code ?? '';
  const company = template?._meta?.company || template?.label || templateId;

  function handleSubmit(event) {
    event.preventDefault();
    if (disabled || isAdmin) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const code = String(formData.get('adminCode') ?? '').trim();
    form.reset();
    if (code && code === adminCode && typeof onAdminChange === 'function') {
      onAdminChange(true);
    }
  }

  function handleLock() {
    if (disabled) return;
    if (typeof onAdminChange === 'function') {
      onAdminChange(false);
    }
  }

  return (
    <form className="approval-controls" onSubmit={handleSubmit}>
      <div className="approval-controls__header">
        <span>Admin adgang</span>
        <small className="approval-controls__role">{company}</small>
      </div>
      <div className="approval-controls__actions">
        <input
          type="password"
          name="adminCode"
          placeholder="Admin-kode"
          autoComplete="off"
          disabled={disabled || isAdmin}
        />
        <button type="submit" className="approval-button" disabled={disabled || isAdmin}>Åbn</button>
        <button type="button" className="approval-button" disabled={disabled || !isAdmin} onClick={handleLock}>Lås</button>
      </div>
      <small className="approval-controls__role">{isAdmin ? 'Admin aktiv' : 'Admin låst'}</small>
    </form>
  );
}
