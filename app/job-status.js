const META_STATUS_MAP = new Map([
  ['kladde', 'draft'],
  ['afventer', 'submitted'],
  ['godkendt', 'approved'],
  ['afvist', 'rejected']
]);

const APPROVAL_STATUS_MAP = new Map([
  ['draft', 'kladde'],
  ['submitted', 'afventer'],
  ['approved', 'godkendt'],
  ['rejected', 'afvist']
]);

function canonicalize(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (META_STATUS_MAP.has(raw)) return META_STATUS_MAP.get(raw);
  if (APPROVAL_STATUS_MAP.has(raw)) return raw;
  switch (raw) {
    case 'pending':
    case 'venter':
      return 'submitted';
    case 'approve':
    case 'godkendt':
      return 'approved';
    case 'reject':
    case 'afvist':
      return 'rejected';
    default:
      return 'draft';
  }
}

export function approvalToMeta(status) {
  const normalized = canonicalize(status);
  return APPROVAL_STATUS_MAP.get(normalized) || 'kladde';
}

export function metaToApproval(metaStatus) {
  const normalized = typeof metaStatus === 'string' ? metaStatus.trim().toLowerCase() : '';
  if (META_STATUS_MAP.has(normalized)) return META_STATUS_MAP.get(normalized);
  return canonicalize(metaStatus);
}

export function ensureJobStatus(job) {
  if (!job || typeof job !== 'object') return job;
  const approval = canonicalize(job.approvalStatus || job.metaStatus);
  job.approvalStatus = approval;
  job.metaStatus = approvalToMeta(approval);
  if (!('approvedBy' in job)) {
    job.approvedBy = null;
  }
  if (!('approvedAt' in job)) {
    job.approvedAt = null;
  }
  return job;
}

export function markJobSubmitted(job) {
  if (!job || typeof job !== 'object') return job;
  job.approvalStatus = 'submitted';
  job.metaStatus = approvalToMeta('submitted');
  job.approvedBy = null;
  job.approvedAt = null;
  return job;
}

export function markJobApproved(job, userId) {
  if (!job || typeof job !== 'object') return job;
  job.approvalStatus = 'approved';
  job.metaStatus = approvalToMeta('approved');
  job.approvedBy = userId || null;
  job.approvedAt = new Date().toISOString();
  return job;
}

export function markJobRejected(job, userId) {
  if (!job || typeof job !== 'object') return job;
  job.approvalStatus = 'rejected';
  job.metaStatus = approvalToMeta('rejected');
  job.approvedBy = userId || null;
  job.approvedAt = new Date().toISOString();
  return job;
}

export function formatApprovalStatus(status) {
  const normalized = canonicalize(status);
  switch (normalized) {
    case 'submitted':
      return 'Afventer godkendelse';
    case 'approved':
      return 'Godkendt';
    case 'rejected':
      return 'Afvist';
    default:
      return 'Kladde';
  }
}
