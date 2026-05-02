-- Restrict localist_contacts RLS policies to authenticated role only
DROP POLICY IF EXISTS "LocaList Contacts Isolation" ON public.localist_contacts;
DROP POLICY IF EXISTS "contacts: delete own" ON public.localist_contacts;
DROP POLICY IF EXISTS "contacts: insert own" ON public.localist_contacts;
DROP POLICY IF EXISTS "contacts: select own" ON public.localist_contacts;
DROP POLICY IF EXISTS "contacts: update own" ON public.localist_contacts;

CREATE POLICY "contacts: select own"
  ON public.localist_contacts
  FOR SELECT
  TO authenticated
  USING (rep_id = auth.uid());

CREATE POLICY "contacts: insert own"
  ON public.localist_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (rep_id = auth.uid());

CREATE POLICY "contacts: update own"
  ON public.localist_contacts
  FOR UPDATE
  TO authenticated
  USING (rep_id = auth.uid())
  WITH CHECK (rep_id = auth.uid());

CREATE POLICY "contacts: delete own"
  ON public.localist_contacts
  FOR DELETE
  TO authenticated
  USING (rep_id = auth.uid());