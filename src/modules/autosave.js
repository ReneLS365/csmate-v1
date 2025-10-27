/**
 * @purpose Debounce project persistence so IndexedDB tracks the latest edits without overloading writes.
 * @inputs Mutable state snapshots and optional explicit project ids from the editor.
 * @outputs Queued async save operations handled through the persistence module.
 */

import { saveProject } from '@/modules/db';

let timer = null;

export function queueAutosave(state, projectId) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const id = projectId || genId(state);
    saveProject({ id, state, updatedAt: Date.now() }).catch(() => {});
  }, 400);
}

function genId(state) {
  if (state?.id) return String(state.id);
  return 'p_' + Math.random().toString(36).slice(2, 10);
}
