/**
 * @purpose Bootstrap application state with persisted tenant selection defaults for the review workflow.
 * @inputs Optional storage override plus default state fragments including preset template ids.
 * @outputs Initial state object containing the resolved template id, hydrated template payload and admin toggle flag.
 */

import { DEFAULT_TEMPLATE_ID, getPersistedTemplate, loadTemplate } from '@/lib/templates';

export function createInitialState(options = {}) {
  const { storage, defaults = {} } = options;
  const persisted = getPersistedTemplate(storage);
  const preferred = typeof options.templateId === 'string' ? options.templateId : defaults.templateId;
  const templateId = preferred ?? persisted ?? DEFAULT_TEMPLATE_ID;
  const template = loadTemplate(templateId);
  const defaultIsAdmin = typeof defaults.isAdmin === 'boolean' ? defaults.isAdmin : false;
  const baseRole = typeof defaults.role === 'string' && defaults.role.trim().length > 0
    ? defaults.role
    : defaultIsAdmin
      ? 'chef'
      : 'sjakbajs';
  const baseState = {
    ...defaults,
    templateId: template.id,
    template,
    isAdmin: defaultIsAdmin,
    role: baseRole
  };
  return baseState;
}
