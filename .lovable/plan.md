

## Fix: SSO Handshake Triggering in Lovable Preview

### Problem
The `useGhlSso` hook detects `window.self !== window.top` to determine iframe status, but unlike `App.tsx` (which excludes `lovable.app`, `lovableproject.com`, `localhost`), the hook has no domain exclusion. The Lovable preview runs inside an iframe, so the hook fires, times out after 10s, and Dashboard renders the "Connection Failed" error screen.

### Fix
**File: `src/hooks/useGhlSso.ts`** — Update the `isInIframe` callback to exclude Lovable/localhost domains, matching the logic in `App.tsx`:

```ts
const isInIframe = useCallback(() => {
  try {
    if (window.self === window.top) return false;
    const host = window.location.hostname;
    if (host.includes("lovable.app") || host.includes("lovableproject.com") || host.includes("localhost")) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}, []);
```

Single file change, ~5 lines modified. The Dashboard SSO gate at line 323 (`if (isInIframe && !ghlLocationId && !ssoReady)`) will then correctly skip in Lovable preview, and the normal standalone dashboard will render.

