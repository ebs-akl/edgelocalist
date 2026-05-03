
-- Protect sensitive columns on localist_reps from client writes
CREATE OR REPLACE FUNCTION public.protect_localist_reps_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If invoked by an authenticated end-user (not service role), strip sensitive fields
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.ghl_access_token := NULL;
      NEW.ghl_refresh_token := NULL;
      NEW.ghl_expires_at := NULL;
      NEW.stripe_customer_id := NULL;
      NEW.subscription_tier := NULL;
      NEW.subscription_status := NULL;
      NEW.trial_ends_at := NULL;
      NEW.payment_method_on_file := false;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.ghl_access_token := OLD.ghl_access_token;
      NEW.ghl_refresh_token := OLD.ghl_refresh_token;
      NEW.ghl_expires_at := OLD.ghl_expires_at;
      NEW.stripe_customer_id := OLD.stripe_customer_id;
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.subscription_status := OLD.subscription_status;
      NEW.trial_ends_at := OLD.trial_ends_at;
      NEW.payment_method_on_file := OLD.payment_method_on_file;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_localist_reps_sensitive_columns_trg ON public.localist_reps;
CREATE TRIGGER protect_localist_reps_sensitive_columns_trg
BEFORE INSERT OR UPDATE ON public.localist_reps
FOR EACH ROW EXECUTE FUNCTION public.protect_localist_reps_sensitive_columns();
