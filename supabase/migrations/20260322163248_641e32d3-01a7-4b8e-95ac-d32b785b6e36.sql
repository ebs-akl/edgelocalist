
-- Add county column (idempotent)
ALTER TABLE public.localist_contacts ADD COLUMN IF NOT EXISTS county text;

-- Must drop functions first to change return types
DROP FUNCTION IF EXISTS public.nearby_contacts_page(uuid, double precision, double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_contacts_page_auth(uuid, double precision, double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_contacts_service(uuid, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.nearby_contacts(uuid, double precision, double precision, double precision);

CREATE FUNCTION public.nearby_contacts_page(rep uuid, center_lat double precision, center_lng double precision, radius_miles double precision, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, first_name text, last_name text, phone text, address text, city text, state text, zip text, lifetime_value numeric, last_order_date date, last_service_date text, order_count integer, gift_count integer, rlt text, biz text, cat text, distance_miles double precision, contact_id text, latitude double precision, longitude double precision, total_count bigint, county text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
  SELECT c.id, c.first_name, c.last_name, c.phone, c.address, c.city, c.state, c.zip,
    c.lifetime_value, c.last_order_date, c.last_service_date, c.order_count, c.gift_count,
    c.rlt, c.biz, c.cat,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 AS distance_miles,
    c.contact_id, c.latitude, c.longitude, count(*) OVER() AS total_count, c.county
  FROM public.localist_contacts c
  WHERE c.rep_id = rep AND c.location IS NOT NULL
    AND st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  ORDER BY distance_miles ASC LIMIT p_limit OFFSET p_offset;
$function$;

CREATE FUNCTION public.nearby_contacts_page_auth(rep uuid, center_lat double precision, center_lng double precision, radius_miles double precision, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, first_name text, last_name text, phone text, address text, city text, state text, zip text, lifetime_value numeric, last_order_date date, last_service_date text, order_count integer, gift_count integer, rlt text, biz text, cat text, distance_miles double precision, latitude double precision, longitude double precision, total_count bigint, county text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
  SELECT c.id, c.first_name, c.last_name, c.phone, c.address, c.city, c.state, c.zip,
    c.lifetime_value, c.last_order_date, c.last_service_date, c.order_count, c.gift_count,
    c.rlt, c.biz, c.cat,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 AS distance_miles,
    c.latitude, c.longitude, count(*) OVER() AS total_count, c.county
  FROM public.localist_contacts c
  WHERE c.rep_id = rep AND rep = auth.uid() AND c.location IS NOT NULL
    AND st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  ORDER BY distance_miles ASC LIMIT p_limit OFFSET p_offset;
$function$;

CREATE FUNCTION public.nearby_contacts_service(rep uuid, center_lat double precision, center_lng double precision, radius_miles double precision)
 RETURNS TABLE(id uuid, first_name text, last_name text, phone text, address text, city text, state text, zip text, lifetime_value numeric, last_order_date date, last_service_date text, order_count integer, gift_count integer, rlt text, biz text, cat text, distance_miles double precision, contact_id text, latitude double precision, longitude double precision, county text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
  select c.id, c.first_name, c.last_name, c.phone, c.address, c.city, c.state, c.zip,
    c.lifetime_value, c.last_order_date, c.last_service_date, c.order_count, c.gift_count,
    c.rlt, c.biz, c.cat,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 as distance_miles,
    c.contact_id, c.latitude, c.longitude, c.county
  from public.localist_contacts c
  where c.rep_id = rep and c.location is not null
    and st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  order by distance_miles asc;
$function$;

CREATE FUNCTION public.nearby_contacts(rep uuid, center_lat double precision, center_lng double precision, radius_miles double precision)
 RETURNS TABLE(id uuid, first_name text, last_name text, phone text, address text, city text, state text, zip text, lifetime_value numeric, last_order_date date, last_service_date text, order_count integer, gift_count integer, rlt text, biz text, cat text, distance_miles double precision, latitude double precision, longitude double precision, county text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
  select c.id, c.first_name, c.last_name, c.phone, c.address, c.city, c.state, c.zip,
    c.lifetime_value, c.last_order_date, c.last_service_date, c.order_count, c.gift_count,
    c.rlt, c.biz, c.cat,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 as distance_miles,
    c.latitude, c.longitude, c.county
  from public.localist_contacts c
  where c.rep_id = rep and rep = auth.uid() and c.location is not null
    and st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  order by distance_miles asc;
$function$;
