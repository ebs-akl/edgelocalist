

## Fix: New Users Not Redirected to Stripe Checkout After Signup

### Root Cause
The Auth page (line 29-33) only redirects authenticated users to `/dashboard` when they already have a valid subscription. New users who just signed up have no subscription, so they remain stuck on `/auth`. The `pending_checkout_tier` value sitting in localStorage never gets acted on because the auto-checkout effect only exists on the Landing page.

### Fix

**File: `src/pages/Auth.tsx`**

Update the `useEffect` redirect logic to handle the `pending_checkout_tier` flow:

1. After authentication completes (not loading, user is authenticated):
   - If `pending_checkout_tier` exists in localStorage, redirect to `/` (Landing page) where the existing auto-checkout effect will pick it up and trigger Stripe checkout
   - If user has a valid subscription, redirect to `/dashboard` (existing behavior)
   - Otherwise, redirect to `/` so the user lands on the pricing page

This ensures:
- New signups with a pending tier → Landing → auto-checkout fires → Stripe
- New signups without a pending tier → Landing (pricing section)
- Returning users with subscription → Dashboard (unchanged)

### What does not change
- Landing page checkout logic stays the same
- `pending_checkout_tier` localStorage mechanism stays the same
- Stripe edge functions unchanged
- ProtectedRoute unchanged

