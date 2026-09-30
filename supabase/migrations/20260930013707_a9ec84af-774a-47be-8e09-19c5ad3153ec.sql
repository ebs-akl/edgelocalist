CREATE OR REPLACE FUNCTION public.smart_upsert_ghl_contacts(p_rep_id uuid, p_contacts jsonb)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c jsonb;
  existing_id uuid;
  normalized_phone text;
  in_lat double precision;
  in_lng double precision;
  total int := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND p_rep_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: cannot upsert contacts for another rep';
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    existing_id := null;
    in_lat := (c->>'latitude')::double precision;
    in_lng := (c->>'longitude')::double precision;

    -- 1) Exact CRM contact match always wins
    IF NULLIF(c->>'contact_id','') IS NOT NULL THEN
      SELECT id INTO existing_id FROM public.localist_contacts
       WHERE rep_id = p_rep_id AND contact_id = c->>'contact_id' LIMIT 1;
    END IF;

    -- 2) Phone fallback only adopts rows not yet linked to a CRM contact (e.g. CSV imports),
    --    so household members sharing a phone stay separate records.
    IF existing_id IS NULL THEN
      normalized_phone := c->>'phone';
      IF LENGTH(normalized_phone) = 11 AND LEFT(normalized_phone, 1) = '1' THEN
        normalized_phone := RIGHT(normalized_phone, 10);
      END IF;
      IF normalized_phone IS NOT NULL AND normalized_phone != '' THEN
        SELECT id INTO existing_id FROM public.localist_contacts
         WHERE rep_id = p_rep_id
           AND (contact_id IS NULL OR contact_id = '' OR source IS DISTINCT FROM 'ghl')
           AND (phone = (c->>'phone') OR phone = normalized_phone OR RIGHT(phone, 10) = normalized_phone)
         LIMIT 1;
      END IF;
    END IF;

    IF existing_id IS NOT NULL THEN
      UPDATE public.localist_contacts lc SET
        contact_id  = COALESCE(NULLIF(c->>'contact_id',''), lc.contact_id),
        first_name  = COALESCE(NULLIF(c->>'first_name', ''), lc.first_name),
        last_name   = COALESCE(NULLIF(c->>'last_name', ''), lc.last_name),
        address     = COALESCE(NULLIF(c->>'address', ''), lc.address),
        city        = COALESCE(NULLIF(c->>'city', ''), lc.city),
        state       = COALESCE(NULLIF(c->>'state', ''), lc.state),
        zip         = COALESCE(NULLIF(c->>'zip', ''), lc.zip),
        -- If the address changed and no fresh coordinates came in, clear the old pin so it gets re-mapped
        latitude    = CASE WHEN in_lat IS NOT NULL THEN in_lat
                           WHEN (NULLIF(c->>'address','') IS NOT NULL AND lower(trim(c->>'address')) IS DISTINCT FROM lower(trim(lc.address)))
                             OR (NULLIF(c->>'zip','') IS NOT NULL AND trim(c->>'zip') IS DISTINCT FROM trim(lc.zip))
                           THEN NULL ELSE lc.latitude END,
        longitude   = CASE WHEN in_lng IS NOT NULL THEN in_lng
                           WHEN (NULLIF(c->>'address','') IS NOT NULL AND lower(trim(c->>'address')) IS DISTINCT FROM lower(trim(lc.address)))
                             OR (NULLIF(c->>'zip','') IS NOT NULL AND trim(c->>'zip') IS DISTINCT FROM trim(lc.zip))
                           THEN NULL ELSE lc.longitude END,
        geocode_failed_at = CASE WHEN (NULLIF(c->>'address','') IS NOT NULL AND lower(trim(c->>'address')) IS DISTINCT FROM lower(trim(lc.address)))
                             OR (NULLIF(c->>'zip','') IS NOT NULL AND trim(c->>'zip') IS DISTINCT FROM trim(lc.zip))
                           THEN NULL ELSE lc.geocode_failed_at END,
        lifetime_value = COALESCE((c->>'lifetime_value')::numeric, lc.lifetime_value),
        last_order_date = COALESCE((c->>'last_order_date')::date, lc.last_order_date),
        order_count = COALESCE((c->>'order_count')::integer, lc.order_count),
        gift_count  = COALESCE((c->>'gift_count')::integer, lc.gift_count),
        rlt         = COALESCE(NULLIF(c->>'rlt', ''), lc.rlt),
        biz         = COALESCE(NULLIF(c->>'biz', ''), lc.biz),
        cat         = COALESCE(NULLIF(c->>'cat', ''), lc.cat),
        last_service_date = COALESCE(NULLIF(c->>'last_service_date', ''), lc.last_service_date),
        source      = 'ghl',
        updated_at  = now()
      WHERE lc.id = existing_id;
    ELSE
      INSERT INTO public.localist_contacts
        (rep_id, contact_id, first_name, last_name, phone, address, city, state, zip,
         latitude, longitude, lifetime_value, last_order_date,
         order_count, gift_count, rlt, biz, cat, last_service_date, source, updated_at)
      VALUES (p_rep_id, c->>'contact_id', c->>'first_name', c->>'last_name', c->>'phone',
        c->>'address', c->>'city', c->>'state', c->>'zip', in_lat, in_lng,
        (c->>'lifetime_value')::numeric, (c->>'last_order_date')::date,
        (c->>'order_count')::integer, (c->>'gift_count')::integer,
        c->>'rlt', c->>'biz', c->>'cat', c->>'last_service_date', 'ghl', now())
      ON CONFLICT (rep_id, contact_id) DO NOTHING;
    END IF;
    total := total + 1;
  END LOOP;
  RETURN total;
END $function$;