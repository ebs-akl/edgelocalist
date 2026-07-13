
-- Consolidate duplicate/overlapping SELECT policies on public.recipe_cache, and restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read recipe cache" ON public.recipe_cache;
DROP POLICY IF EXISTS "public read cache" ON public.recipe_cache;
DROP POLICY IF EXISTS "Auth users can read cache" ON public.recipe_cache;
CREATE POLICY "Authenticated can read recipe cache"
  ON public.recipe_cache FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.recipe_cache FROM anon;
GRANT SELECT ON public.recipe_cache TO authenticated;

-- Enable RLS on public.spatial_ref_sys (PostGIS reference table); allow read to all
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read spatial_ref_sys" ON public.spatial_ref_sys';
    EXECUTE 'CREATE POLICY "Anyone can read spatial_ref_sys" ON public.spatial_ref_sys FOR SELECT USING (true)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot ALTER spatial_ref_sys (owned by system); skipping';
  END;
END $$;
