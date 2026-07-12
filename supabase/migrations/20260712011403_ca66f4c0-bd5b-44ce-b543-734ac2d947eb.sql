
REVOKE EXECUTE ON FUNCTION public.nearby_contacts(uuid, double precision, double precision, double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.nearby_contacts(uuid, double precision, double precision, double precision) TO service_role;

REVOKE EXECUTE ON FUNCTION public.nearby_contacts_service(uuid, double precision, double precision, double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.nearby_contacts_service(uuid, double precision, double precision, double precision) TO service_role;

REVOKE EXECUTE ON FUNCTION public.nearby_contacts_page(uuid, double precision, double precision, double precision, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.nearby_contacts_page(uuid, double precision, double precision, double precision, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.nearby_map_markers(uuid, double precision, double precision, double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.nearby_map_markers(uuid, double precision, double precision, double precision) TO service_role;

REVOKE EXECUTE ON FUNCTION public.smart_upsert_ghl_contacts(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.smart_upsert_ghl_contacts(uuid, jsonb) TO service_role;

DROP POLICY IF EXISTS "Auth users can upload post images" ON storage.objects;
CREATE POLICY "Auth users can upload post images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post_images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Owners can read own post images" ON storage.objects;
CREATE POLICY "Owners can read own post images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'post_images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
