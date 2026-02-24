-- Migrate OAuth tokens from Kevin's old corrupted account to his new SSO-isolated account.
-- The tokens on d320b8a2 were originally authorized for location hXcSSA35KVSLC2674wFT
-- but the ghl_location_id was overwritten by the Denise bug.
UPDATE public.localist_reps
SET 
  ghl_access_token = old.ghl_access_token,
  ghl_refresh_token = old.ghl_refresh_token,
  ghl_expires_at = old.ghl_expires_at,
  subscription_tier = 'edgedms',
  email = 'kevin.connor@edgebrandingsolutions.com'
FROM (
  SELECT ghl_access_token, ghl_refresh_token, ghl_expires_at
  FROM public.localist_reps
  WHERE id = 'd320b8a2-4ae2-4cce-9395-71bc3611c8f8'
) AS old
WHERE localist_reps.id = '00c24ef6-c889-4676-8926-2b8102415f1d';

-- Also migrate contacts from old account to new account
UPDATE public.localist_contacts
SET rep_id = '00c24ef6-c889-4676-8926-2b8102415f1d'
WHERE rep_id = 'd320b8a2-4ae2-4cce-9395-71bc3611c8f8';