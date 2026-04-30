import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Attempt to refresh an expired GHL access token using the stored refresh token.
 * Returns the new access token on success, or null on failure.
 */
export async function refreshGhlToken(
  supabase: ReturnType<typeof createClient>,
  repId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = Deno.env.get("GHL_CLIENT_ID_LOCALIST");
  const clientSecret = Deno.env.get("GHL_CLIENT_SECRET_LOCALIST");

  if (!clientId || !clientSecret) {
    console.error("GHL_CLIENT_ID_LOCALIST or GHL_CLIENT_SECRET_LOCALIST not configured — cannot refresh token");
    return null;
  }

  try {
    console.log(`Refreshing GHL token for rep ${repId}...`);

    const res = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        user_type: "Location",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`GHL token refresh failed (${res.status}):`, errText);
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token;
    const expiresIn = data.expires_in ?? 86400;

    if (!newAccessToken) {
      console.error("GHL token refresh response missing access_token");
      return null;
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from("localist_reps")
      .update({
        ghl_access_token: newAccessToken,
        ghl_refresh_token: newRefreshToken ?? refreshToken,
        ghl_expires_at: expiresAt,
      })
      .eq("id", repId);

    if (updateErr) {
      console.error("Failed to save refreshed token:", updateErr);
      return null;
    }

    console.log(`GHL token refreshed for rep ${repId}, expires at ${expiresAt}`);
    return newAccessToken;
  } catch (err) {
    console.error("GHL token refresh error:", err);
    return null;
  }
}

/**
 * Check if a token is expired (or will expire within 5 minutes).
 */
export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  return Date.now() > expiry - 5 * 60 * 1000; // 5-minute buffer
}
