
-- Restrict agency_oauth_tokens SELECT to service_role only
DROP POLICY IF EXISTS "Admins can view agency oauth tokens" ON public.agency_oauth_tokens;
REVOKE SELECT ON public.agency_oauth_tokens FROM authenticated, anon;

-- Make default-deny explicit on localist_trial_emails for client writes
CREATE POLICY "Deny client inserts on trial email log"
  ON public.localist_trial_emails FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on trial email log"
  ON public.localist_trial_emails FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on trial email log"
  ON public.localist_trial_emails FOR DELETE TO authenticated, anon
  USING (false);
