

# Fix: GHL OAuth Callback - Debugging and Error Transparency

## Problem
The edge function returns `undefined` error details to the frontend, and we need better logging to diagnose the 400/401 from GoHighLevel.

## Changes

### 1. Edge Function (`supabase/functions/ghl-oauth-callback/index.ts`)

**Pre-fetch logging** -- Add a `console.log` right before the GHL fetch call showing `client_id`, `grant_type`, `code`, and `redirect_uri` (never the secret).

**Raw text error parsing** -- Read the GHL response as `.text()` first, log it raw, then safely attempt `JSON.parse` to extract `error` and `error_description`. This is partially done already but needs the raw log line added.

**Redirect URI** -- Important note: Using `new URL(req.url).origin + '/callback'` would produce the Supabase functions URL (e.g., `https://kimyzwmniidwnixezqdi.supabase.co/callback`), NOT the registered GHL redirect URI (`https://edgelocalist.app/callback`). This would cause an immediate OAuth mismatch error. The current approach of receiving the redirect_uri from the frontend is correct. However, I will add a hardcoded fallback of `https://edgelocalist.app/callback` so if the frontend omits it, the function still uses the right value.

**Body format** -- Already using `URLSearchParams` and `application/x-www-form-urlencoded`. No change needed here.

### 2. Frontend (`src/pages/GhlCallback.tsx`)

**Better error extraction** -- When `supabase.functions.invoke` returns a non-2xx status, the Supabase client may put the parsed response in `error` rather than `data`. Add handling to extract error details from both paths and log them clearly.

## Files Modified
- `supabase/functions/ghl-oauth-callback/index.ts` -- Add pre-fetch logging, raw response logging, redirect_uri fallback
- `src/pages/GhlCallback.tsx` -- Improve error extraction from both `data` and `error` response paths

