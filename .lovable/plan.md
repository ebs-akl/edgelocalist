

## Problem

The county push function is sending API calls to GHL for contacts that don't have valid GHL IDs. The database shows:
- 225 contacts pushed successfully
- 4,404 contacts with valid 20-char GHL IDs still waiting
- 589 contacts with invalid numeric CSV-generated IDs (e.g., `3303340275`) that will always fail with "Contact not found"

The function fetches 100 contacts per round without filtering out invalid IDs. It burns through its entire batch on contacts that can never succeed, then reports `pushed=0` and the dashboard loop breaks on `pushData.pushed === 0`.

## Fix

Two changes to `supabase/functions/localist-push-counties/index.ts`:

1. **Filter query**: Add a regex filter to only select contacts with valid GHL contact IDs (20-char alphanumeric). This ensures every API call goes to a real GHL contact.

2. **Mark stale contacts**: After the push loop, update all contacts with invalid (non-GHL) contact IDs to `county_pushed = true` so they stop appearing in the "remaining" count. These contacts exist only locally and can never be pushed to GHL.

One change to `src/pages/Dashboard.tsx`:

3. **Fix the loop exit**: The dashboard currently breaks when `pushed === 0`, but this can happen on the first round if the function was processing stale IDs. After the fix the loop should work correctly since only valid contacts will be selected, but also increase `MAX_ROUNDS` to handle the 4,400+ valid contacts at 100 per round (need ~44+ rounds).

### Technical detail

In the edge function query (line 247-254), add a filter:
```sql
.like("contact_id", "____________________")  -- 20 chars
```
Or better, use a length check since Supabase JS doesn't support regex filters well — filter in code after fetch, or use `.gte("contact_id", "a")` heuristic. The cleanest approach: after fetching, filter the array to only contacts where `contact_id` matches `/^[a-zA-Z0-9]{20}$/`, and bulk-mark the rest as `county_pushed = true` so they don't recur.

Also mark all 589 invalid-ID contacts as pushed in a one-time cleanup within the function.

### Files to change
- `supabase/functions/localist-push-counties/index.ts` — filter valid GHL IDs, mark invalid ones
- `src/pages/Dashboard.tsx` — increase MAX_ROUNDS to ~60

