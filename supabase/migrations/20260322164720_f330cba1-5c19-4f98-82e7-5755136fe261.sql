
-- 1. Fix subscription tier bypass: Create a trigger that prevents client-side subscription_tier changes
-- Only service role (edge functions) should modify subscription_tier

CREATE OR REPLACE FUNCTION public.protect_subscription_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If subscription_tier is being changed and this is NOT a service-role call,
  -- revert subscription_tier to the old value.
  -- Service role bypasses RLS, so this trigger only fires for client calls.
  -- We detect non-service-role by checking if the current role is 'authenticated'
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    IF current_setting('role') = 'authenticated' THEN
      NEW.subscription_tier := OLD.subscription_tier;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_subscription_tier_trigger
  BEFORE UPDATE ON public.localist_reps
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_tier();

-- 2. Fix OAuth tokens readable: Drop the SELECT policy so clients can't read sensitive fields
-- All client reads already go through get_my_rep_profile() SECURITY DEFINER function
DROP POLICY IF EXISTS "reps: select own permissive" ON public.localist_reps;
