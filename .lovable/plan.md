

## Ensure Paid Plan Buttons Open Signup Mode

### Problem
In `src/pages/Landing.tsx` line 202, when an unauthenticated user clicks a pricing plan button, `navigate("/auth")` is called without `?mode=signup`, so they see the sign-in form instead of signup.

### Fix
**File: `src/pages/Landing.tsx`** — Change line 202 from:
```
navigate("/auth");
```
to:
```
navigate("/auth?mode=signup");
```

This single change ensures all pricing/trial buttons redirect unauthenticated users to the signup form. The "Login" button in the nav already correctly goes to `/auth` (no mode param) for sign-in.

