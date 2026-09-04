import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// Refresh when the token expires within this window (2 hours ahead of expiry).
const RENEW_WINDOW_MS = 2 * 60 * 60 * 1000;
// Hard bound on how many agency tokens we touch per run.
const MAX_PER_RUN = 20;

async function refreshAgencyToken(
  admin: ReturnType<typeof createClient>,
  companyId: string,
  refreshToken: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  // The stored agency install may belong to either marketplace app, so try the
  // LocaList credentials first and fall back to the shared/legacy pair.
  const credentialPairs = [
    [Deno.env.get("GHL_CLIENT_ID_LOCALIST"), Deno.env.get("GHL_CLIENT_SECRET_LOCALIST")],
    [Deno.env.get("GHL_CLIENT_ID"), Deno.env.get("GHL_CLIENT_SECRET")],
  ].filter(([id, secret]) => !!id && !!secret) as Array<[string, string]>;

  if (credentialPairs.length === 0) {
    return { ok: false, status: 0, error: "GHL client credentials not configured" };
  }
  if (!refreshToken) {
    return { ok: false, status: 0, error: "No refresh token stored" };
  }

  let res: Response | null = null;
  let lastError = "";
  for (const [clientId, clientSecret] of credentialPairs) {
    const attempt = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        user_type: "Company",
      }),
    });
    if (attempt.ok) {
      res = attempt;
      break;
    }
    lastError = `${attempt.status}: ${(await attempt.text()).slice(0, 300)}`;
  }

  if (!res) {
    return { ok: false, status: 401, error: lastError || "All credential pairs rejected" };
  }


  const data = await res.json();
  const access = data.access_token as string | undefined;
  if (!access) return { ok: false, status: res.status, error: "Response missing access_token" };

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 86400) * 1000).toISOString();
  const { error: updErr } = await admin
    .from("agency_oauth_tokens")
    .update({
      access_token: access,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "ghl")
    .eq("company_id", companyId);

  if (updErr) return { ok: false, status: 0, error: `DB update failed: ${updErr.message}` };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const JOB_SECRET = Deno.env.get("AGENCY_TOKEN_CRON_SECRET");
    const INTERNAL_SECRET = Deno.env.get("INTERNAL_CRON_SECRET");

    const provided = req.headers.get("x-internal-secret");
    const authorized =
      (!!JOB_SECRET && provided === JOB_SECRET) ||
      (!!INTERNAL_SECRET && provided === INTERNAL_SECRET);
    if (!authorized) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: rows, error } = await admin
      .from("agency_oauth_tokens")
      .select("company_id, refresh_token, expires_at")
      .eq("provider", "ghl")
      .order("expires_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) throw error;

    const cutoff = Date.now() + RENEW_WINDOW_MS;
    const results: Array<{ company_id: string; status: string; detail?: string }> = [];

    for (const row of rows ?? []) {
      const companyId = row.company_id as string;
      const expiresAt = row.expires_at as string | null;
      const needsRenew = !expiresAt || new Date(expiresAt).getTime() <= cutoff;

      if (!needsRenew) {
        results.push({ company_id: companyId, status: "fresh" });
        continue;
      }

      const outcome = await refreshAgencyToken(admin, companyId, row.refresh_token as string);
      if (outcome.ok) {
        results.push({ company_id: companyId, status: "renewed" });
      } else {
        console.error(
          `Agency token renewal FAILED for company ${companyId} (status ${outcome.status}): ${outcome.error}`,
        );
        results.push({
          company_id: companyId,
          status: "failed",
          detail: `${outcome.status}: ${outcome.error}`,
        });
      }
    }

    const renewed = results.filter((r) => r.status === "renewed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    console.log(
      `Agency token cron: checked ${results.length}, renewed ${renewed}, failed ${failed}`,
      results,
    );

    return json({ checked: results.length, renewed, failed, results });
  } catch (err) {
    console.error("localist-agency-token-cron error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
