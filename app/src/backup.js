// app/src/backup.js
import { downloadBlob, ts } from './exports.js'

export function exportFullBackup (options = {}) {
  const payload = {
    meta: {
      app: 'CSMate',
      version: window.APP_VERSION || '0.0.0',
      exportedAt: new Date().toISOString()
    },
    jobs: typeof window.JobStore?.dump === 'function' ? window.JobStore.dump() : (window.JobStore?.jobs || []),
    audit: typeof window.AuditLog?.dump === 'function' ? window.AuditLog.dump() : [],
    templates: typeof window.TemplateStore?.activeMeta === 'function'
      ? window.TemplateStore.activeMeta()
      : (window.TemplateStore?.templates || {})
  }
  const content = JSON.stringify(payload, null, 2)
  const fileName = `csmate-backup-${ts()}.json`
  if (options?.preview) {
    return { payload, content, fileName }
  }
  const blob = new Blob([content], { type: 'application/json' })
  downloadBlob(fileName, blob)
  return { payload, content, fileName }
}
