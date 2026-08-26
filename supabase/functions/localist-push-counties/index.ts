import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";
import { decryptSsoPayload } from "../_shared/sso-decrypt.ts";
import { mintLocationTokenFromAgency } from "../_shared/ghl-location-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;
const BATCH_SIZE = 5;
const DELAY_MS = 600;

async function resolveCredentials(
  authClient: ReturnType<typeof createClient>,
  dbClient: ReturnType<typeof createClient>,
  authHeader: string | null,
  body: Record<string, unknown>
): Promise<
  | { accessToken: string; ghlLocationId: string; repId: string; refreshToken: string; expiresAt: string | null }
  | { error: string; status: number }
> {
  // Resolve location_id and rep_id from an admin call, SSO payload, or Bearer auth
  let locationId: string | null = null;
  let repId: string | null = null;

  // Backend admin trigger: service_role key in Authorization + location_id in body.
  // Lets server-side tooling (e.g. finishing an account setup) drive a county push
  // without a user session — used only with the project's own service_role key.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const isAdminCall =
    !!serviceRoleKey &&
    authHeader === `Bearer ${serviceRoleKey}` &&
    typeof body.location_id === "string" &&
    LOCATION_ID_RE.test(body.location_id);

  if (isAdminCall) {
    const { data: repRow } = await dbClient
      .from("localist_reps")
      .select("id, ghl_location_id")
      .eq("ghl_location_id", body.location_id as string)
      .maybeSingle();
    if (!repRow) {
      return { error: "No CRM connection found for this location. Please connect GoHighLevel first.", status: 401 };
    }
    repId = repRow.id;
    locationId = repRow.ghl_location_id ?? (body.location_id as string);
  } else if (typeof body.sso_payload === "string" && body.sso_payload) {
    locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId || !LOCATION_ID_RE.test(locationId)) {
      return { error: "Invalid SSO payload", status: 401 };
    }
    const { data: repRow } = await dbClient
      .from("localist_reps")
      .select("id, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();
    if (!repRow) {
      return { error: "No CRM connection found for this location. Please connect GoHighLevel first.", status: 401 };
    }
    repId = repRow.id;
    locationId = repRow.ghl_location_id ?? locationId;
  } else {
    // Bearer token mode – validate against the LOCAL auth project
    if (!authHeader?.startsWith("Bearer ")) {
      return { error: "Authorization required", status: 401 };
    }
    const { data: { user }, error: authError } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return { error: "Invalid authorization", status: 401 };
    }
    repId = user.id;
    const { data: repRow } = await dbClient
      .from("localist_reps")
      .select("ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();
    locationId = repRow?.ghl_location_id ?? null;
    if (!locationId || !LOCATION_ID_RE.test(locationId)) {
      return { error: "No CRM connection found. Please connect GoHighLevel first.", status: 401 };
    }
  }

  // Read the stored location-scoped GHL token (profile_oauth_tokens, service_role only)
  let { data: tok } = await dbClient
    .from("profile_oauth_tokens")
    .select("ghl_access_token, ghl_refresh_token, ghl_expires_at")
    .eq("user_id", repId)
    .maybeSingle();

  // Agency-install fallback: mint a fresh location token on demand when missing or expired
  if (!tok?.ghl_access_token || isTokenExpired(tok?.ghl_expires_at ?? null)) {
    const minted = await mintLocationTokenFromAgency(dbClient, repId, locationId, null);
    if (minted) {
      const { data: fresh } = await dbClient
        .from("profile_oauth_tokens")
        .select("ghl_access_token, ghl_refresh_token, ghl_expires_at")
        .eq("user_id", repId)
        .maybeSingle();
      if (fresh) tok = fresh;
    }
  }

  if (!tok?.ghl_access_token) {
    return { error: "No CRM connection found. Please connect GoHighLevel first.", status: 401 };
  }

  return {
    accessToken: tok.ghl_access_token,
    ghlLocationId: locationId,
    repId,
    refreshToken: tok.ghl_refresh_token ?? "",
    expiresAt: tok.ghl_expires_at,
  };
}

