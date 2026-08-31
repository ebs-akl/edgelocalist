CREATE OR REPLACE FUNCTION public.protect_localist_reps_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.stripe_customer_id := NULL;
      NEW.subscription_tier := NULL;
      NEW.subscription_status := NULL;
      NEW.trial_ends_at := NULL;
      NEW.payment_method_on_file := false;
    ELSIF TG_OP = 'UPDATE' THEN
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