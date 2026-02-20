
DROP FUNCTION IF EXISTS public.get_my_rep_profile();

CREATE FUNCTION public.get_my_rep_profile()
 RETURNS TABLE(id uuid, email text, full_name text, subscription_tier text, ghl_location_id text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT r.id, r.email, r.full_name, r.subscription_tier, r.ghl_location_id, r.created_at
  FROM public.localist_reps r
  WHERE r.id = auth.uid();
$$;
