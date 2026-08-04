-- profiles: remove blanket SELECT, re-grant only non-token columns
REVOKE SELECT ON public.profiles FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, user_id, first_name, last_name, vector_rep_number, phone, created_at, password_changed_at, ghl_location_id, subscription_tier, full_name, access_revoked, email)
  ON public.profiles TO anon, authenticated;

-- localist_reps: remove blanket SELECT, re-grant only non-token columns
REVOKE SELECT ON public.localist_reps FROM anon, authenticated, PUBLIC;
GRANT SELECT (id, email, full_name, subscription_tier, ghl_location_id, stripe_customer_id, created_at, location_id, rep_number, subscription_status, trial_ends_at, payment_method_on_file, ghl_expires_at)
  ON public.localist_reps TO anon, authenticated;

-- service_role keeps full access
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.localist_reps TO service_role;
GRANT ALL ON public.profile_oauth_tokens TO service_role;

-- profile_oauth_tokens: backend-only, drop any client-facing policies
REVOKE ALL ON public.profile_oauth_tokens FROM anon, authenticated, PUBLIC;
DROP POLICY IF EXISTS own_select_profile_oauth_tokens ON public.profile_oauth_tokens;
DROP POLICY IF EXISTS "own_select_profile_oauth_tokens" ON public.profile_oauth_tokens;