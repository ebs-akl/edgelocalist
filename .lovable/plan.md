
## Problem

The Supabase credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) are confirmed present in the project secrets, but the app still shows the "Missing Credentials" screen. This is a Vite build-time issue — environment variables prefixed with `VITE_` are injected **at build time**, not at runtime. The current preview is still running the old bundle compiled before the secrets were added.

## Root Cause

Vite reads `import.meta.env.*` variables when the dev server starts. Updating secrets after the server is running does not automatically inject them — a restart or file change is needed to trigger a fresh compilation.

## Fix

Make a minimal, no-op code change to `src/integrations/supabase/client.ts` (e.g. add a comment) to force Vite to re-compile the module and pick up the now-correct environment variables. No logic changes are needed.

## Files to Change

- `src/integrations/supabase/client.ts` — add a single comment line to trigger hot module reload and force Vite to re-read the environment at compile time

## Expected Result

After the change, the preview will rebuild, `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` will have their actual values, `supabaseConfigured` will be `true`, and the app will render the normal Landing page instead of the credentials warning screen.
