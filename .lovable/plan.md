

## Stop Dashboard from Losing Search Results on Background Refreshes

### Root causes

1. **Realtime channel** (Dashboard lines 342-365): Every webhook-driven contact update calls `fetchContactStats()`, which sets multiple state variables (`contactCount`, `lastSync`, `loadingStats`), causing the entire Dashboard (including SearchTab) to re-render. SearchTab likely loses its internal state during heavy re-render cycles.

2. **Subscription polling** (AuthContext): `checkSubscription` runs every 60 seconds, updating `state.subscription` and `state.loadingSubscription`, which propagates to every component consuming `useAuth()` — including Dashboard and ProtectedRoute.

3. **Auth token refresh** (AuthContext): `onAuthStateChange` fires on `TOKEN_REFRESHED` events (~hourly), calling `syncSessionState` which resets `loadingSubscription: true`, triggering ProtectedRoute's loading gate which can briefly unmount Dashboard entirely.

### Fixes

**1. Dashboard realtime handler — debounce and stop setting loadingStats**
- File: `src/pages/Dashboard.tsx` (lines 342-365)
- Debounce the realtime callback (e.g. 5-second trailing debounce) so rapid webhook events don't spam `fetchContactStats`
- In `fetchContactStats`, don't set `loadingStats = true` when it's a background refresh (only on initial load)

**2. AuthContext — don't flip loadingSubscription on token refresh**
- File: `src/contexts/AuthContext.tsx` (line 183)
- In `syncSessionState`, only set `loadingSubscription: true` on initial load or sign-in, not on `TOKEN_REFRESHED` events
- Check the `_event` parameter: if it's `TOKEN_REFRESHED`, preserve existing subscription state instead of resetting it

**3. ProtectedRoute — don't unmount children during background subscription checks**
- File: `src/components/ProtectedRoute.tsx`
- Only show loading/spinner on initial page load. Once the user is authenticated and subscription is verified once, don't gate on `loadingSubscription` again — just keep rendering children.

### Technical detail

```text
Before:
  TOKEN_REFRESHED → syncSessionState → loadingSubscription=true
    → ProtectedRoute shows spinner → Dashboard unmounts → search results lost

After:
  TOKEN_REFRESHED → syncSessionState preserves subscription state
    → ProtectedRoute keeps rendering → Dashboard stays mounted
```

### Files to change
- `src/contexts/AuthContext.tsx` — guard `loadingSubscription` reset against `TOKEN_REFRESHED`
- `src/pages/Dashboard.tsx` — debounce realtime handler, skip `loadingStats` on background refresh
- `src/components/ProtectedRoute.tsx` — track "initially verified" flag to avoid re-gating

