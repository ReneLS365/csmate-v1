/**
 * @purpose Surface tenant template selection with persisted defaults backed by the template helpers.
 * @inputs Current template id, optional disabled flag and change handler for parent managed state.
 * @outputs Select element wired to persistence that emits template ids for downstream calculations.
 */

import { listTemplates, persistTemplateSelection, loadTemplate } from '@/lib/templates';

const OPTIONS = listTemplates();

export default function TemplateSelect({ value, onChange, disabled = false }) {
  const selected = typeof value === 'string' ? loadTemplate(value) : loadTemplate();

  function handleChange(event) {
    const nextId = event.target.value;
    persistTemplateSelection(nextId);
    if (typeof onChange === 'function') {
      onChange(nextId);
    }
  }

  return (
    <div className="approval-controls">
      <div className="approval-controls__header">
        <span>Skabelon</span>
        <small className="approval-controls__role">{selected?._meta?.company || selected?.label}</small>
      </div>
      <select value={selected?.id ?? ''} onChange={handleChange} disabled={disabled}>
        {OPTIONS.map(({ id, label }) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </div>
  );
}
