

## Redeploy Edge Functions to Apply New Client Secret

Since you've updated the `GHL_CLIENT_SECRET` in Supabase, the edge functions need to be redeployed so they pick up the new value.

### Steps
1. Redeploy `ghl-oauth-callback` and `ghl-get-auth-url` edge functions
2. Test the OAuth flow again by clicking "Connect GoHighLevel" on the Settings page

### Verification
After redeployment, confirm the redirect URI in your GHL Marketplace App is exactly:
`https://edgelocalist.app/leadconnector/oauth`

Then test the full connection flow end-to-end.

