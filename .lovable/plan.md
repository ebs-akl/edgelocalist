

## LocaList System Audit — Findings & Issues

### System Status Overview

```text
SYSTEM                          STATUS      ISSUE?
─────────────────────────────── ─────────── ──────
1. Auth (Login/Signup/Magic)    WORKING     YES — minor
2. Subscription Gate            WORKING     YES — CRITICAL
3. Stripe Checkout              WORKING     OK
4. Stripe Webhook (lifecycle)   WORKING     YES — CRITICAL
5. Stripe Check-Subscription    WORKING     OK
6. Customer Portal (billing)    WORKING     OK
7. GHL SSO / Iframe Mode        WORKING     OK
8. GHL Sync + Geocoding         WORKING     OK
9. Group SMS + Tag Contacts     WORKING     OK
10. Nearby Search               WORKING     OK
11. CSV Upload                  WORKING     OK
12. Inactivity Timeout          WORKING     OK
13. Settings Page               WORKING     YES — minor
14. Landing / Pricing           WORKING     OK
```

---

### CRITICAL: Tier Name Mismatch Between Webhook and Frontend

The `localist-stripe-webhook` writes these tier names to `localist_reps.subscription_tier`:

- `"Standalone"` (for prod_U3ouP5GYR2UtCT)
- `"Snack Pack"` (for prod_U3ovoEBZGIHGd6)
- `"EdgeDMS"` (for prod_TT1lDpEK83RxB1)

But the frontend `ProtectedRoute.tsx` and `stripe-tiers.ts` expect:

- `"LOCALIST"`
- `"SNACK PACK"`
- `"EDGE BASIC"`

**Impact**: When a user subscribes, the webhook writes `"Standalone"` to the DB, but `tierFromProductId()` returns `"LOCALIST"`. The subscription gate currently works because it relies on the **live Stripe check** (`localist-check-subscription`), not the DB column. However, the DB column is now permanently wrong for any future cross-app ecosystem gating.

**Fix**: Update `TIER_NAMES` in `localist-stripe-webhook/index.ts` to match the frontend tier keys:
```
prod_U3ouP5GYR2UtCT → "LOCALIST"
prod_U3ovoEBZGIHGd6 → "SNACK PACK"
prod_TT1lDpEK83RxB1 → "EDGE BASIC"
```

---

### Issue 2: Auth Signup Writes Stale Tier

In `Auth.tsx` line 69, new signups upsert `subscription_tier: 'standalone'` into `localist_reps`. This is a legacy value that doesn't match any valid tier. The `handle_new_user` trigger already creates the row, so this upsert overwrites it with a non-standard value.

**Fix**: Remove `subscription_tier: 'standalone'` from the signup upsert, or change it to `null` (no plan yet).

---

### Issue 3: AuthContext RepProfile Type is Stale

`AuthContext.tsx` line 12 defines `subscription_tier: 'standalone' | 'edgedms' | null` — these are old tier names. Should be updated to `string | null` or the actual tier union.

**Fix**: Change to `subscription_tier: string | null` since it's informational and the real gate uses the Stripe check.

---

### Issue 4: Settings Page "Upgrade" Link is Dead

`Settings.tsx` line 16: `const UPGRADE_URL = "#"` — the "Upgrade To EdgeDMS" button links nowhere.

**Fix**: Change to `/#pricing` or trigger `handleCheckout("EDGE BASIC")`.

---

### Summary of Required Fixes

1. **CRITICAL** — `localist-stripe-webhook`: Change `TIER_NAMES` values to `"LOCALIST"`, `"SNACK PACK"`, `"EDGE BASIC"`
2. **Medium** — `Auth.tsx`: Remove or null out `subscription_tier: 'standalone'` in signup upsert
3. **Low** — `AuthContext.tsx`: Update `RepProfile.subscription_tier` type to `string | null`
4. **Low** — `Settings.tsx`: Fix dead upgrade URL to `/#pricing`

### Everything Else is Production-Ready

- Stripe signature validation, checkout flow, billing portal — all solid
- GHL SSO handshake, sync, geocoding, Group SMS, LC Call, tagging — all working
- Subscription gate correctly bypasses iframe/GHL users
- Inactivity timeout respects "Keep me signed in"
- RLS policies properly isolate rep data
- All required secrets are configured
- `config.toml` has all edge functions registered

