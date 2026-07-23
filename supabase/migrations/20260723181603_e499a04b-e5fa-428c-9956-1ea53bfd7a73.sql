
-- Revoke column-level SELECT on sensitive OAuth token columns from client roles.
-- RLS row policies still allow owners to read their own rows for non-token columns.
REVOKE SELECT (ghl_access_token, ghl_refresh_token) ON public.localist_reps FROM anon, authenticated, PUBLIC;
REVOKE SELECT (ghl_access_token, ghl_refresh_token) ON public.profiles FROM anon, authenticated, PUBLIC;
REVOKE SELECT (ghl_access_token, ghl_refresh_token) ON public.profile_oauth_tokens FROM anon, authenticated, PUBLIC;

-- Ensure service_role retains full access for edge functions.
GRANT ALL ON public.localist_reps TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profile_oauth_tokens TO service_role;
