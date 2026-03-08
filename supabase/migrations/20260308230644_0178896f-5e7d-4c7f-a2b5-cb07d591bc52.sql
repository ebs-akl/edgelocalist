-- Add permissive policies so the restrictive ones can actually work
-- Users need to SELECT their own row (for profile reads) and UPDATE it (for settings edits)

CREATE POLICY "reps: select own permissive"
  ON public.localist_reps
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "reps: update own" ON public.localist_reps;
CREATE POLICY "reps: update own"
  ON public.localist_reps
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "reps: insert own" ON public.localist_reps;
CREATE POLICY "reps: insert own"
  ON public.localist_reps
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "reps: delete own" ON public.localist_reps;
CREATE POLICY "reps: delete own"
  ON public.localist_reps
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());