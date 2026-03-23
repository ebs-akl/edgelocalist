

## Push County Data Back to GHL (EdgeDMS)

### Problem
The geocoding step populates the `county` column in the local `localist_contacts` database, but never writes it back to GoHighLevel. The geocode edge function doesn't have access to GHL credentials, so there's no mechanism to update the CRM contact records with county data.

### Solution
Add a new step after geocoding that pushes county values to GHL contacts via the GHL `PUT /contacts/:id` API using a custom field (e.g., `contact.county`). This will be a new edge function to keep concerns separated.

### Changes

**1. New Edge Function — `localist-push-counties/index.ts`**
- Auth: same SSO/Bearer pattern as other functions
- Fetches GHL access token from `localist_reps` (with auto-refresh)
- Queries `localist_contacts` for records where `county IS NOT NULL` and `contact_id IS NOT NULL` that haven't been pushed yet (we'll add a `county_pushed` boolean column or compare against GHL)
- Discovers/creates a "County" custom field in GHL via the `GET /locations/:id/customFields` + `POST` endpoints
- Batches `PUT /contacts/:id` calls to write the county custom field value
- Accepts `limit` parameter, returns `{ pushed, remaining }`

**2. Database Migration**
- Add `county_pushed boolean DEFAULT false` to `localist_contacts` — tracks which contacts have had their county synced to GHL
- After a successful push, set `county_pushed = true`
- Reset to `false` when county changes (via trigger or in the geocode update)

**3. Frontend — `Dashboard.tsx`**
- Add a Step 4c after county backfill that calls the new function in a loop (same pattern as geocoding)
- Progress text: "Syncing county data to EdgeDMS... X pushed, Y remaining"
- Loop until `remaining === 0` or `pushed === 0`

### Alternative: Simpler approach without new column
Instead of tracking `county_pushed`, we could query contacts where `county IS NOT NULL AND contact_id IS NOT NULL` and always push. This is simpler but does redundant writes on subsequent syncs. Given the user likely wants a one-time backfill + ongoing sync, the `county_pushed` flag is cleaner.

### What does NOT change
- Existing geocoding logic
- Nearby search, map markers, or other RPCs
- Webhook update flow

