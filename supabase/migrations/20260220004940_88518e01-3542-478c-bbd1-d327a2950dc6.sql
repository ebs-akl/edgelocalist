
-- Create a SECURITY DEFINER function to safely return rep profile without sensitive fields
CREATE OR REPLACE FUNCTION public.get_my_rep_profile()
RETURNS TABLE(id uuid, email text, full_name text, subscription_tier text, ghl_location_id text, stripe_customer_id text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.email, r.full_name, r.subscription_tier, r.ghl_location_id, r.stripe_customer_id, r.created_at
  FROM public.localist_reps r
  WHERE r.id = auth.uid();
$$;

-- Drop the SELECT policy on localist_reps so clients cannot read sensitive columns directly
DROP POLICY IF EXISTS "reps: select own" ON public.localist_reps;
