
-- Revoke client read access to sensitive OAuth tokens
REVOKE SELECT (ghl_access_token, ghl_refresh_token) ON public.profile_oauth_tokens FROM anon, authenticated;

-- Revoke client read access to sensitive API keys and inbound email
REVOKE SELECT (api_key, gemini_api_key, inbound_email) ON public.user_settings FROM anon, authenticated;

-- Scope trial email log policy to authenticated users only
DROP POLICY IF EXISTS "Reps can view their own trial email log" ON public.localist_trial_emails;
CREATE POLICY "Reps can view their own trial email log"
  ON public.localist_trial_emails
  FOR SELECT
  TO authenticated
  USING (auth.uid() = rep_id);
