
Goal: fix why counties appear in Localist but never make it to HighLevel.

What I found
- The county push function is being reached, but it fails before any contact updates happen.
- Runtime logs show the blocker clearly: `localist-push-counties` returns `Failed to list custom fields: 401`.
- Database state confirms the push never succeeds: thousands of contacts have `county`, but `county_pushed = true` is still `0`.
- The current OAuth authorization URL only requests:
  - `contacts.readonly`
  - `contacts.write`
  - `users.readonly`
  - `locations.readonly`
  - `conversations/message.write`
- It does not request the custom-field scopes needed for:
  - `GET /locations/{locationId}/customFields`
  - `POST /locations/{locationId}/customFields`

Implementation plan

1. Update the GHL OAuth scopes
- Edit `supabase/functions/localist-get-auth-url/index.ts`
- Add the missing custom-field scopes required by the county sync flow:
  - `locations/customFields.readonly`
  - `locations/customFields.write`
- Keep the existing scopes already used elsewhere.

2. Improve the county push function error handling
- Edit `supabase/functions/localist-push-counties/index.ts`
- When the custom-fields request returns `401`, parse and log the response body, then return a clear error like:
  - “Your HighLevel connection is missing custom-field permissions. Please reconnect HighLevel.”
- Do the same for custom-field creation failures so the cause is visible instead of a generic 500.

3. Make the dashboard surface the real failure
- Edit `src/pages/Dashboard.tsx`
- In the Step 4c push loop, do not silently `break` on `pushErr`.
- Extract the edge-function error message and show it in the sync dialog / toast so the user sees “reconnect required” instead of a vague sync failure.
- Keep the rest of the sync flow intact.

4. Reauthorization requirement
- Existing HighLevel tokens will not automatically gain the new scopes.
- After shipping the scope change, users with existing connections must reconnect HighLevel once to mint a token with the added permissions.
- This is likely the actual reason counties are not reaching HighLevel right now.

5. Validation after implementation
- Reconnect HighLevel using the updated auth URL.
- Run the county push again.
- Confirm:
  - the custom field list call no longer returns 401
  - the County field is found or created
  - `county_pushed` starts increasing from 0
  - pending rows decrease in `localist_contacts`

Technical details
- Root cause is not geocoding: county values already exist in the app/database.
- Root cause is not basic auth into the edge function: the function gets far enough to call HighLevel.
- Root cause is most likely missing HighLevel OAuth scopes for custom-field APIs.
- No database migration is needed for this fix.
- Optional follow-up after this: there are also duplicate-key errors in `localist-sync-contacts` during smart upsert; that is a separate sync-quality issue, but it is not the current blocker for county push.