/** Find or create the "County" custom field in GHL */
async function resolveCountyFieldId(
  accessToken: string,
  locationId: string
): Promise<string | null> {
  try {
    const listRes = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!listRes.ok) {
      const errBody = await listRes.text();
      console.error(`[push-counties] Failed to list custom fields: ${listRes.status} ${errBody}`);
      if (listRes.status === 401 || listRes.status === 403) {
        throw new Error("Your HighLevel connection is missing custom-field permissions. Please disconnect and reconnect HighLevel to grant the updated scopes.");
      }
      return null;
    }

    const listData = await listRes.json();
    const fields = listData.customFields ?? [];

    const existing = fields.find(
      (f: { name?: string; fieldKey?: string }) =>
        f.name?.toLowerCase() === "county" ||
        f.fieldKey?.toLowerCase() === "contact.county"
    );
    if (existing?.id) {
      console.log(`[push-counties] Found existing County field: ${existing.id}`);
      return existing.id;
    }

    const createRes = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: "County",
          dataType: "TEXT",
          placeholder: "County name",
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error(`[push-counties] Failed to create County field: ${createRes.status} ${errText}`);
      if (createRes.status === 401 || createRes.status === 403) {
        throw new Error("Your HighLevel connection is missing custom-field permissions. Please disconnect and reconnect HighLevel to grant the updated scopes.");
      }
      return null;
    }

    const createData = await createRes.json();
    const newId = createData.customField?.id ?? createData.id ?? null;
    console.log(`[push-counties] Created County field: ${newId}`);
    return newId;
  } catch (err) {
    console.error("[push-counties] resolveCountyFieldId error:", err);
    if (err instanceof Error && err.message.includes("permissions")) {
      throw err;
    }
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Auth client: verify JWT against the LOCAL project that issued the token
  const authUrl = Deno.env.get("VITE_SUPABASE_URL") ?? SUPABASE_URL ?? "";
  const authKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authClient = createClient(authUrl, authKey, { auth: { persistSession: false } });

  // DB client: queries against the shared ALOMAR database
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const dbClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ok */ }

  const authHeader = req.headers.get("Authorization");
  const creds = await resolveCredentials(authClient, dbClient, authHeader, body);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let { accessToken } = creds;
  const { ghlLocationId, repId, refreshToken, expiresAt } = creds;

  // Refresh token if needed
  if (isTokenExpired(expiresAt)) {
    console.log(`[push-counties] Token expired, refreshing for rep ${repId}...`);
    const newToken = await refreshGhlToken(dbClient, repId, refreshToken);
    if (!newToken) {
      return new Response(JSON.stringify({ error: "Failed to refresh GHL token. Please re-authorize." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    accessToken = newToken;
  }

  // Resolve custom field ID
  let countyFieldId: string | null;
  try {
    countyFieldId = await resolveCountyFieldId(accessToken, ghlLocationId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not find or create County custom field in GHL";
    return new Response(JSON.stringify({ error: msg }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!countyFieldId) {
    return new Response(JSON.stringify({ error: "Could not find or create County custom field in GHL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch contacts with county but not yet pushed
  const limit = (typeof body.limit === "number" && body.limit > 0)
    ? Math.min(body.limit as number, 200)
    : 100;

  // First, mark any non-GHL contact IDs (e.g. numeric CSV IDs) as county_pushed
  // so they don't clog the sync queue — they can never be pushed to GHL
  const { data: allUnpushed } = await dbClient
    .from("localist_contacts")
    .select("id, contact_id")
    .eq("rep_id", repId)
    .eq("county_pushed", false)
    .not("county", "is", null)
    .not("contact_id", "is", null)
    .limit(500);

  if (allUnpushed && allUnpushed.length > 0) {
    const GHL_ID_RE = /^[a-zA-Z0-9]{20}$/;
    const invalidIds = allUnpushed
      .filter((c) => !GHL_ID_RE.test(c.contact_id))
      .map((c) => c.id);

    if (invalidIds.length > 0) {
      console.log(`[push-counties] Marking ${invalidIds.length} non-GHL contacts as county_pushed`);
      await dbClient
        .from("localist_contacts")
        .update({ county_pushed: true })
        .in("id", invalidIds);
    }
  }

  // Now fetch only contacts with valid GHL IDs
  const { data: contacts, error: fetchErr } = await dbClient
    .from("localist_contacts")
    .select("id, contact_id, county")
    .eq("rep_id", repId)
    .eq("county_pushed", false)
    .not("county", "is", null)
    .not("contact_id", "is", null)
    .limit(limit);

  if (fetchErr) {
    console.error("[push-counties] fetch error:", fetchErr.message);
    return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[push-counties] Found ${contacts?.length ?? 0} contacts to push`);

  if (!contacts || contacts.length === 0) {
    const { count: remaining } = await dbClient
      .from("localist_contacts")
      .select("id", { count: "exact", head: true })
      .eq("rep_id", repId)
      .eq("county_pushed", false)
      .not("county", "is", null)
      .not("contact_id", "is", null);

    return new Response(JSON.stringify({ pushed: 0, remaining: remaining ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Push county to GHL in batches
  let pushed = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (c) => {
        try {
          const res = await fetch(
            `https://services.leadconnectorhq.com/contacts/${c.contact_id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Version: "2021-07-28",
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                customFields: [
                  { id: countyFieldId, value: c.county },
                ],
              }),
              signal: AbortSignal.timeout(10000),
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            console.error(`[push-counties] PUT failed for ${c.contact_id}: ${res.status} ${errText}`);
            // Mark 404/422 as "done" — contact doesn't exist in GHL
            if (res.status === 404 || res.status === 422) {
              return { id: c.id, success: true };
            }
            return { id: c.id, success: false };
          }

          return { id: c.id, success: true };
        } catch (err) {
          console.error(`[push-counties] PUT error for ${c.contact_id}:`, err);
          return { id: c.id, success: false };
        }
      })
    );

    const successIds = results.filter((r) => r.success).map((r) => r.id);
    if (successIds.length > 0) {
      const { error: updateErr } = await dbClient
        .from("localist_contacts")
        .update({ county_pushed: true })
        .in("id", successIds);

      if (updateErr) {
        console.error("[push-counties] Failed to mark county_pushed:", updateErr.message);
      } else {
        pushed += successIds.length;
      }
    }

    if (i + BATCH_SIZE < contacts.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Count remaining
  const { count: remaining } = await dbClient
    .from("localist_contacts")
    .select("id", { count: "exact", head: true })
    .eq("rep_id", repId)
    .eq("county_pushed", false)
    .not("county", "is", null)
    .not("contact_id", "is", null);

  console.log(`[push-counties] pushed=${pushed}, remaining=${remaining ?? 0}`);

  return new Response(
    JSON.stringify({ pushed, remaining: remaining ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
