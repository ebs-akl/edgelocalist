

## Replace Stripe Checkout with Payment Link + Fix Subscription Gate

### Problem
1. New users bypass the subscription gate because `standalone` in the DB fallback maps to a paid product.
2. The current checkout flow uses a Supabase edge function to create Stripe Checkout sessions. User wants to replace it with a direct Stripe Payment Link.

### Changes

**1. Landing page — `src/pages/Landing.tsx`**
- Replace `triggerCheckout()` and `handleCheckout()`: instead of calling `localist-create-checkout`, open the payment link directly: `https://buy.stripe.com/28E7sK90udzW7pa2Bl7Vm0R`
- For unauthenticated users: still redirect to `/auth` first, store `pending_checkout_tier` in localStorage
- For authenticated users: open the payment link in a new tab (append `?prefilled_email={user_email}` to pre-fill their email on the Stripe page)
- The auto-checkout effect (lines 187-195) does the same: open the payment link instead of invoking the edge function
- Remove the `checkoutLoading` state since there's no async call to wait for

**2. Edge function — `localist-check-subscription/index.ts`**
- Remove the `standalone` entry from `DB_TIER_TO_PRODUCT` (line 36). New users with the default `standalone` tier will correctly return `subscribed: false`.

**3. Redeploy** the `localist-check-subscription` edge function.

### What stays the same
- Auth.tsx redirect logic (already fixed in prior change)
- ProtectedRoute subscription gate logic
- Stripe webhook handling (still updates `subscription_tier` after payment)
- All other tier mappings in the DB fallback
- The `localist-create-checkout` edge function remains (no harm, just unused for now)

### Flow after fix
1. New user clicks pricing button → redirected to `/auth` → signs up
2. After signup, redirected to Landing → payment link opens in new tab with email pre-filled
3. User pays on Stripe → webhook fires → sets `subscription_tier` to paid tier
4. User returns to app → subscription check returns `subscribed: true` → dashboard access granted

