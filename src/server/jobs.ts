import { logger } from './logger.js';

export interface BackgroundJob {
  id: string;
  name: string;
  schedule: string; // Cron syntax or human readable
  last_run_at: string | null;
  next_run_at: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DISABLED';
  description: string;
}

export const registeredJobs: BackgroundJob[] = [
  {
    id: 'job_session_cleanup',
    name: 'Expired Session Pruning',
    schedule: 'Every 1 hour (0 * * * *)',
    last_run_at: '2026-09-07T14:00:00Z',
    next_run_at: '2026-09-07T15:00:00Z',
    status: 'IDLE',
    description: 'Deletes invalidated sessions and expired tokens from the persistence store.'
  },
  {
    id: 'job_audit_rotation',
    name: 'Audit Log Integrity Archiver',
    schedule: 'Daily at 02:00 UTC',
    last_run_at: '2026-09-07T02:00:00Z',
    next_run_at: '2026-09-08T02:00:00Z',
    status: 'IDLE',
    description: 'Hashes and seals audit logs for compliance retention.'
  },
  {
    id: 'job_phase2_interest_accrual',
    name: 'Investment Yield Accrual (Phase 2 Stub)',
    schedule: 'Daily at 00:00 UTC (INACTIVE)',
    last_run_at: null,
    next_run_at: 'Deferred to Phase 2',
    status: 'DISABLED',
    description: 'Phase 2 placeholder: calculates portfolio returns when enabled.'
  }
];

export function executeJob(jobId: string): { success: boolean; message: string } {
  const job = registeredJobs.find(j => j.id === jobId);
  if (!job) {
    return { success: false, message: 'Job identifier not found' };
  }
  logger.info('JOB', `Dispatched manual trigger for background job: ${job.name}`, { jobId });
  job.last_run_at = new Date().toISOString();
  return { success: true, message: `Background job '${job.name}' initiated in test mode.` };
}
