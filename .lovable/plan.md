

## Add County Field from Mapbox Geocoding

### Goal
Capture the county name during geocoding so it can later be used in EDGEDMS for county-by-county marketing filters.

### What changes

**1. Database Migration**
- Add `county text` column to `localist_contacts`
- Update the 4 paginated/authenticated nearby RPCs to include `county` in their SELECT lists:
  - `nearby_contacts_page` — add `c.county`
  - `nearby_contacts_page_auth` — add `c.county`
  - `nearby_contacts_service` — add `c.county`
  - `nearby_contacts` — add `c.county`

**2. Edge Function — `localist-geocode-contacts/index.ts`**
- Change `geocodeAddress` return type from `{ lat, lng }` to `{ lat, lng, county }`
- After getting the Mapbox response, parse `data.features[0].context` for the entry whose `id` starts with `"district."` and extract its `text` value (e.g. "Los Angeles County")
- Write `county` to the database alongside `latitude`/`longitude` in the `.update()` call

**3. Frontend Types — `src/lib/contacts.ts`**
- Add `county?: string | null` to `LocalistContact` and `NearbyContact` interfaces

**4. Frontend Display — `SearchTab.tsx`**
- Show county in the contact list rows (below city/state line)

**5. Frontend Display — `ContactDetailModal.tsx`**
- Show county in the address block when present

### What does NOT change
- `localist-nearby-search` edge function — no changes needed; it calls the RPCs which will now include `county`
- `ContactMapView.tsx` — map markers are lightweight (no county)
- `nearby_map_markers` / `nearby_map_markers_auth` RPCs — lightweight, no county needed
- `CsvUploadTab.tsx` — CSV upload doesn't set county; it gets populated during geocoding
- `smart_upsert_ghl_contacts` RPC — GHL sync doesn't provide county; geocoding fills it in afterward
- Dashboard stats, Group SMS, Tag Contacts — all unchanged

### Note on existing data
Contacts already geocoded will have `county = NULL`. A CSV re-upload or GHL re-sync that triggers geocoding will populate the field for those contacts. Alternatively, a one-time backfill could re-geocode contacts that have coordinates but no county.

