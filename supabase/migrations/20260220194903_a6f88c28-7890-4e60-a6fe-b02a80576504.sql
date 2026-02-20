-- Fix #1: Drop SELECT policy on localist_reps to prevent client access to sensitive tokens
-- Profile reads are handled by get_my_rep_profile() RPC which excludes tokens
DROP POLICY IF EXISTS "reps: select own" ON public.localist_reps;