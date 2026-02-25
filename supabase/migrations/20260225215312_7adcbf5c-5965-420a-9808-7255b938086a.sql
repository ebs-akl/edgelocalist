
CREATE OR REPLACE FUNCTION public.smart_upsert_ghl_contacts(p_rep_id uuid, p_contacts jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c jsonb;
  existing_id uuid;
  existing_lat double precision;
  existing_lng double precision;
  normalized_phone text;
  total int := 0;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    existing_id := null;
    existing_lat := null;
    existing_lng := null;

    -- Normalize phone: strip leading country code 1 for matching
    normalized_phone := c->>'phone';
    IF LENGTH(normalized_phone) = 11 AND LEFT(normalized_phone, 1) = '1' THEN
      normalized_phone := RIGHT(normalized_phone, 10);
    END IF;

    -- Try to find existing contact by rep_id + phone (normalized)
    IF normalized_phone IS NOT NULL AND normalized_phone != '' THEN
      SELECT id, latitude, longitude
        INTO existing_id, existing_lat, existing_lng
        FROM public.localist_contacts
       WHERE rep_id = p_rep_id
         AND (phone = (c->>'phone') OR phone = normalized_phone OR RIGHT(phone, 10) = normalized_phone)
       LIMIT 1;
    END IF;

    IF existing_id IS NOT NULL THEN
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
        lifetime_value = COALESCE((c->>'lifetime_value')::numeric, lifetime_value),
        last_order_date = COALESCE((c->>'last_order_date')::date, last_order_date),
        order_count = COALESCE((c->>'order_count')::integer, order_count),
        gift_count  = COALESCE((c->>'gift_count')::integer, gift_count),
        rlt         = COALESCE(NULLIF(c->>'rlt', ''), rlt),
        biz         = COALESCE(NULLIF(c->>'biz', ''), biz),
        cat         = COALESCE(NULLIF(c->>'cat', ''), cat),
        last_service_date = COALESCE(NULLIF(c->>'last_service_date', ''), last_service_date),
        source      = 'ghl',
        updated_at  = now()
      WHERE id = existing_id;
      total := total + 1;
    ELSE
      INSERT INTO public.localist_contacts
        (rep_id, contact_id, first_name, last_name, phone, address, city, state, zip,
         latitude, longitude, lifetime_value, last_order_date,
         order_count, gift_count, rlt, biz, cat, last_service_date,
         source, updated_at)
      VALUES (
        p_rep_id,
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
        (c->>'lifetime_value')::numeric,
        (c->>'last_order_date')::date,
        (c->>'order_count')::integer,
        (c->>'gift_count')::integer,
        c->>'rlt',
        c->>'biz',
        c->>'cat',
        c->>'last_service_date',
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
        lifetime_value = COALESCE(EXCLUDED.lifetime_value, localist_contacts.lifetime_value),
        last_order_date = COALESCE(EXCLUDED.last_order_date, localist_contacts.last_order_date),
        order_count = COALESCE(EXCLUDED.order_count, localist_contacts.order_count),
        gift_count  = COALESCE(EXCLUDED.gift_count, localist_contacts.gift_count),
        rlt         = COALESCE(NULLIF(EXCLUDED.rlt, ''), localist_contacts.rlt),
        biz         = COALESCE(NULLIF(EXCLUDED.biz, ''), localist_contacts.biz),
        cat         = COALESCE(NULLIF(EXCLUDED.cat, ''), localist_contacts.cat),
        last_service_date = COALESCE(NULLIF(EXCLUDED.last_service_date, ''), localist_contacts.last_service_date),
        source      = 'ghl',
        updated_at  = now();
      total := total + 1;
    END IF;
  END LOOP;

  RETURN total;
END;
$function$;
