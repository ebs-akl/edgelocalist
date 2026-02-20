-- Add SELECT policy so users can read their own rep profile
CREATE POLICY "reps: select own"
ON public.localist_reps
FOR SELECT
USING (id = auth.uid());