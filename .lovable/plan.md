
# Fix GHL OAuth Token Storage

## Problem
The `ghl-oauth-callback` Edge Function fails to save tokens because:
1. The unauthenticated path uses `.update()` which can't insert new rows
2. `ghl_expires_at` is never calculated or stored
3. There's no unique constraint on `ghl_location_id`, which is required for `upsert({ onConflict: 'ghl_location_id' })`

## Solution

### Step 1: Database Migration
Add a unique constraint on `localist_reps.ghl_location_id` so the upsert can match on it:
```sql
ALTER TABLE public.localist_reps
  ADD CONSTRAINT localist_reps_ghl_location_id_key UNIQUE (ghl_location_id);
```

### Step 2: Rewrite the DB save logic in `ghl-oauth-callback`
Replace the current two-path update logic (lines 116-168) with a single, simplified upsert using the service role key:

- Extract `expires_in` from the GHL token response
- Calculate `ghl_expires_at` as `new Date(Date.now() + expires_in * 1000).toISOString()`
- Upsert into `localist_reps` matching on `ghl_location_id`:

```typescript
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const expiresAt = tokenData.expires_in
  ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
  : null;

const { error: upsertError } = await supabaseAdmin
  .from("localist_reps")
  .upsert({
    ghl_location_id: locationId,
    ghl_access_token: access_token,
    ghl_refresh_token: refresh_token ?? null,
    ghl_expires_at: expiresAt,
    subscription_tier: "edgedms",
  }, { onConflict: "ghl_location_id" });
```

- If the request includes an Authorization header with a valid user, also update that user's row by `id` so the authenticated user's record gets linked.
- All responses (success, error, catch) already include `corsHeaders` -- this will be preserved.

### Step 3: Redeploy
The Edge Function will be automatically redeployed after the code change.

---

## Technical Details

**Files modified:**
- `supabase/functions/ghl-oauth-callback/index.ts` -- rewrite DB logic (lines 116-168)
- New migration -- add unique constraint on `ghl_location_id`

**What stays the same:**
- Token exchange with GHL API (lines 60-114)
- CORS headers and OPTIONS handling
- Input validation
- Error logging and transparent error responses

**Edge case:** If a user is authenticated AND installing from GHL, we do both: upsert by `ghl_location_id` and update by user `id`, ensuring both paths are covered.
