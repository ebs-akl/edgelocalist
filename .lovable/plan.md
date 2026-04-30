## Problem

When you open AKL LocaList from inside HighLevel, the page is stuck on **"Establishing Secure Connection to HighLevel..."** forever.

## Root Cause (confirmed in logs)

Edge function `localist-sso-verify` is being called with the encrypted SSO payload from HighLevel, but every decryption attempt fails:

```
AES decryption attempt failed: Malformed UTF-8 data
Decryption failed for all configured keys. Payload length: 684
```

"Malformed UTF-8 data" after AES decryption is the canonical fingerprint of a **wrong decryption key**. The frontend handshake is working (it captures the payload and posts it), but neither `GHL_SSO_KEY` nor `VITE_GHL_SHARED_SECRET` stored as Supabase Edge Function secrets matches the SSO key currently configured on your GoHighLevel Marketplace App.

This usually happens because:
1. The SSO key was regenerated in the GHL Marketplace App, OR
2. The secret value in Supabase was overwritten / has stray whitespace or quotes, OR
3. The wrong key (e.g., the OAuth client secret) was pasted into `GHL_SSO_KEY`.

## Fix

### Step 1 — Get the current SSO key from GoHighLevel

1. Log in to https://marketplace.gohighlevel.com
2. Open your **AKL LocaList** app
3. Go to **Settings → SSO** (or "Custom Page SSO")
4. Copy the **SSO Key** value exactly (no quotes, no surrounding spaces)

### Step 2 — Update the Supabase secret

I'll prompt you to set `GHL_SSO_KEY` to the value from Step 1. (We'll keep `VITE_GHL_SHARED_SECRET` as a fallback so nothing else breaks.)

### Step 3 — Verify

After the secret is updated, I'll:
1. Re-test the `localist-sso-verify` edge function with a fresh payload to confirm decryption succeeds.
2. Check the function logs for `✅ SSO verified + session provisioned` instead of `Decryption failed`.
3. Ask you to reload AKL LocaList inside HighLevel and confirm the spinner clears and the dashboard loads.

## What this does NOT change

- No code changes are needed. The SSO handshake hook, decryption logic, and user-provisioning logic are all working correctly.
- OAuth (the "Connect GHL" install flow on Settings) is unaffected — that uses different secrets (`GHL_CLIENT_ID` / `GHL_CLIENT_SECRET`) and is healthy.
- Standalone web login (outside the iframe) is unaffected.

## Technical notes

- File involved: `supabase/functions/localist-sso-verify/index.ts` (lines 61–74 read both keys; lines 39–53 attempt AES-decrypt with each).
- The function tries `GHL_SSO_KEY` first, then falls back to `VITE_GHL_SHARED_SECRET`. Both currently fail, so updating either to the correct value will resolve the issue — but `GHL_SSO_KEY` is the canonical name we should keep.
