-- Add server-side validation for rep_number format (8 digits)
ALTER TABLE public.localist_reps
ADD CONSTRAINT rep_number_format
CHECK (rep_number IS NULL OR rep_number ~ '^\d{8}$');