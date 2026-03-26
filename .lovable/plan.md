

## Add 7-Day Free Trial to All Tiers

### Problem
The checkout edge function doesn't include `trial_period_days`, so users are charged immediately. Additionally, the Landing page pricing cards say "Get Started" instead of "Start Free Trial" for LOCALIST and EDGE BASIC tiers.

### Changes

**1. `supabase/functions/localist-create-checkout/index.ts`**
Add `subscription_data: { trial_period_days: 7 }` to the `stripe.checkout.sessions.create()` call. This applies universally to all tiers (LOCALIST, SNACK PACK, and EDGE BASIC).

**2. `src/pages/Landing.tsx`**
- Change all three pricing cards' `cta` to "Start Free Trial"
- Update the `period` text for all three plans to include trial mention, e.g. `"/mo after 7-day free trial"` or add a subtitle line

### Files to change
- `supabase/functions/localist-create-checkout/index.ts` — add `subscription_data.trial_period_days: 7`
- `src/pages/Landing.tsx` — update CTA labels to "Start Free Trial" for all three plans

