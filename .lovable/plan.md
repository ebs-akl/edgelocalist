

# Make Rep Number an Immutable Unique Identifier

## Overview

The Cutco rep number will become a required, immutable, unique identifier for each representative. Once set during signup, it cannot be changed. This ensures airtight data isolation -- no rep can access another rep's contacts because their identity is permanently tied to their 8-digit rep number.

## What Changes

### 1. Database: Add UNIQUE constraint on `rep_number`

Add a unique constraint to the `localist_reps.rep_number` column so no two reps can share the same number. Currently there are no duplicates in the database, so this is safe to apply.

### 2. Signup: Make rep number required

The signup form currently treats the rep number as optional. It will become a **required field** during account creation. The form will:
- Validate it is exactly 8 digits
- Check against the database for uniqueness before submitting (via a quick query)
- Show a clear error if the number is already taken

### 3. Settings: Make rep number read-only

The Settings page currently allows editing the rep number. Once set, it will be displayed as **read-only text** (no edit button). This prevents a rep from changing their number to impersonate another rep.

### 4. Database trigger: Prevent updates to `rep_number`

A Postgres trigger will be added to the `localist_reps` table that rejects any `UPDATE` that attempts to change `rep_number` once it has been set. This is a server-side safety net -- even if someone bypasses the UI, the database itself will block the change.

---

## Technical Details

### Migration SQL

```sql
-- 1. Unique constraint
ALTER TABLE public.localist_reps
  ADD CONSTRAINT localist_reps_rep_number_unique UNIQUE (rep_number);

-- 2. Immutability trigger
CREATE OR REPLACE FUNCTION public.prevent_rep_number_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.rep_number IS NOT NULL
     AND NEW.rep_number IS DISTINCT FROM OLD.rep_number THEN
    RAISE EXCEPTION 'rep_number cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_rep_number
  BEFORE UPDATE ON public.localist_reps
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_rep_number_change();
```

### Frontend Changes

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Make `repNumber` required on signup; add uniqueness check before submit |
| `src/pages/Settings.tsx` | Remove edit button/logic for rep number; display as static text |

### What stays the same

- Login flow (email + password) -- unchanged
- RLS policies -- already enforce `rep_id = auth.uid()` isolation
- The Account Merge Handshake -- continues to use `rep_number` as the bridge
- GHL SSO flow -- unaffected

