

# Fix: PostGIS "geography" Type Not Found

## What Broke

The `nearby_contacts` and `sync_contact_location` database functions stopped working because **PostGIS is installed in the `extensions` schema**, but both functions have their search path restricted to only `public`. This means they can't find PostGIS types like `geography` or functions like `ST_Distance`.

This likely broke when a recent migration recreated these functions with `SET search_path TO 'public'` -- a security best practice that unfortunately excludes the schema where PostGIS lives.

## The Fix

Create a new migration that recreates both affected functions with the corrected search path: `SET search_path TO 'public', 'extensions'`.

### Functions to update:

1. **`nearby_contacts`** -- powers all radius searches
   - Change: `SET search_path TO 'public'` --> `SET search_path TO 'public', 'extensions'`

2. **`sync_contact_location`** -- trigger that converts lat/lng to a PostGIS geometry on insert/update
   - Change: `SET search_path TO 'public'` --> `SET search_path TO 'public', 'extensions'`

### Steps:
1. Create a new SQL migration file with the two `CREATE OR REPLACE FUNCTION` statements using the updated search paths
2. No frontend code changes are needed -- the app code is correct; this is purely a database-level fix

