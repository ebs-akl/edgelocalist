
-- Batch smart upsert: matches on rep_id + phone to merge CSV→GHL contacts,
-- preserves existing lat/lng, upgrades source to 'ghl', attaches GHL contact_id.
CREATE OR REPLACE FUNCTION public.smart_upsert_ghl_contacts(p_contacts jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  c jsonb;
  existing_id uuid;
  existing_lat double precision;
  existing_lng double precision;
  total int := 0;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    existing_id := null;
    existing_lat := null;
    existing_lng := null;

    -- Try to find existing contact by rep_id + phone
    IF (c->>'phone') IS NOT NULL AND (c->>'phone') != '' THEN
      SELECT id, latitude, longitude
        INTO existing_id, existing_lat, existing_lng
        FROM public.localist_contacts
       WHERE rep_id = (c->>'rep_id')::uuid
         AND phone = c->>'phone'
       LIMIT 1;
    END IF;

    IF existing_id IS NOT NULL THEN
      -- Merge into existing CSV row: preserve coords, upgrade source, attach GHL id
      UPDATE public.localist_contacts SET
        contact_id  = c->>'contact_id',
        first_name  = COALESCE(NULLIF(c->>'first_name', ''), first_name),
        last_name   = COALESCE(NULLIF(c->>'last_name', ''), last_name),
        address     = COALESCE(NULLIF(c->>'address', ''), address),
        city        = COALESCE(NULLIF(c->>'city', ''), city),
        state       = COALESCE(NULLIF(c->>'state', ''), state),
        zip         = COALESCE(NULLIF(c->>'zip', ''), zip),
        latitude    = COALESCE((c->>'latitude')::double precision, existing_lat),
        longitude   = COALESCE((c->>'longitude')::double precision, existing_lng),
        source      = 'ghl',
        updated_at  = now()
      WHERE id = existing_id;
      total := total + 1;
    ELSE
      -- No phone match: standard upsert by rep_id + contact_id
      INSERT INTO public.localist_contacts
        (rep_id, contact_id, first_name, last_name, phone, address, city, state, zip,
         latitude, longitude, source, updated_at)
      VALUES (
        (c->>'rep_id')::uuid,
        c->>'contact_id',
        c->>'first_name',
        c->>'last_name',
        c->>'phone',
        c->>'address',
        c->>'city',
        c->>'state',
        c->>'zip',
        (c->>'latitude')::double precision,
        (c->>'longitude')::double precision,
        'ghl',
        now()
      )
      ON CONFLICT (rep_id, contact_id) DO UPDATE SET
        first_name  = COALESCE(NULLIF(EXCLUDED.first_name, ''), localist_contacts.first_name),
        last_name   = COALESCE(NULLIF(EXCLUDED.last_name, ''), localist_contacts.last_name),
        phone       = COALESCE(NULLIF(EXCLUDED.phone, ''), localist_contacts.phone),
        address     = COALESCE(NULLIF(EXCLUDED.address, ''), localist_contacts.address),
        city        = COALESCE(NULLIF(EXCLUDED.city, ''), localist_contacts.city),
        state       = COALESCE(NULLIF(EXCLUDED.state, ''), localist_contacts.state),
        zip         = COALESCE(NULLIF(EXCLUDED.zip, ''), localist_contacts.zip),
        latitude    = COALESCE(EXCLUDED.latitude, localist_contacts.latitude),
        longitude   = COALESCE(EXCLUDED.longitude, localist_contacts.longitude),
        source      = 'ghl',
        updated_at  = now();
      total := total + 1;
    END IF;
  END LOOP;

  RETURN total;
END;
$$;
