import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mintLocationTokenFromAgency } from "./ghl-location-token.ts";
import { refreshGhlToken, isTokenExpired } from "./ghl-refresh-token.ts";

type Supa = ReturnType<typeof createClient>;

/**
 * Resolve a usable GHL location-scoped access token for a rep.
 *
 * `localist_reps` no longer stores any GHL token columns (they were removed
 * during the security hardening — the columns were sensitive and are now
 * service-role only on `profile_oauth_tokens`). The location-scoped token
 * lives in `profile_oauth_tokens`. When it is missing or expired, mint a fresh
 * location token on demand from the stored agency (Company) token, then fall
 * back to a refresh-token exchange if a refresh token is available.
 *
 * Returns null when no usable token can be obtained (caller should treat the
 * GHL connection as not-established).
 */
export async function resolveGhlToken(
  dbClient: Supa,
  repId: string,
  locationId: string,
  companyId: string | null = null,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string | null } | null> {
  let { data: tok } = await dbClient
    .from("profile_oauth_tokens")
    .select("ghl_access_token, ghl_refresh_token, ghl_expires_at")
    .eq("user_id", repId)
    .maybeSingle();

  // Agency-install fallback: mint a fresh location token on demand when missing or expired
  if (!tok?.ghl_access_token || isTokenExpired(tok?.ghl_expires_at ?? null)) {
    const minted = await mintLocationTokenFromAgency(dbClient, repId, locationId, companyId);
    if (minted) {
      const { data: fresh } = await dbClient
        .from("profile_oauth_tokens")
        .select("ghl_access_token, ghl_refresh_token, ghl_expires_at")
        .eq("user_id", repId)
        .maybeSingle();
      if (fresh) tok = fresh;
    }
  }

  if (!tok?.ghl_access_token) return null;

  let accessToken = tok.ghl_access_token;

  // Refresh-token fallback if still expired (e.g. agency mint unavailable)
  if (isTokenExpired(tok.ghl_expires_at) && tok.ghl_refresh_token) {
    const newToken = await refreshGhlToken(dbClient, repId, tok.ghl_refresh_token);
    if (newToken) accessToken = newToken;
  }

  return {
    accessToken,
    refreshToken: tok.ghl_refresh_token ?? "",
    expiresAt: tok.ghl_expires_at,
  };
}
