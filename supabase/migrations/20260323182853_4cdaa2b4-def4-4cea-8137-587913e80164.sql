
-- Add county_pushed flag to track which contacts have had county synced to GHL
ALTER TABLE public.localist_contacts ADD COLUMN IF NOT EXISTS county_pushed boolean NOT NULL DEFAULT false;

-- Trigger to reset county_pushed when county changes
CREATE OR REPLACE FUNCTION public.reset_county_pushed()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.county IS DISTINCT FROM OLD.county THEN
    NEW.county_pushed := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_county_pushed ON public.localist_contacts;
CREATE TRIGGER trg_reset_county_pushed
  BEFORE UPDATE ON public.localist_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_county_pushed();
