// app/src/backup.js
import { downloadBlob, ts } from './exports.js'

export function exportFullBackup () {
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
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(`csmate-backup-${ts()}.json`, blob)
}
