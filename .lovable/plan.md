## Goal
Determine why all 5 candidate SSO keys fail to decrypt even after rotating `GHL_SSO_KEY_LOCALIST` in Supabase. We need to confirm whether the secret you pasted actually landed in the right slot, and whether it differs from the other slots.

## Change
Edit `supabase/functions/localist-sso-verify/index.ts`:

1. After loading candidate keys, log a **safe fingerprint** for each:
   - `name`
   - `length`
   - `first4` + `last4` characters
   - `sha256` (first 12 hex chars) — so identical values across slots are obvious
   - `hasWhitespace` boolean (catches stray space/newline from paste)

   Example log line:
   ```
   Key GHL_SSO_KEY_LOCALIST: len=44 first=ab12 last=xy90 sha256=3f2a91b… ws=false
   ```

2. Also log a fingerprint of the incoming payload's first 16 chars so we can correlate which encryption attempt corresponds to which secret-rotation moment.

3. No secret values are ever logged in full — only length, edges, and a one-way hash. Safe to leave on while debugging.

## Expected outcome
Next SSO attempt will produce a log block like:
```
Key GHL_SSO_KEY_LOCALIST: len=44 first=q7Aa last=Pp2= sha256=9c4e… ws=false
Key GHL_SSO_KEY_ALOMAR:   len=64 first=8f3K last=zZ0= sha256=a118… ws=false
...
```

You then verify in GHL Marketplace → LocaList → SSO that the Shared Secret's length and first/last 4 chars match `GHL_SSO_KEY_LOCALIST`. If they don't, the rotation didn't reach the right slot. If they do, the GHL app itself is encrypting with a stale/different secret — at which point we open a Marketplace support ticket.

## Files
- `supabase/functions/localist-sso-verify/index.ts` — add fingerprint helper + one log block; no behavior changes.

After approval I'll deploy the update; then trigger a fresh SSO load and re-check logs.
