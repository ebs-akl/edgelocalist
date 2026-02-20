
-- Add rep_number column to localist_reps
ALTER TABLE public.localist_reps ADD COLUMN IF NOT EXISTS rep_number text;

-- Drop and recreate get_my_rep_profile with rep_number
DROP FUNCTION IF EXISTS public.get_my_rep_profile();

CREATE OR REPLACE FUNCTION public.get_my_rep_profile()
 RETURNS TABLE(id uuid, email text, full_name text, subscription_tier text, ghl_location_id text, created_at timestamp with time zone, rep_number text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.email, r.full_name, r.subscription_tier, r.ghl_location_id, r.created_at, r.rep_number
  FROM public.localist_reps r
  WHERE r.id = auth.uid();
$function$;

NOTIFY pgrst, 'reload schema';
