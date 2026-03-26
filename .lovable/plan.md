

## Fix County Push Reliability Issues

### What I found

**Database state**: 5,218 contacts have county data. 5,216 are marked `county_pushed = true`. Only 2 valid GHL contacts remain stuck — they keep failing silently, causing the loop to report `pushed=0` and break.

**Three problems causing "odd numbers" and "several tries":**

1. **Redundant cleanup every call**: The invalid-ID scan (lines 249-271) fetches 500 records and filters them on every invocation, even after all 589 CSV contacts were already cleaned up on the first call. This wastes time and edge function budget.

2. **The `remaining` count includes contacts that always fail**: The 2 stuck contacts have valid GHL IDs but their PUT requests to HighLevel keep failing (likely deleted/merged contacts in GHL). The dashboard sees `remaining=2`, calls push again, gets `pushed=0`, breaks. Next manual sync attempt repeats the same cycle.

3. **No retry limit per contact**: A contact that always fails (e.g., deleted in GHL) is never marked as pushed, so it blocks the "remaining" count indefinitely.

### Plan

**1. Edge function — `localist-push-counties/index.ts`**

- **Track failed contacts**: When a GHL PUT returns `404` (contact not found / deleted), mark that contact as `county_pushed = true` anyway — the contact doesn't exist in GHL so there's nothing to push. This prevents permanently stuck contacts.
- **Skip redundant cleanup if no invalid IDs found**: Move the cleanup query to only run once by checking a smaller initial sample first, or simply let it run cheaply since it's a no-op after the first pass. (The current approach is acceptable; the real fix is handling 404s.)
- **Log the specific failure status codes** so we can see why the 2 contacts keep failing.

**2. Dashboard — `src/pages/Dashboard.tsx`**

- **Don't break on `pushed === 0` if remaining is small**: If `remaining` is below a threshold (e.g., ≤5) and `pushed === 0`, treat it as complete rather than erroring — those are likely permanently unreachable contacts.
- **Or better**: just let the edge function handle it by marking 404s as pushed (change 1 above), so the dashboard loop naturally completes.

### Files to change
- `supabase/functions/localist-push-counties/index.ts` — mark 404 contacts as `county_pushed = true`
- `src/pages/Dashboard.tsx` — minor: tolerate `pushed=0` when `remaining` is very small

### What stays the same
- No database migration needed
- No changes to geocoding, search, or other edge functions
- The invalid-ID cleanup code stays (harmless after first run)

