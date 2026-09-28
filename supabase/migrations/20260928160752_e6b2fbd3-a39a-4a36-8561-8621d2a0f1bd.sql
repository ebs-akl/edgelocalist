ALTER TABLE public.localist_contacts
  ADD COLUMN IF NOT EXISTS geocode_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS county_checked_at timestamptz;