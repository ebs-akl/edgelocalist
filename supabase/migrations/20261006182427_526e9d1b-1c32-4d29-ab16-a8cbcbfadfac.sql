REVOKE EXECUTE ON FUNCTION public.record_referral(text,uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral(text,uuid,text,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.assign_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_localist_reps_sensitive_columns() FROM PUBLIC, anon, authenticated;