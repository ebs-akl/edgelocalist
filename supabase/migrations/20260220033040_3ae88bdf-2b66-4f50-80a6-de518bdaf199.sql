
CREATE OR REPLACE FUNCTION public.sync_contact_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326);
  else
    new.location := null;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nearby_contacts(rep uuid, center_lat double precision, center_lng double precision, radius_miles double precision)
 RETURNS TABLE(id uuid, first_name text, last_name text, phone text, address text, city text, state text, zip text, lifetime_value numeric, last_order_date date, distance_miles double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.city,
    c.state,
    c.zip,
    c.lifetime_value,
    c.last_order_date,
    st_distance(
      c.location::geography,
      st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography
    ) / 1609.344 as distance_miles
  from public.localist_contacts c
  where
    c.rep_id = rep
    and rep = auth.uid()
    and c.location is not null
    and st_dwithin(
      c.location::geography,
      st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography,
      radius_miles * 1609.344
    )
  order by distance_miles asc;
$function$;
