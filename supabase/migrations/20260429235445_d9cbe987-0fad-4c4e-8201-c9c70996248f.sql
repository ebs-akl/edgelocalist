CREATE POLICY "reps: insert self" ON public.localist_reps FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "reps: select own" ON public.localist_reps FOR SELECT TO authenticated USING (id = auth.uid());