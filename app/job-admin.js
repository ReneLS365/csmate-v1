import {
  getJobsForFirm,
  approveJob,
  rejectJob,
} from './services/job-service.js';

export function listJobsForFirm(firmId) {
  return getJobsForFirm(firmId);
}

export function approveJobById(jobId, approverId) {
  approveJob(jobId, approverId);
}

export function rejectJobById(jobId, approverId) {
  rejectJob(jobId, approverId);
}
