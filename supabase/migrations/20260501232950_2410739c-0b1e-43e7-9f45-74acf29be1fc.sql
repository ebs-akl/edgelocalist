
-- Fix 1: Remove client SELECT on localist_reps to protect OAuth tokens & stripe IDs.
-- All client reads must go through get_my_rep_profile() RPC (returns safe fields only).
DROP POLICY IF EXISTS "reps: select own" ON public.localist_reps;

-- Fix 2: Remove email JWT claim bypass on pro_users; rely solely on user_id = auth.uid().
DROP POLICY IF EXISTS "Users can view own pro status" ON public.pro_users;
CREATE POLICY "Users can view own pro status"
  ON public.pro_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
