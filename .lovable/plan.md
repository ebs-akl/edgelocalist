1. Confirm the real failure point
- Treat this as a post-login failure, not a password-auth failure.
- The browser/network logs already show password login succeeds with HTTP 200 against Supabase Auth.
- The actual blocker is the follow-up `localist-check-subscription` edge function call returning 500, which prevents the app from completing the authenticated flow cleanly.

2. Fix edge-function JWT verification to use the correct Supabase project
- Update `supabase/functions/localist-check-subscription/index.ts` so JWT verification prefers the edge runtime’s connected-project values (`SUPABASE_URL` + publishable/anon key) before any legacy `VITE_*` secrets.
- Apply the same fix to `localist-create-checkout` and `localist-customer-portal`, because they currently use the same auth-client pattern and would fail later for the same reason.
- Add lightweight logging of which auth host is being used (host only, no secrets) so future JWT mismatches are diagnosable from logs.

3. Remove the legacy hybrid-auth assumption from these functions
- The repo memory still references an older dual-project setup, but the current connected Supabase project is `uemcenvotzcebbyiypju` and the frontend is authenticating there.
- Refactor these functions so they no longer prioritize stale `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` values that may still point at an old project.
- If needed, clean up outdated function secrets after the code fix so future deployments cannot regress.

4. Validate the full login path after the fix
- Re-test sign-in in preview.
- Confirm `localist-check-subscription` returns 200 instead of 500.
- Verify the app lands on the correct next screen after auth (dashboard for active subscribers, pricing/home for non-subscribers).
- Smoke-test checkout and billing portal auth paths to confirm the same JWT issue is gone there too.

5. Optional cleanup while touching the flow
- Fix the noisy `ref` warnings coming from the landing/sheet dialog components if they still appear after the auth issue is resolved. They are not the login blocker, but they add noise during debugging.

Technical details
- Evidence gathered:
  - `POST /auth/v1/token` succeeds with 200 for the working password attempt.
  - `get_my_rep_profile` succeeds immediately after login.
  - `POST /functions/v1/localist-check-subscription` fails with `unrecognized JWT kid ... ES256`.
  - Edge logs show the error occurs inside `localist-check-subscription` during `auth.getClaims(token)`.
- Most likely root cause:
  - The edge functions are verifying the JWT against the wrong JWKS endpoint because they currently prioritize `VITE_SUPABASE_URL`; that secret likely still reflects an older project from the previous hybrid setup.
- Files to update:
  - `supabase/functions/localist-check-subscription/index.ts`
  - `supabase/functions/localist-create-checkout/index.ts`
  - `supabase/functions/localist-customer-portal/index.ts`

<lov-actions>
<lov-link url="https://supabase.com/dashboard/project/uemcenvotzcebbyiypju/functions/localist-check-subscription/logs">Check subscription function logs</lov-link>
<lov-link url="https://supabase.com/dashboard/project/uemcenvotzcebbyiypju/settings/functions">Edge Function secrets</lov-link>
</lov-actions>