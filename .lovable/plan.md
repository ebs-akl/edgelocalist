

## Auto-Backfill Counties During "Refresh GHL Contacts"

### Problem
The geocoding step in "Refresh GHL Contacts" only targets contacts where `latitude IS NULL`. Contacts already geocoded before the county feature was added get skipped — they have coordinates but `county = NULL`.

### Solution
After the existing geocoding loop finishes (which handles contacts without coordinates), add a second loop in `Dashboard.tsx` that calls the same `localist-geocode-contacts` function with a `backfill_county: true` flag. The edge function will handle this flag by querying contacts that have coordinates but no county, re-geocoding them, and writing only the county.

### Changes

**1. Edge Function — `localist-geocode-contacts/index.ts`**
- Add a check for `body.backfill_county === true`
- When true, change the query to select contacts where `latitude IS NOT NULL` AND `county IS NULL` (instead of `latitude IS NULL`)
- In the update step for backfill mode, write only `county` (preserving existing lat/lng)
- The `remaining` count query also switches to the same filter

**2. Frontend — `Dashboard.tsx` (sync flow, ~lines 132-166)**
- After the existing geocoding loop completes, add a second loop that calls `localist-geocode-contacts` with `{ backfill_county: true, limit: 500 }`
- Update the progress step detail text to indicate county backfill progress (e.g., "Populating county data for 42 contacts...")
- Loop until `remaining === 0` or `geocoded === 0`, same pattern as the existing loop

### What does NOT change
- The edge function's normal geocoding flow (contacts without coordinates) is untouched
- No database migration needed — `county` column already exists
- No changes to the nearby-search RPCs, map markers, or other edge functions

