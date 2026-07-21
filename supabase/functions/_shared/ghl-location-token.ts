import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Supa = ReturnType<typeof createClient>;

/**
 * Refresh a Company-scoped agency token in-place. Returns the new access token or null.
 */
async function refreshAgencyToken(
  supabase: Supa,
  companyId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = Deno.env.get("GHL_CLIENT_ID_LOCALIST");
  const clientSecret = Deno.env.get("GHL_CLIENT_SECRET_LOCALIST");
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        user_type: "Company",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error(`Agency token refresh failed (${res.status}):`, await res.text());
      return null;
    }
    const data = await res.json();
    const newAccess = data.access_token as string | undefined;
    if (!newAccess) return null;
    const expiresAt = new Date(Date.now() + (data.expires_in ?? 86400) * 1000).toISOString();
    await supabase.from("agency_oauth_tokens").update({
      access_token: newAccess,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("provider", "ghl").eq("company_id", companyId);
    return newAccess;
  } catch (err) {
    console.error("Agency token refresh error:", err);
    return null;
  }
}

/**
 * Mint a Location-scoped access token for `locationId` using the stored
 * agency (Company) token. If `companyId` is null, tries all rows.
 * On success, upserts the token onto `localist_reps` for `repId` and
 * returns the access token.
 */
export async function mintLocationTokenFromAgency(
  supabase: Supa,
  repId: string,
  locationId: string,
  companyId: string | null
): Promise<string | null> {
  const query = supabase
    .from("agency_oauth_tokens")
    .select("company_id, access_token, refresh_token, expires_at")
    .eq("provider", "ghl");

  const { data: rows } = companyId
    ? await query.eq("company_id", companyId).limit(1)
    : await query.limit(5);

  if (!rows || rows.length === 0) {
    console.error("No agency_oauth_tokens available to mint location token");
    return null;
  }

  for (const row of rows) {
    let agencyToken = row.access_token as string;
    const expiresAt = row.expires_at as string | null;
    const isExpired = !expiresAt || Date.now() > new Date(expiresAt).getTime() - 5 * 60 * 1000;
    if (isExpired) {
      const refreshed = await refreshAgencyToken(
        supabase,
        row.company_id as string,
        row.refresh_token as string
      );
      if (!refreshed) continue;
      agencyToken = refreshed;
    }

    try {
      const res = await fetch("https://services.leadconnectorhq.com/oauth/locationToken", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          Version: "2021-07-28",
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          companyId: row.company_id as string,
          locationId,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.error(
          `locationToken mint failed for ${locationId} via company ${row.company_id} (${res.status}):`,
          await res.text()
        );
        continue;
      }
      const data = await res.json();
      const locAccess = data.access_token as string | undefined;
      if (!locAccess) continue;
      const locExpiresAt = new Date(
        Date.now() + (data.expires_in ?? 86400) * 1000
      ).toISOString();

      await supabase.from("localist_reps").update({
        ghl_access_token: locAccess,
        ghl_refresh_token: data.refresh_token ?? null,
        ghl_expires_at: locExpiresAt,
        ghl_location_id: locationId,
      }).eq("id", repId);

      console.log(`✅ Minted location token for ${locationId} via agency ${row.company_id}`);
      return locAccess;
    } catch (err) {
      console.error("locationToken mint error:", err);
      continue;
    }
  }
  return null;
}
