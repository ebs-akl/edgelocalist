

## Problem

Josh Sicchitano (`jsicchitano@vectormarketing.com`) is authenticated but stuck on the landing page. The `localist-check-subscription` edge function logs confirm:

```
[CHECK-SUBSCRIPTION] No Stripe customer found
```

He has no Stripe customer record, so the function returns `{ subscribed: false }`. The `ProtectedRoute` subscription gate then redirects him to `/#pricing` because `subscription.tier` is `null`.

Additionally, his `localist_reps` row doesn't exist on the kimyzwmniidwnixezqdi instance (this project queries that DB), but may exist on the shared ALOMAR instance (dhbhbyspjicomowgluyb) that edge functions use.

## Root Cause

The subscription check **only** queries Stripe. If a user has no Stripe customer record (e.g., manually provisioned, legacy user, or different billing email), they are permanently locked out.

## Fix: Add DB Fallback in `localist-check-subscription`

When Stripe returns no customer **or** no active subscription, check `localist_reps.subscription_tier` as a fallback. If the DB has a valid tier (matching one of `LOCALIST`, `SNACK PACK`, `EDGE BASIC`, or legacy values like `edgedms`, `standalone`), return `subscribed: true` with that tier mapped to a product-like identifier.

### Changes

**1. `supabase/functions/localist-check-subscription/index.ts`**

After the "No Stripe customer found" block (line 45-51), add a DB fallback:
- Query `localist_reps` by `user.id` for `subscription_tier`
- If a recognized tier exists (`edgedms`, `standalone`, `LOCALIST`, `SNACK PACK`, `EDGE BASIC`), return `subscribed: true` with a synthetic product ID mapped from the tier
- Define a `DB_TIER_TO_PRODUCT` map that converts DB tier values to product IDs that `tierFromProductId` already recognizes
- This ensures legacy users and manually provisioned users pass the gate

**2. Redeploy the edge function** (automatic)

### Tier Mapping (DB → Product ID)

```text
DB Value        → Product ID           → Frontend Tier
"edgedms"       → prod_TT1lDpEK83RxB1  → EDGE BASIC
"standalone"    → prod_U3ouP5GYR2UtCT  → LOCALIST
"LOCALIST"      → prod_U3ouP5GYR2UtCT  → LOCALIST
"SNACK PACK"    → prod_U3ovoEBZGIHGd6  → SNACK PACK
"EDGE BASIC"    → prod_TT1lDpEK83RxB1  → EDGE BASIC
```

This is backward-compatible — users with active Stripe subscriptions still use the Stripe path. The DB fallback only activates when Stripe has no record.

