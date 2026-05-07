
-- Revoke client-side SELECT on sensitive columns (edge functions use service role and are unaffected)
REVOKE SELECT (ghl_access_token, ghl_refresh_token, stripe_customer_id) ON public.localist_reps FROM authenticated, anon;
REVOKE SELECT (api_key, gemini_api_key, inbound_email) ON public.user_settings FROM authenticated, anon;
