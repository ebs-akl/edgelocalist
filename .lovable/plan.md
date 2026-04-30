## Goal

Make LocaList read its own GHL Marketplace credentials from per-app secrets so that updating Alomar or Cooky keys can never silently break LocaList (and vice versa).

## Changes

### 1. Edge function code edits (hard switch — no fallback)

| File | Change |
|---|---|
| `supabase/functions/localist-sso-verify/index.ts` | Read **only** `GHL_SSO_KEY_LOCALIST` (drop `GHL_SSO_KEY` and `VITE_GHL_SHARED_SECRET`) |
| `supabase/functions/localist-oauth-callback/index.ts` | Read `GHL_CLIENT_ID_LOCALIST` and `GHL_CLIENT_SECRET_LOCALIST` |
| `supabase/functions/localist-get-auth-url/index.ts` | Read `GHL_CLIENT_ID_LOCALIST` |
| `supabase/functions/_shared/ghl-refresh-token.ts` | Read `GHL_CLIENT_ID_LOCALIST` and `GHL_CLIENT_SECRET_LOCALIST` |

### 2. Untouched (intentionally)

The 11 functions that read `GHL_SSO_KEY` for **internal HMAC signing** (`fetch-contacts`, `tag-contacts`, `group-sms`, `lc-call`, `list-phone-numbers`, `merge-contacts`, `nearby-search`, `push-counties`, `set-custom-value`, `sync-contacts`, `geocode-contacts`) — these are app‑internal request signatures, not the GHL Marketplace SSO key. They keep using `GHL_SSO_KEY` and continue to work unchanged.

### 3. Secrets to set in Supabase

I'll prompt you to add three new secrets:

- `GHL_SSO_KEY_LOCALIST` — the LocaList Marketplace App **SSO key** (the one you regenerated)
- `GHL_CLIENT_ID_LOCALIST` — the LocaList Marketplace App **Client ID**
- `GHL_CLIENT_SECRET_LOCALIST` — the LocaList Marketplace App **Client Secret**

The old `GHL_SSO_KEY`, `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, and `VITE_GHL_SHARED_SECRET` secrets stay in Supabase (other LocaList functions still use `GHL_SSO_KEY` for HMAC; Alomar/Cooky may still use the OAuth ones). We just stop reading them from the four files above.

### 4. Verify

- I'll redeploy the four affected edge functions.
- You reload AKL LocaList inside HighLevel.
- I'll pull `localist-sso-verify` logs and confirm `✅ SSO verified + session provisioned` instead of `Decryption failed`.

### 5. Memory

Save a project memory noting: **LocaList GHL Marketplace credentials use the `*_LOCALIST` suffixed secret names. Internal HMAC signing still uses `GHL_SSO_KEY` (do not rename).**
