
Goal: get county sync actually working in HighLevel by fixing the current runtime blockers, not redoing the earlier scope change.

What I found
- The OAuth URL already includes the needed HighLevel custom-field scopes, so the auth-url code is no longer the missing piece.
- The current `localist-push-counties` function still uses incomplete CORS headers:
  - it only allows `authorization, x-client-info, apikey, content-type`
  - your app is sending extra `x-supabase-client-*` headers
  - this matches the browser error: preflight blocked before the function can respond cleanly
- The same function is also still using the old single-client auth pattern:
  - it validates Bearer tokens with the shared DB client
  - this project uses split Supabase auth/database config
  - that pattern is already known to break in this codebase
- Your logs show two separate blockers:
  1. `403` from HighLevel: existing token is missing custom-field permissions
  2. browser CORS failure: the function cannot be called reliably from `localist.edgedms.com`

Plan
1. Fix `localist-push-counties` CORS handling
- Update its `corsHeaders` to match the full header set already used by working functions.
- Keep the OPTIONS handler and make sure every response path includes those headers.
- This should remove the browser preflight failure and let the frontend receive the real function response.

2. Fix `localist-push-counties` auth for this split Supabase setup
- Refactor it to use the same dual-client pattern as `localist-check-subscription`:
  - auth client = local project URL + anon key for JWT verification
  - DB client = shared `SUPABASE_URL` + service role for reads/writes
- Use the auth client only for `getUser(token)`.
- Use the service-role client for `localist_reps` and `localist_contacts`.

3. Preserve GHL-mode compatibility in the dashboard
- Update the dashboard sync step to pass `sso_payload` when available in iframe/GHL mode.
- Keep Bearer auth support for standalone mode.
- This gives the county push flow the same resilient auth path used elsewhere in the app.

4. Improve county-push failure reporting
- Keep the existing HighLevel permission error message, but ensure it reaches the UI after the CORS fix.
- If GHL returns `401/403`, surface the exact reconnect instruction instead of generic “County sync failed.”

5. Validate the full path after implementation
- Confirm the browser no longer shows a preflight/CORS error for `localist-push-counties`.
- Confirm the function either:
  - successfully finds/creates the County field and starts incrementing `county_pushed`, or
  - returns the explicit reconnect-required error from HighLevel.
- If the reconnect error remains after CORS/auth fixes, the remaining action is operational, not code-related: disconnect and reconnect HighLevel so the existing token gets the new scopes.

Files to update
- `supabase/functions/localist-push-counties/index.ts`
- `src/pages/Dashboard.tsx`

What should not change
- No database migration needed.
- No change needed to `localist-get-auth-url` unless I find the deployed code differs from the repo.
- No geocoding logic changes.

Technical notes
- The repo already confirms `localist-get-auth-url` includes:
  - `locations/customFields.readonly`
  - `locations/customFields.write`
- The repo also confirms `localist-push-counties` is still missing the full required CORS allow-header list and still uses the old auth pattern.
- So the best implementation is to fix the function call reliability first, then let the real HighLevel permission state surface clearly.
