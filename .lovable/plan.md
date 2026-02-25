

## Plan: Re-point Edge LocaList to Alomar's Supabase + Rename Functions to `localist-*`

### Context

Both projects share a single Supabase instance. Alomar's project has already created the `localist-*` prefixed edge functions on its Supabase instance (`dhbhbyspjicomowgluyb`). Edge LocaList currently points to its own Supabase instance (`kimyzwmniidwnixezqdi`) and uses unprefixed function names (e.g., `ghl-sync-contacts`). We need to re-point LocaList to Alomar's Supabase and rename all function invocations.

### Technical Details

**1. Update Supabase Client (`src/integrations/supabase/client.ts`)**
- Change `SUPABASE_URL` to `https://dhbhbyspjicomowgluyb.supabase.co`
- Change `SUPABASE_PUBLISHABLE_KEY` to Alomar's anon key

**2. Update `.env`**
- `VITE_SUPABASE_PROJECT_ID` → `dhbhbyspjicomowgluyb`
- `VITE_SUPABASE_URL` → `https://dhbhbyspjicomowgluyb.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` → Alomar's anon key

**3. Rename all edge function invocations in frontend code**

| Old Name | New Name | Files |
|----------|----------|-------|
| `ghl-sync-contacts` | `localist-sync-contacts` | `Dashboard.tsx` (×4) |
| `ghl-fetch-contacts` | `localist-fetch-contacts` | (not invoked in frontend) |
| `geocode-contacts` | `localist-geocode-contacts` | `Dashboard.tsx` (×1), `CsvUploadTab.tsx` (×1) |
| `nearby-search` | `localist-nearby-search` | `SearchTab.tsx` (×2) |
| `ghl-tag-contacts` | `localist-tag-contacts` | `TagContactsModal.tsx` (×1) |
| `ghl-group-sms` | `localist-group-sms` | `GroupSmsModal.tsx` (×1) |
| `ghl-lc-call` | `localist-lc-call` | `ContactDetailModal.tsx` (×1) |
| `ghl-merge-contacts` | `localist-merge-contacts` | `Dashboard.tsx` (×1) |
| `ghl-oauth-callback` | `localist-oauth-callback` | `GhlCallback.tsx` (×1) |
| `ghl-sso-verify` | `localist-sso-verify` | `IframeApp.tsx` (×1) |
| `ghl-get-auth-url` | `localist-get-auth-url` | (not invoked in frontend) |

**4. Update `supabase/config.toml`**
- Change `project_id` to `dhbhbyspjicomowgluyb`
- Rename all `[functions.*]` entries to use `localist-*` prefixes

**5. Rename edge function directories under `supabase/functions/`**
- `geocode-contacts/` → `localist-geocode-contacts/`
- `ghl-fetch-contacts/` → `localist-fetch-contacts/`
- `ghl-get-auth-url/` → `localist-get-auth-url/`
- `ghl-group-sms/` → `localist-group-sms/`
- `ghl-lc-call/` → `localist-lc-call/`
- `ghl-merge-contacts/` → `localist-merge-contacts/`
- `ghl-oauth-callback/` → `localist-oauth-callback/`
- `ghl-sso-verify/` → `localist-sso-verify/`
- `ghl-sync-contacts/` → `localist-sync-contacts/`
- `ghl-tag-contacts/` → `localist-tag-contacts/`
- `ghl-webhook-update/` → `localist-webhook-update/`
- `nearby-search/` → `localist-nearby-search/`
- `_shared/` stays as-is (shared utilities)

Each function's `index.ts` content stays the same — only the directory name changes.

**6. No database migration needed**
The tables (`localist_contacts`, `localist_reps`, `sms_rate_limits`) already exist on both instances. The shared DB functions and RLS policies are already in place on Alomar's Supabase.

### Files Changed (summary)
- `src/integrations/supabase/client.ts` — new URL + key
- `.env` — new project ID, URL, key
- `supabase/config.toml` — new project_id + renamed function entries
- `src/pages/Dashboard.tsx` — 5 invoke renames
- `src/pages/GhlCallback.tsx` — 1 invoke rename
- `src/components/IframeApp.tsx` — 1 invoke rename
- `src/components/dashboard/SearchTab.tsx` — 2 invoke renames
- `src/components/dashboard/CsvUploadTab.tsx` — 1 invoke rename
- `src/components/dashboard/GroupSmsModal.tsx` — 1 invoke rename
- `src/components/dashboard/TagContactsModal.tsx` — 1 invoke rename
- `src/components/dashboard/ContactDetailModal.tsx` — 1 invoke rename
- 12 edge function directories renamed (content preserved)

### Risk
- After switching, the old Supabase project's functions will no longer be called. Ensure Alomar's Supabase has all the required secrets (`GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_SSO_KEY`, `GHL_WEBHOOK_SECRET`, `MAPBOX_ACCESS_TOKEN`).
- The GHL webhook URL (used externally) will need updating to point to the new Supabase project's `localist-webhook-update` function with the correct secret.

