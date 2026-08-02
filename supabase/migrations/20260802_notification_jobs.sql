-- Persistent delivery queue. Payment/OTP flows enqueue quickly; Railway owns delivery.

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
  recipient TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'retry', 'sent', 'failed', 'cancelled')),
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  last_error TEXT,
  result JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_claim
  ON public.notification_jobs (status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_expired_lease
  ON public.notification_jobs (lock_expires_at)
  WHERE status = 'processing';

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.notification_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt INT;
CREATE INDEX IF NOT EXISTS idx_notification_logs_job
  ON public.notification_logs (job_id, created_at DESC);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

-- Claim jobs atomically. Expired leases are recovered by the next worker.
CREATE OR REPLACE FUNCTION public.claim_notification_jobs(
  p_worker_id UUID,
  p_limit INT DEFAULT 1,
  p_lease_seconds INT DEFAULT 180
)
RETURNS SETOF public.notification_jobs
LANGUAGE sql
AS $$
  WITH candidate AS (
    SELECT id
    FROM public.notification_jobs
    WHERE
      (
        status IN ('queued', 'retry')
        AND next_attempt_at <= now()
      )
      OR (
        status = 'processing'
        AND lock_expires_at < now()
      )
    ORDER BY next_attempt_at ASC, created_at ASC
    LIMIT GREATEST(1, LEAST(p_limit, 20))
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.notification_jobs j
    SET
      status = 'processing',
      attempt_count = j.attempt_count + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      lock_expires_at = now() + make_interval(secs => GREATEST(30, p_lease_seconds)),
      updated_at = now()
    FROM candidate c
    WHERE j.id = c.id
    RETURNING j.*
  )
  SELECT * FROM claimed;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_job(
  p_job_id UUID,
  p_worker_id UUID,
  p_result JSONB DEFAULT '{}'::jsonb
)
RETURNS public.notification_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.notification_jobs;
BEGIN
  UPDATE public.notification_jobs
  SET
    status = 'sent',
    result = p_result,
    last_error = NULL,
    sent_at = now(),
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = now()
  WHERE id = p_job_id
    AND status = 'processing'
    AND locked_by = p_worker_id
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Notification job % is not owned by worker %', p_job_id, p_worker_id;
  END IF;
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_notification_job(
  p_job_id UUID,
  p_worker_id UUID,
  p_error TEXT,
  p_retry_delay_seconds INT DEFAULT NULL,
  p_result JSONB DEFAULT '{}'::jsonb
)
RETURNS public.notification_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.notification_jobs;
  v_retry BOOLEAN;
BEGIN
  SELECT * INTO v_job
  FROM public.notification_jobs
  WHERE id = p_job_id
    AND status = 'processing'
    AND locked_by = p_worker_id
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Notification job % is not owned by worker %', p_job_id, p_worker_id;
  END IF;

  v_retry := p_retry_delay_seconds IS NOT NULL
    AND v_job.attempt_count < v_job.max_attempts;

  UPDATE public.notification_jobs
  SET
    status = CASE WHEN v_retry THEN 'retry' ELSE 'failed' END,
    next_attempt_at = CASE
      WHEN v_retry THEN now() + make_interval(secs => GREATEST(1, p_retry_delay_seconds))
      ELSE next_attempt_at
    END,
    last_error = left(coalesce(p_error, 'delivery failed'), 4000),
    result = p_result,
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

-- Atomically creates an OTP and its job. A 60-second cooldown prevents public OTP spam.
CREATE OR REPLACE FUNCTION public.issue_order_otp_job(
  p_payment_link_id UUID,
  p_link_id TEXT,
  p_recipient TEXT,
  p_code_hash TEXT,
  p_expires_at TIMESTAMPTZ,
  p_variables JSONB,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.notification_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.notification_jobs;
  v_last_otp public.order_access_otps;
BEGIN
  SELECT * INTO v_job
  FROM public.notification_jobs
  WHERE idempotency_key = p_idempotency_key;
  IF v_job.id IS NOT NULL THEN
    RETURN v_job;
  END IF;

  SELECT * INTO v_last_otp
  FROM public.order_access_otps
  WHERE payment_link_id = p_payment_link_id
    AND link_id = p_link_id
    AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_otp.id IS NOT NULL
    AND v_last_otp.created_at > now() - interval '60 seconds' THEN
    RAISE EXCEPTION 'OTP_RATE_LIMITED';
  END IF;

  INSERT INTO public.order_access_otps (
    payment_link_id, link_id, code_hash, expires_at
  ) VALUES (
    p_payment_link_id, p_link_id, p_code_hash, p_expires_at
  );

  INSERT INTO public.notification_jobs (
    idempotency_key, event_type, channel, recipient, variables, metadata
  ) VALUES (
    p_idempotency_key, 'otp.order_access', 'whatsapp', p_recipient,
    p_variables, p_metadata
  )
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

NOTIFY pgrst, 'reload schema';
