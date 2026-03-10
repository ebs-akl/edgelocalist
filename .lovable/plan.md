

## Plan: Extend `localist-stripe-webhook` with Subscription Lifecycle Management

### What Changes

**Single file edit:** `supabase/functions/localist-stripe-webhook/index.ts`

### Implementation Details

1. **Add Supabase client** -- import `createClient` from `npm:@supabase/supabase-js@2.57.2`, initialize with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (both already in secrets).

2. **Add a helper function** `updateSubscriptionTier(email, tier)` that updates `localist_reps.subscription_tier` by matching on the `email` column. Logs success/failure.

3. **Extend `checkout.session.completed` handler** -- after sending the confirmation email, call `updateSubscriptionTier(customerEmail, tierName)` to persist the active tier (Standalone / Snack Pack / EdgeDMS) in the database.

4. **Add `customer.subscription.deleted` handler** -- extract customer ID from the event, look up customer email via Stripe API, call `updateSubscriptionTier(email, "expired")`.

5. **Add `invoice.payment_failed` handler** -- same pattern: extract customer email, set tier to `"expired"`.

### No Other Changes
- No frontend modifications
- No new secrets needed
- No config.toml changes (already configured)
- No database schema changes (`subscription_tier` column already exists on `localist_reps`)

### Post-Deploy
- In the Stripe Dashboard, add `customer.subscription.deleted` and `invoice.payment_failed` to the existing webhook endpoint's subscribed events.

