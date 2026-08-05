# Fix: ZIP/address search returns "no customers found"

## What's actually wrong

The data is fine. For your account there are 8,245 contacts, 5,603 of them geocoded, and a direct database check around the Canton, OH area returns **526 contacts within 5 miles** and **2,183 within 25 miles**. So the contacts, coordinates, and radius math all work.

The break is in the search path. When you type a ZIP code or address, the app sends the search to the server function `localist-nearby-search`, which geocodes the ZIP (that step succeeds — the logs show it resolving to the right coordinates) and then asks the database for nearby contacts.

During the recent security hardening, the two database search functions the server calls (`nearby_contacts_page` and `nearby_map_markers`) had an extra ownership check bolted on that compares the requested rep against the *logged-in browser user*. The server function is not a browser user — it runs with a backend service identity — so that check can never pass, and the query silently returns zero rows. No error, no crash: just "no customers found" for every ZIP, at every radius.

The GPS / "current location" path in standalone mode uses different functions (`..._auth`) that were left intact, which is why the failure looks inconsistent.

## The fix

1. Add two backend-only search functions that keep the ownership rules where they belong (the server already verifies who the caller is before calling them):
   - `nearby_contacts_page_service(rep, center_lat, center_lng, radius_miles, p_limit, p_offset)`
   - `nearby_map_markers_service(rep, center_lat, center_lng, radius_miles)`

   Both mirror the existing `nearby_contacts_service` pattern: `SECURITY DEFINER`, filtered strictly by the `rep` passed in, `EXECUTE` granted **only** to `service_role` (revoked from `anon` and `authenticated`), so the browser can never call them directly with someone else's rep id.

2. Point `supabase/functions/localist-nearby-search/index.ts` at the new `_service` functions instead of `nearby_contacts_page` / `nearby_map_markers`. Its existing auth remains unchanged — it still resolves the rep from either the verified GHL SSO payload or the Bearer token, and only ever passes that resolved rep id.

3. Add result-count logging to the function (`rep`, center, radius, rows returned) so a zero-result search is diagnosable from logs instead of invisible.

4. Leave the browser-facing `nearby_contacts_page_auth` / `nearby_map_markers_auth` exactly as they are — their `auth.uid()` check is correct there.

## Verification

- Run the ZIP search that's failing and confirm results come back at 5 / 10 / 25 miles.
- Confirm the map view populates markers for the same search.
- Confirm pagination past page 1 still works.
- Re-check that a browser session cannot execute the new `_service` functions.

## Note, separate from this bug

Two accounts in the shared database have **zero** geocoded contacts (16,000 and 15,206 contacts, none with coordinates). Those reps will legitimately find nothing until geocoding runs for them. Not part of this fix, but worth queuing next.

## Security impact

No loosening. The ownership check moves from an ineffective place (inside a function the backend calls, where it can only ever fail) to the correct one: the edge function's verified caller identity, plus `service_role`-only execute grants on the new functions.
