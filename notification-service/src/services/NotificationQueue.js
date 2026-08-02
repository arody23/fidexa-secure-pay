import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

const POLL_MS = Number(process.env.NOTIFICATION_QUEUE_POLL_MS || 3000);
const LEASE_SECONDS = Number(process.env.NOTIFICATION_QUEUE_LEASE_SECONDS || 180);

function stringifyError(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * ACK -1 is a WhatsApp terminal rejection. ACK 0/no readiness/IPC failures are
 * transient and retryable until max_attempts is reached by the database function.
 */
export function classifyDeliveryError(error) {
  const message = stringifyError(error);
  const lower = message.toLowerCase();

  const permanent =
    lower.includes('ack=-1') ||
    lower.includes('numéro non whatsapp') ||
    lower.includes('template introuvable') ||
    lower.includes('template_disabled') ||
    lower.includes('message whatsapp vide') ||
    lower.includes('canal non supporté');

  return {
    message,
    retryable: !permanent,
    kind: permanent ? 'permanent' : 'transient',
  };
}

function retryDelaySeconds(attempt) {
  return Math.min(15 * 2 ** Math.max(0, attempt - 1), 15 * 60);
}

/**
 * One logical consumer per Railway service. Leases make a crash/redeploy safe:
 * a new process can recover jobs whose lease has expired.
 */
export class NotificationQueue {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.workerId = crypto.randomUUID();
    this.timer = null;
    this.running = false;
    this.processing = false;
    this.lastError = null;
    this.lastProcessedAt = null;
  }

  status() {
    return {
      running: this.running,
      processing: this.processing,
      workerId: this.workerId,
      lastError: this.lastError,
      lastProcessedAt: this.lastProcessedAt,
      pollMs: POLL_MS,
      leaseSeconds: LEASE_SECONDS,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.schedule(0);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  schedule(delay = POLL_MS) {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.tick();
    }, delay);
  }

  async tick() {
    if (!this.running || this.processing) {
      this.schedule();
      return;
    }

    this.processing = true;
    try {
      const { data: jobs, error } = await supabase.rpc('claim_notification_jobs', {
        p_worker_id: this.workerId,
        p_limit: 1,
        p_lease_seconds: LEASE_SECONDS,
      });
      if (error) throw new Error(error.message);

      for (const job of jobs || []) {
        await this.process(job);
      }
      this.lastError = null;
    } catch (error) {
      this.lastError = stringifyError(error);
      console.error('[notification-queue] poll failed:', this.lastError);
    } finally {
      this.processing = false;
      this.schedule();
    }
  }

  async process(job) {
    this.lastProcessedAt = new Date().toISOString();
    try {
      const result = await this.notificationService.sendNotification(
        job.event_type,
        job.recipient,
        job.variables || {},
        {
          channel: job.channel,
          metadata: job.metadata || {},
          jobId: job.id,
          attempt: job.attempt_count,
        }
      );

      const { error } = await supabase.rpc('complete_notification_job', {
        p_job_id: job.id,
        p_worker_id: this.workerId,
        p_result: result.result || {},
      });
      if (error) throw new Error(error.message);
      console.log(`[notification-queue] sent job=${job.id} attempt=${job.attempt_count}`);
    } catch (error) {
      const classification = classifyDeliveryError(error);
      const { error: persistError } = await supabase.rpc('fail_notification_job', {
        p_job_id: job.id,
        p_worker_id: this.workerId,
        p_error: classification.message,
        p_retry_delay_seconds: classification.retryable
          ? retryDelaySeconds(job.attempt_count)
          : null,
        p_result: { classification: classification.kind },
      });
      if (persistError) {
        console.error('[notification-queue] unable to persist failed job:', persistError.message);
      }
      console.warn(
        `[notification-queue] ${classification.kind} failure job=${job.id} attempt=${job.attempt_count}: ${classification.message}`
      );
    }
  }
}
