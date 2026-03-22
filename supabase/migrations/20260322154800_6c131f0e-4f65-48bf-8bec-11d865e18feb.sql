
-- Paginated contacts for service-role (GHL mode)
CREATE OR REPLACE FUNCTION public.nearby_contacts_page(
  rep uuid,
  center_lat double precision,
  center_lng double precision,
  radius_miles double precision,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, first_name text, last_name text, phone text, address text,
  city text, state text, zip text, lifetime_value numeric,
  last_order_date date, last_service_date text, order_count integer,
  gift_count integer, rlt text, biz text, cat text,
  distance_miles double precision, contact_id text,
  latitude double precision, longitude double precision,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    c.id, c.first_name, c.last_name, c.phone, c.address, c.city, c.state, c.zip,
    c.lifetime_value, c.last_order_date, c.last_service_date, c.order_count, c.gift_count,
    c.rlt, c.biz, c.cat,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 AS distance_miles,
    c.contact_id, c.latitude, c.longitude,
    count(*) OVER() AS total_count
  FROM public.localist_contacts c
  WHERE c.rep_id = rep AND c.location IS NOT NULL
    AND st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  ORDER BY distance_miles ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Paginated contacts for authenticated users (standalone mode)
CREATE OR REPLACE FUNCTION public.nearby_contacts_page_auth(
  rep uuid,
  center_lat double precision,
  center_lng double precision,
  radius_miles double precision,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, first_name text, last_name text, phone text, address text,
  city text, state text, zip text, lifetime_value numeric,
  last_order_date date, last_service_date text, order_count integer,
  gift_count integer, rlt text, biz text, cat text,
  distance_miles double precision,
  latitude double precision, longitude double precision,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    c.id, c.first_name, c.last_name, c.phone, c.address, c.city, c.state, c.zip,
    c.lifetime_value, c.last_order_date, c.last_service_date, c.order_count, c.gift_count,
    c.rlt, c.biz, c.cat,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 AS distance_miles,
    c.latitude, c.longitude,
    count(*) OVER() AS total_count
  FROM public.localist_contacts c
  WHERE c.rep_id = rep AND rep = auth.uid() AND c.location IS NOT NULL
    AND st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  ORDER BY distance_miles ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Lightweight map markers for service-role (GHL mode)
CREATE OR REPLACE FUNCTION public.nearby_map_markers(
  rep uuid,
  center_lat double precision,
  center_lng double precision,
  radius_miles double precision
)
RETURNS TABLE(
  id uuid, latitude double precision, longitude double precision,
  lifetime_value numeric, distance_miles double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    c.id, c.latitude, c.longitude, c.lifetime_value,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 AS distance_miles
  FROM public.localist_contacts c
  WHERE c.rep_id = rep AND c.location IS NOT NULL
    AND st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  ORDER BY distance_miles ASC;
$$;

-- Lightweight map markers for authenticated users (standalone mode)
CREATE OR REPLACE FUNCTION public.nearby_map_markers_auth(
  rep uuid,
  center_lat double precision,
  center_lng double precision,
  radius_miles double precision
)
RETURNS TABLE(
  id uuid, latitude double precision, longitude double precision,
  lifetime_value numeric, distance_miles double precision
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    c.id, c.latitude, c.longitude, c.lifetime_value,
    st_distance(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) / 1609.344 AS distance_miles
  FROM public.localist_contacts c
  WHERE c.rep_id = rep AND rep = auth.uid() AND c.location IS NOT NULL
    AND st_dwithin(c.location::geography, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography, radius_miles * 1609.344)
  ORDER BY distance_miles ASC;
$$;
