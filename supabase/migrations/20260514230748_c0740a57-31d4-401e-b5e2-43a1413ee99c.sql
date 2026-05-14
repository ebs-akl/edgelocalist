
-- Track trial email sends for idempotency
CREATE TABLE IF NOT EXISTS public.localist_trial_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step SMALLINT NOT NULL CHECK (step IN (1,2,3)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id TEXT,
  UNIQUE (rep_id, step)
);

ALTER TABLE public.localist_trial_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps can view their own trial email log"
  ON public.localist_trial_emails FOR SELECT
  USING (auth.uid() = rep_id);

CREATE INDEX IF NOT EXISTS idx_localist_trial_emails_rep_step
  ON public.localist_trial_emails (rep_id, step);

-- Schedule day-5 trial-ending email cron (runs daily at 15:00 UTC ~ 10am EST)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  existing_jobid BIGINT;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'localist-trial-email-cron';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'localist-trial-email-cron',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kbbkdmqftyfrojprpzdf.supabase.co/functions/v1/localist-trial-email-cron',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
