CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  slug text;
BEGIN
  slug := 'rep-' || encode(extensions.gen_random_bytes(6), 'hex') || '@inbound.alomar.app';

  INSERT INTO public.profiles (user_id, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_settings (user_id, inbound_email)
  VALUES (NEW.id, slug)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth signup if profile/settings insert fails
  RETURN NEW;
END;
$function$;