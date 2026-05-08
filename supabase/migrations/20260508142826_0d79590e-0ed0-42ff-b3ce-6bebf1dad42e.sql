-- Fix: smart_upsert_ghl_contacts uses ON CONFLICT (rep_id, contact_id) but no such constraint exists.
-- Step 1: Remove duplicate (rep_id, contact_id) rows, keeping the most recently updated.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY rep_id, contact_id
           ORDER BY updated_at DESC NULLS LAST, id
         ) AS rn
  FROM public.localist_contacts
  WHERE contact_id IS NOT NULL AND contact_id <> ''
)
DELETE FROM public.localist_contacts c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Step 2: Add the unique constraint that smart_upsert_ghl_contacts expects.
ALTER TABLE public.localist_contacts
  ADD CONSTRAINT localist_contacts_rep_contact_unique UNIQUE (rep_id, contact_id);