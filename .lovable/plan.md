

## Plan: Add Sending Phone Number Picker to Group SMS

### Problem
EdgeDMS accounts often have multiple phone numbers configured in GoHighLevel. Currently the group SMS feature doesn't let users choose which number to send from — GHL just uses the location's default.

### Approach

**1. New edge function: `localist-list-phone-numbers`**
- Calls GHL API: `GET /phone-system/numbers/location/{locationId}` with the rep's access token
- Returns a list of active phone numbers (id, phone number, label/name)
- Supports both JWT auth and SSO payload auth (same dual-auth pattern as other functions)
- Handles token refresh if expired

**2. Update `localist-group-sms` edge function**
- Accept an optional `from_number` field in the request body
- Pass it to the GHL outbound message API (the `conversations/messages` endpoint supports specifying the sending number)
- Validate the field format server-side

**3. Update `GroupSmsModal.tsx` frontend**
- On modal open, fetch available phone numbers via `supabase.functions.invoke("localist-list-phone-numbers")`
- Show a `<Select>` dropdown above the template picker labeled "Send from"
- Default to the first number (or "Default" if only one)
- Pass the selected number in the request body to `localist-group-sms`
- Show a loading skeleton while numbers load; gracefully fall back to no picker if the fetch fails (GHL phone system not connected)

### Files to Create/Modify
- **Create** `supabase/functions/localist-list-phone-numbers/index.ts`
- **Edit** `supabase/functions/localist-group-sms/index.ts` — accept + forward `from_number`
- **Edit** `src/components/dashboard/GroupSmsModal.tsx` — phone number selector UI + fetch logic
- **Edit** `supabase/config.toml` — add `verify_jwt = false` for the new function

