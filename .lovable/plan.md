

## Fix GHL Redirect URI Domain

The redirect URI needs to use `edgelocalist.app` instead of `edgelocalist.com`, while keeping the `/leadconnector/oauth` path from the GHL Marketplace configuration.

**Final redirect URI**: `https://edgelocalist.app/leadconnector/oauth`

### Changes

1. **`src/pages/Settings.tsx`** -- Update `GHL_REDIRECT_URI` constant to `https://edgelocalist.app/leadconnector/oauth`

2. **`src/pages/GhlCallback.tsx`** -- Update the `redirectUri` variable used in the token exchange to `https://edgelocalist.app/leadconnector/oauth`

3. **GHL Marketplace App** -- You will need to update the Redirect URI field in your GHL Marketplace App settings to match: `https://edgelocalist.app/leadconnector/oauth`

Three lines of code total. No other files need changes -- the route in `App.tsx` (`/leadconnector/oauth`) and the edge function are path-based and domain-agnostic.

