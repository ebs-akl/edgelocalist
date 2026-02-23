

# Fix: Geolocation "Permission Denied" in GHL Iframe

## Root Cause

This is **not a code bug**. When your app runs inside GoHighLevel's iframe, the browser blocks geolocation access because GHL's `<iframe>` tag does not include `allow="geolocation"`. This is a browser security policy you cannot override from inside the iframe.

## What We Can Do

Since we can't control GHL's iframe attributes, the plan focuses on two things:
1. **Better error messaging** that tells you exactly why it failed and what to do
2. **An IP-based location fallback** so the "Use My Location" button still works inside GHL (approximate city-level accuracy)

---

## Implementation Steps

### 1. Add IP-based geolocation fallback

When `watchPosition` fails with "permission denied" (error code 1) inside the GHL iframe, automatically fall back to an IP geolocation API to get an approximate location.

- Use a free IP geolocation service (e.g., `ipapi.co/json/` or `ip-api.com/json`) to get rough lat/lng
- Show a toast explaining the location is approximate: "Using approximate location (city-level). For precise GPS, open EdgeLocaList directly."
- Proceed with the radius search using the approximate coordinates

### 2. Improve the error toast for iframe context

When geolocation fails inside the GHL iframe, update the error message to be actionable:
- Detect iframe context (`window.self !== window.top`)
- Show a specific message: "GPS is blocked inside HighLevel. Falling back to approximate location..." instead of the generic "Location permission denied"
- If the IP fallback also fails, suggest typing an address manually

### 3. Hide or restyle the GPS button in iframe mode (optional polish)

- When in GHL mode (`isGhlMode`), change the button tooltip to "Use approximate location" so expectations are set

---

## Technical Details

**File: `src/components/dashboard/SearchTab.tsx`**

In the `handleGPS` function's error callback (around line 216), when `err.code === 1` (PERMISSION_DENIED):

```text
1. Check if we're in an iframe (window.self !== window.top)
2. If yes, call IP geolocation API as fallback
3. On success: run radius query with approximate coords + show info toast
4. On failure: show "Type an address instead" toast
```

The IP geolocation fetch is a simple `fetch("https://ipapi.co/json/")` returning `{ latitude, longitude, city }`. No new dependencies needed.

**Changes limited to:**
- `src/components/dashboard/SearchTab.tsx` — add fallback logic in `handleGPS` error handler (~20 lines), update button tooltip when `isGhlMode`

No new files, no new dependencies, no backend changes.
