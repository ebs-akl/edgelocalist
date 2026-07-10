## Triage of 23 Rafter error findings

### False positives (3 findings) — no code change, document in `.rafter.yml`
- **R-9D881 ×2 (`.env:1`, `.env:3`)** — `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_MAPBOX_ACCESS_TOKEN` are **publishable** client-side tokens. The Supabase anon key is designed for browser use and gated by RLS; the Mapbox `pk.*` token is a public token restricted by URL allowlist in the Mapbox dashboard. Neither is a secret. Rotation is a no-op for security.
- **R-FC93C ×1 (`src/integrations/supabase/client.ts:6`)** — same Supabase publishable anon key, hardcoded intentionally per Lovable's generated client. Not a secret.

Action: add these three paths/rules to `.rafter.yml` with the rationale above, and mark the findings ignored in Rafter.

### Real findings — single dependency-bump batch (20 findings, 10 packages)

All remaining findings are transitive npm CVEs. Fix by bumping direct deps and refreshing the lockfile so transitive resolutions pick up patched versions. No app code changes required.

| Package | Current | Target | Findings resolved |
|---|---|---|---|
| minimatch | 3.1.2 | ≥3.1.4 (via glob bump) | R-FA68A ×3 |
| @babel/plugin-transform-modules-systemjs | 7.29.0 | ≥7.29.4 (via babel bump) | R-661F1 ×2 |
| @remix-run/router | 1.23.0 | ≥1.23.2 (via react-router-dom bump) | R-F05F1 ×2 |
| lodash | 4.17.21 | ≥4.18.0 | R-276AC ×2 |
| picomatch | 2.3.1 / 4.0.3 | ≥2.3.2 / ≥4.0.4 | R-17F85 ×3 |
| serialize-javascript | 6.0.2 | ≥7.0.3 (via terser bump) | R-40A69 ×2 |
| ws | 8.19.0 | ≥8.21.0 | R-63B93 ×2 |
| fast-uri | 3.1.0 | ≥3.1.2 | R-BAD5A ×2 |
| glob | 10.4.5 | ≥10.5.0 | R-840FD ×1 |
| rollup | 4.24.0 | ≥4.59.0 (via vite bump) | R-28376 ×1 |

### Execution steps (build mode)
1. Run `bun update` to refresh transitive versions inside current major-line constraints, then targeted `bun add -d vite@latest rollup@latest` and `bun add react-router-dom@latest` if the plain update doesn't reach the fixed versions.
2. Add `overrides` block in `package.json` for anything still stuck below the fixed version (lodash, ws, fast-uri, picomatch, serialize-javascript, minimatch, glob, @remix-run/router, @babel/plugin-transform-modules-systemjs) pinning `>=` the fixed versions listed above. Overrides are the reliable way to force transitive bumps.
3. Regenerate lockfile: `bun install` (also refresh `package-lock.json` if kept — the scanner reads both).
4. Verify: `bun run build` + `bunx vitest run` to confirm nothing regressed. Re-run the dependency scan; expect all 20 CVE findings cleared.
5. Update `.rafter.yml` with the three publishable-key exceptions and their rationale.

### Assumptions
- Bumping vite/react-router-dom/babel/glob/terser within the current majors is safe (Vite 5.x → 5.latest, react-router-dom 6.x → 6.latest). Flag: `@remix-run/router 1.23.2` requires `react-router-dom ≥ 6.30.x` — still within v6, no breaking change expected.
- No public API contract or DB schema changes.
- `.env` values aren't rotated because they aren't secrets; if you disagree, say so and I'll rotate the Mapbox token (Supabase anon key rotation would require a project-wide key roll and is not recommended).

### Not fixed / needs your call
- None. All 23 findings are either resolved by the bump batch or classified as false positives above.
