
-- Step 1: Copy lat/lng/location from CSV contacts to matching GHL contacts (phone match)
UPDATE localist_contacts ghl
SET 
  latitude = csv.latitude,
  longitude = csv.longitude,
  lifetime_value = COALESCE(ghl.lifetime_value, csv.lifetime_value),
  last_order_date = COALESCE(ghl.last_order_date, csv.last_order_date),
  last_service_date = COALESCE(ghl.last_service_date, csv.last_service_date),
  order_count = COALESCE(ghl.order_count, csv.order_count),
  gift_count = COALESCE(ghl.gift_count, csv.gift_count),
  rlt = COALESCE(ghl.rlt, csv.rlt),
  biz = COALESCE(ghl.biz, csv.biz),
  cat = COALESCE(ghl.cat, csv.cat),
  updated_at = now()
FROM localist_contacts csv
WHERE csv.rep_id = '21e7126e-1eac-4fc4-97aa-8d82d9049f9f'
  AND ghl.rep_id = 'd6fb36a9-dba8-4b52-9e29-6ceb15eb16b6'
  AND csv.phone != ''
  AND ghl.phone != ''
  AND RIGHT(ghl.phone, 10) = csv.phone
  AND csv.latitude IS NOT NULL;

-- Step 2: Delete matched CSV contacts (now redundant)
DELETE FROM localist_contacts csv
USING localist_contacts ghl
WHERE csv.rep_id = '21e7126e-1eac-4fc4-97aa-8d82d9049f9f'
  AND ghl.rep_id = 'd6fb36a9-dba8-4b52-9e29-6ceb15eb16b6'
  AND csv.phone != ''
  AND ghl.phone != ''
  AND RIGHT(ghl.phone, 10) = csv.phone;

-- Step 3: Reassign any remaining unmatched CSV contacts to the GHL rep
UPDATE localist_contacts
SET rep_id = 'd6fb36a9-dba8-4b52-9e29-6ceb15eb16b6',
    source = 'csv',
    updated_at = now()
WHERE rep_id = '21e7126e-1eac-4fc4-97aa-8d82d9049f9f';

-- Step 4: Update smart_upsert to normalize phone (strip leading 1) for matching
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
        source      = 'ghl',
        updated_at  = now()
      WHERE id = existing_id;
      total := total + 1;
    ELSE
      INSERT INTO public.localist_contacts
        (rep_id, contact_id, first_name, last_name, phone, address, city, state, zip,
         latitude, longitude, source, updated_at)
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
$function$;
