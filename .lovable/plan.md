

## Problem

Supabase Auth Hooks require a `SEND_EMAIL_HOOK_SECRET` to be configured in the Supabase Dashboard. This secret is used by Supabase to sign the hook payload, and the edge function should verify that signature. The current `auth-email-hook` implementation skips signature verification entirely, which is why Supabase is blocking activation.

## What Supabase Auth Hooks Expect

When configuring a "Send Email" hook as an HTTP Request type, Supabase requires:
- The endpoint URL
- A **hook secret** (used to sign the payload with HMAC-SHA256)

The edge function must then verify the HMAC signature from the `x-supabase-signature` header before processing.

## Plan

### Step 1: Generate and set the hook secret

- A `SEND_EMAIL_HOOK_SECRET` needs to be created and added to the edge function secrets
- The same secret value must be entered in the Supabase Dashboard when configuring the hook
- Format: a random string, typically base64-encoded (e.g., 32+ characters)

### Step 2: Update `auth-email-hook/index.ts` to verify the signature

Add HMAC-SHA256 signature verification at the top of the request handler:
- Read the `x-supabase-signature` header
- Compute HMAC-SHA256 of the raw request body using `SEND_EMAIL_HOOK_SECRET`
- Compare the computed signature with the provided one
- Reject the request with 401 if they don't match

### Step 3: Configure the hook in Supabase Dashboard

The user will need to:
1. Go to Authentication → Hooks
2. Enable "Send Email" hook
3. Select "HTTP Request"
4. Enter the URL: `https://kimyzwmniidwnixezqdi.supabase.co/functions/v1/auth-email-hook`
5. Paste the same secret value used in Step 1

### Files changed

- `supabase/functions/auth-email-hook/index.ts` — add HMAC signature verification logic

