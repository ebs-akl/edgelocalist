ALTER TABLE public.localist_reps
  ADD CONSTRAINT localist_reps_ghl_location_id_key UNIQUE (ghl_location_id);