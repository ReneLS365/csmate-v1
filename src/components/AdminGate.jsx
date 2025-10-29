/**
 * @purpose Gate tenant admin actions behind template-specific codes with a simple unlock/lock control.
 * @inputs Template id for lookup, current admin flag, optional disabled flag and change handler for parent state.
 * @outputs Form controls that verify against the template admin code before toggling admin mode.
 */

import { loadTemplate } from '@/lib/templates';
import { sha256Hex, constantTimeEquals } from '@/lib/sha256.js';

export default function AdminGate({ templateId, isAdmin = false, disabled = false, onAdminChange }) {
  const template = loadTemplate(templateId);
  const adminCode = typeof template?._meta?.admin_code === 'string' ? template._meta.admin_code : '';
  const isHashed = /^[a-f0-9]{64}$/i.test(adminCode);
  const company = template?._meta?.company || template?.label || templateId;

  async function matchesAdminCode(input) {
    if (!input) return false;
    if (isHashed) {
      const hash = await sha256Hex(input);
      if (!hash) return false;
      return constantTimeEquals(hash, adminCode);
    }
    return input === adminCode;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (disabled || isAdmin) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const code = String(formData.get('adminCode') ?? '').trim();
    form.reset();
    if (await matchesAdminCode(code) && typeof onAdminChange === 'function') {
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
