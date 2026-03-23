

## Reduce Geocoding Batch Size to 50

### Problem
Counties aren't populating during the backfill step. Possible causes: Mapbox rate limits being hit with 50 concurrent requests per batch and 500 total per invocation, or edge function timeouts.

### Changes

**1. Edge Function — `localist-geocode-contacts/index.ts`**
- Reduce `BATCH_SIZE` from 50 to 10 (concurrent Mapbox calls per batch)
- Increase `DELAY_MS` from 250 to 500 (more breathing room between batches)
- Add `console.log` statements to track progress: log the number of contacts found, geocoded results, and any errors — this will help us diagnose if the issue is in fetching, geocoding, or updating

**2. Frontend — `Dashboard.tsx`**
- Change the backfill invocation limit from 500 to 50 (`body: { backfill_county: true, limit: 50 }`)
- Also change the normal geocoding limit from 500 to 50 for consistency

**3. Redeploy** the edge function after changes

