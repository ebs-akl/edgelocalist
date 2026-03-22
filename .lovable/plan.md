

## Overhaul Search Results: Server-Side Pagination + Lightweight Map Data

### Problem
The spatial RPCs return all matching rows (potentially thousands) as full records in a single payload. This risks edge function timeouts, large JSON transfers, and browser performance issues when rendering the list.

### Architecture

```text
Client Search Request
        │
        ├──► RPC: nearby_contacts_page (limit 50, offset N)
        │     → Full contact records for list view + total_count via window fn
        │
        └──► RPC: nearby_map_markers
              → Lightweight: id, lat, lng, lifetime_value only (ALL matches)
```

Both standalone and GHL modes will make two parallel queries. The edge function will call both RPCs and return `{ paginatedContacts, totalCount, mapMarkers, center_lat, center_lng }`.

---

### 1. Database Migration — Two new RPC functions

**`nearby_contacts_page`** (SECURITY DEFINER, for service-role usage):
- Same spatial query as `nearby_contacts_service` but adds `LIMIT p_limit OFFSET p_offset`
- Adds `total_count bigint` column via `count(*) OVER()` window function
- Returns: all existing columns + `total_count`

**`nearby_contacts_page_auth`** (for standalone/authenticated usage):
- Same as above but with `rep = auth.uid()` guard (like `nearby_contacts`)

**`nearby_map_markers`** (SECURITY DEFINER):
- Same spatial WHERE clause
- Returns ONLY: `id, latitude, longitude, lifetime_value, distance_miles`
- No limit — returns all matches (lightweight ~40 bytes per row vs ~500+)

**`nearby_map_markers_auth`** (authenticated version):
- Same with `auth.uid()` guard

### 2. Edge Function Update — `localist-nearby-search`

After resolving coordinates and repId:
- Call `nearby_contacts_page` with `p_limit` (default 50) and `p_offset` from request body
- Call `nearby_map_markers` (no limit)
- Return: `{ paginatedContacts, totalCount, mapMarkers, center_lat, center_lng }`

### 3. Frontend — `SearchTab.tsx`

**New state:**
- `page` (default 1), `totalCount` (default 0), `mapMarkers` (lightweight array)
- `PAGE_SIZE = 50` constant

**Search flow changes:**
- `runRadiusQuery` and `runServerSearch`: pass `page` and `limit` to edge function / RPC
- Store `paginatedContacts` in `results` (for list), `mapMarkers` separately (for map)
- Store `totalCount` from response
- Reset `page` to 1 on new search, radius change, or category filter change

**List view:** Renders from `results` (already paginated, 50 rows max)

**Pagination controls:** Below the list using existing `Pagination` components:
```
‹ Previous  1  2  3  ...  12  Next ›
```
- Clicking a page triggers a new fetch with updated offset
- Show "Page X of Y" and total count in results summary

**Map view:** Render from `mapMarkers` instead of `results`. Update `ContactMapView` props to accept a lightweight marker type alongside `NearbyContact[]`.

**Category filters + name filter:** Applied client-side to the 50 paginated results. The total count in the header reflects the server total, with a note like "Showing 50 of 347 contacts" and "Page 2 of 7".

**Selection for Group SMS:** Selections are per-page. When navigating pages, selected IDs persist but the checkbox UI reflects the current page.

### 4. `ContactMapView.tsx` Changes

- Accept a new `mapMarkers` prop: `{ id: string; latitude: number; longitude: number; lifetime_value: number | null }[]`
- When `mapMarkers` is provided, use it for GeoJSON source instead of `contacts`
- Popups on unclustered pins will show limited info (LTV + coordinates) since full contact data isn't available — or optionally, clicking a pin could fetch that single contact's detail on demand

### 5. `lib/contacts.ts` — New type

```ts
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  lifetime_value: number | null;
  distance_miles: number;
}
```

### Files Changed
- **New migration** — 4 new RPC functions
- `supabase/functions/localist-nearby-search/index.ts` — dual query + pagination params
- `src/components/dashboard/SearchTab.tsx` — pagination state, dual data handling, pagination UI
- `src/components/dashboard/ContactMapView.tsx` — accept `mapMarkers` prop
- `src/lib/contacts.ts` — `MapMarker` type

### What stays the same
- `localist-fetch-contacts` — unchanged (sync function, not search)
- Dashboard stat card — already uses `count: "exact"`
- Existing `nearby_contacts` / `nearby_contacts_service` RPCs — kept for backward compatibility
- Map clustering — already implemented in Mapbox GL, works with any number of markers

