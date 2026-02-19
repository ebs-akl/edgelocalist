

## Update GHL Credentials

### 1. Frontend Code Change
- **`src/pages/Settings.tsx`** (line 12): Update `GHL_CLIENT_ID` from `69924ed31d05050c3a7e5757-mlr00xb6` to `69924ed31d05050c3a7e5757-mltvd3g6`

### 2. Supabase Secrets
- Update `GHL_CLIENT_ID` secret to `69924ed31d05050c3a7e5757-mltvd3g6`
- Update `GHL_CLIENT_SECRET` secret to your new client secret (please provide it)

### 3. Redeploy Edge Functions
After secrets are updated, redeploy `ghl-oauth-callback` and `ghl-get-auth-url` so they pick up the new credentials.

### 4. GHL Marketplace App
Confirm your Marketplace App redirect URI is set to exactly:
`https://edgelocalist.app/leadconnector/oauth` (with the letter "o", not zero)

