

# Fix GHL OAuth Token Storage: Replace Upsert with SELECT + UPDATE/INSERT

## Problem
The `upsert` on `localist_reps` fails because the table's `id` column has no default value. When upserting a new row, Postgres tries to insert with `id = null`, violating the not-null constraint.

## Solution
Replace the single `upsert` call (lines 119-135 of `ghl-oauth-callback/index.ts`) with a two-step pattern:

1. **SELECT** to check if a row with the given `ghl_location_id` already exists
2. **UPDATE** that row if found, or **INSERT** a new row with `crypto.randomUUID()` as the `id` if not

### Changes to `supabase/functions/ghl-oauth-callback/index.ts`

Replace the upsert block (approximately lines 119-135) with:

```typescript
// 1. Check if this location already exists
const { data: existingRow } = await supabaseAdmin
  .from("localist_reps")
  .select("id")
  .eq("ghl_location_id", locationId)
  .maybeSingle();

const tokenPayload = {
  ghl_location_id: locationId,
  ghl_access_token: access_token,
  ghl_refresh_token: refresh_token ?? null,
  ghl_expires_at: expiresAt,
  subscription_tier: "edgedms",
};

let saveError;
if (existingRow) {
  // 2a. UPDATE existing row
  const { error } = await supabaseAdmin
    .from("localist_reps")
    .update(tokenPayload)
    .eq("id", existingRow.id);
  saveError = error;
} else {
  // 2b. INSERT new row with generated UUID
  const { error } = await supabaseAdmin
    .from("localist_reps")
    .insert({ ...tokenPayload, id: crypto.randomUUID() });
  saveError = error;
}

if (saveError) {
  console.error("DB save error:", saveError);
  return new Response(JSON.stringify({ error: "Failed to save credentials" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

Everything else in the function (CORS, token exchange, authenticated-user linking, error handling) stays the same.

### Files Modified
- `supabase/functions/ghl-oauth-callback/index.ts` -- replace upsert block with SELECT + UPDATE/INSERT pattern

### No Migration Needed
The unique constraint on `ghl_location_id` from the previous migration is still useful for data integrity but is no longer required for the save logic itself.

