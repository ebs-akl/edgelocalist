## Problem

The pre-flight verification script returned only 1 row (`AUTH CHECK / auth.users / 1 / PASS`) instead of the full ~40-row report. This means the SQL Editor hit an error partway through and stopped — almost certainly because the new Supabase project is missing one of: PostGIS extension, the `extensions` schema, a required table, or a required function.

The current script is also fragile: it assumes every object exists. If `localist_contacts` doesn't exist yet, the whole script aborts at that line.

## Solution

Rewrite the verification script to be **fault-tolerant** so every check runs independently and reports `PASS` / `FAIL` / `MISSING` instead of erroring out. Also surface the **first error message** the user actually got, so we can diagnose what's blocking the migration.

## Deliverables

### 1. New verification script — `localist-migration-preflight-verification-v2.sql`

Rewrite using a single results table built up by individual `DO` blocks wrapped in `BEGIN ... EXCEPTION WHEN OTHERS` handlers. Each check:

- Runs in isolation (one failing check doesn't kill the rest)
- Inserts a row into a temp `_preflight_results` table with `(section, check_name, status, detail)`
- Returns the full table with one final `SELECT * FROM _preflight_results ORDER BY section, check_name`

Checks grouped by section:

```text
EXTENSIONS    → postgis, pg_trgm, pgcrypto present
SCHEMA        → 'extensions' schema exists, search_path includes it
TABLES (19)   → each of: localist_reps, localist_contacts, contacts, customers,
                orders, profiles, user_roles, user_settings, oauth_states,
                sms_rate_limits, api_rate_limits, ghl_locations, portal_leads,
                service_requests, commission_deposits, push_subscriptions,
                pending_confirmations, recipe_cache, usage_ledger, ghl_social_posts
FUNCTIONS (18)→ each db function from the schema (nearby_contacts_page,
                smart_upsert_ghl_contacts, get_my_rep_profile, has_role,
                handle_new_user, sync_contact_location, etc.)
TRIGGERS      → on_auth_user_created on auth.users, sync_contact_location_trg,
                reset_county_pushed_trg, prevent_rep_number_change_trg,
                protect_subscription_tier_trg
RLS           → row count of policies per public table; flag tables with 0
GEOGRAPHY     → localist_contacts.location column type = geography(Point,4326)
AUTH          → auth.users count, presence of handle_new_user trigger
```

Each check returns one row regardless of pass/fail. Final query returns everything.

### 2. Diagnostic helper — single-query "what's the first thing missing"

At the top of the new script, add a quick-diagnose `SELECT` that lists in one shot:
- Which of the 19 tables exist
- Whether PostGIS is installed
- Whether the `extensions` schema exists

This lets you (and me) see at a glance what's been migrated and what hasn't, even if you only run that block.

## What I need from you after running v2

Paste back the full output (or screenshot). With the fault-tolerant version, I'll be able to tell you:
- Exactly which tables/functions/triggers are missing
- Whether PostGIS needs to be enabled
- Whether the `auth.users → handle_new_user` trigger needs to be re-attached (this is the most commonly missed step)
- What migration phase to re-run from the runbook

## Files to create

- `/mnt/documents/localist-migration-preflight-verification-v2.sql` (new, fault-tolerant)
- Keep the original v1 in place for reference