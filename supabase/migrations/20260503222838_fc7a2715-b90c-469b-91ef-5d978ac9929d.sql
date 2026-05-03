
ALTER TABLE public.localist_reps
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method_on_file boolean NOT NULL DEFAULT false;
