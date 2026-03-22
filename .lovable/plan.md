

## Fix: GHL Iframe Always Uses IP-Based Approximate Location

### Problem
The "Use My Location" button in GHL iframe mode is attempting browser GPS first, then only falling back to IP geolocation if the error code is specifically `1` (PERMISSION_DENIED). In some GHL iframe environments, the geolocation error returns as code `2` (POSITION_UNAVAILABLE) or code `3` (TIMEOUT), which bypasses the fallback entirely — showing a generic error instead of the approximate location.

### Fix (SearchTab.tsx)

**In GHL mode, skip GPS entirely and go straight to IP-based approximate location.** GPS is never available inside a GHL iframe due to the iframe's permissions policy, so there's no reason to attempt it.

Change `handleGPS`:
1. Move `fallbackToApproximateLocation` outside the conditional so it's always accessible
2. At the top of `handleGPS`, if `isGhlMode` is true, call `fallbackToApproximateLocation()` directly and return — don't even touch `navigator.geolocation`
3. Keep the existing GPS flow for standalone (non-GHL) mode unchanged

This eliminates the 15-second timeout wait and the error-code guessing in GHL mode entirely.

### File Changed
- `src/components/dashboard/SearchTab.tsx` — restructure `handleGPS` to short-circuit in GHL mode

