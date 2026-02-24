

## Plan: Add GHL_WEBHOOK_SECRET and Secure the Webhook

### Step 1: Store the secret
Add `GHL_WEBHOOK_SECRET` with the provided value to the project's Supabase secrets.

### Step 2: Update `supabase/functions/ghl-webhook-update/index.ts`
Add secret verification at the top of the request handler (after the OPTIONS check):
- Read the `?secret=` query parameter from the incoming request URL
- Compare it against `Deno.env.get("GHL_WEBHOOK_SECRET")`
- Return `401 Unauthorized` if missing or mismatched
- Continue processing only if the secret matches

### Step 3: Mark security finding resolved
Delete the `webhook_no_auth` security finding since the endpoint will now require secret verification.

### Webhook URL for GHL configuration
Once deployed, the webhook URL to paste into GoHighLevel will be:
```
https://kimyzwmniidwnixezqdi.supabase.co/functions/v1/ghl-webhook-update?secret=srfghaetrdfbhasdq345rtfjedsad567w4y5hebgsrt
```

No database changes required.

