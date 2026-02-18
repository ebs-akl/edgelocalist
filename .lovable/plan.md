
# Database Migration Plan: PostGIS + Tables + RLS + RPC

## Overview

This migration creates everything the app needs to store contacts and run radius-based search. It runs as a single migration file in Supabase. There are no code changes — all the frontend code is already written and waiting for this schema.

---

## What gets created

### 1. Enable PostGIS extension
PostGIS adds geospatial support to Postgres. It is required for the radius search. Enabled once per project.

### 2. `localist_reps` table
Stores one row per signed-up rep. The `id` column matches `auth.users.id` so Supabase auth and the profile stay in sync.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, foreign key → auth.users |
| email | text | |
| full_name | text | |
| subscription_tier | text | `'standalone'` or `'edgedms'` |
| ghl_location_id | text | Null for standalone reps |
| ghl_access_token | text | Null for standalone reps |
| stripe_customer_id | text | |
| created_at | timestamptz | |

**RLS rules:**
- Authenticated users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` their own row (`id = auth.uid()`).
- A trigger auto-creates a row in this table when a new user signs up via Supabase Auth.

### 3. `localist_contacts` table
Stores all customer contacts uploaded via CSV or synced from GHL. Each rep owns their own contacts.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| rep_id | uuid | Foreign key → localist_reps |
| contact_id | text | Deduplication key (phone number or generated) |
| first_name | text | |
| last_name | text | |
| phone | text | |
| address | text | |
| city | text | |
| state | text | |
| zip | text | |
| latitude | double precision | Null until geocoded |
| longitude | double precision | Null until geocoded |
| location | geometry(Point, 4326) | PostGIS column — computed from lat/lng |
| lifetime_value | numeric | Optional, from CSV |
| last_order_date | date | Optional, from CSV |
| source | text | `'csv'` or `'ghl'` |
| updated_at | timestamptz | Updated on every upsert |

A unique constraint on `(rep_id, contact_id)` drives the upsert conflict resolution the CSV upload already uses.

A spatial index on `location` makes radius queries fast even with tens of thousands of rows.

A trigger auto-updates the `location` geometry column whenever `latitude` or `longitude` changes.

**RLS rules:**
- Authenticated users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where `rep_id = auth.uid()`.

### 4. `nearby_contacts` RPC function
This is the SQL function the Search tab calls. It takes a center point and a radius in miles, and returns all contacts within range sorted by distance.

**Parameters:**
- `rep` — the calling user's UUID
- `center_lat` — latitude of the search center
- `center_lng` — longitude of the search center
- `radius_miles` — search radius (10, 25, or 50)

**Returns:** rows matching `NearbyContact` — `id`, `first_name`, `last_name`, `phone`, `address`, `city`, `state`, `zip`, `lifetime_value`, `last_order_date`, and `distance_miles`.

The function uses `ST_DWithin` on a geography cast (which natively understands meters/miles) for accuracy and speed. It is `SECURITY DEFINER` so it enforces its own `rep = auth.uid()` check internally and bypasses RLS — this is safe because the function itself constrains the query to the calling user's data.

### 5. Auto-create rep profile trigger
When a new user signs up through Supabase Auth (`auth.users` gets a new row), a trigger fires and inserts a matching row into `localist_reps` using the email from the auth record. This means reps land on the dashboard with a profile already in place.

---

## Implementation

One migration file: `supabase/migrations/[timestamp]_init_localist_schema.sql`

**Order of operations inside the migration (must be sequential):**
1. Enable PostGIS
2. Create `localist_reps` table + RLS policies
3. Create `localist_contacts` table + spatial index + geometry trigger + RLS policies
4. Create `nearby_contacts` RPC function
5. Create the `handle_new_user` trigger on `auth.users`

---

## Technical Notes

- The `location` geometry column is kept in sync by a `BEFORE INSERT OR UPDATE` trigger so the geocode edge function only needs to write `latitude` and `longitude` — the PostGIS column updates automatically.
- The `nearby_contacts` function casts coordinates to `geography` type (not `geometry`) so that `ST_DWithin` distance is in meters (converted from miles), giving accurate real-world distances rather than flat-plane approximations.
- RLS is enabled on both tables. All policies use `auth.uid()` directly — no separate roles table is needed here because reps only ever access their own data (no admin cross-access pattern).
- The existing `CsvUploadTab` upsert call uses `onConflict: "rep_id,contact_id"` — this matches the unique constraint being created.
- No frontend code changes are required. Everything is already written.
