import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;
const BATCH_SIZE = 5; // Conservative to avoid GHL rate limits
const DELAY_MS = 600;

function decryptSsoPayload(ssoPayload: string): string | null {
  const ssoKey = Deno.env.get("GHL_SSO_KEY");
  if (!ssoKey) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ssoPayload, ssoKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    const decryptedData = JSON.parse(decryptedString);
    return decryptedData.activeLocation ?? decryptedData.locationId ?? decryptedData.location_id ?? null;
  } catch {
    return null;
  }
}

async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  body: Record<string, unknown>
): Promise<
  | { accessToken: string; ghlLocationId: string; repId: string; refreshToken: string; expiresAt: string | null }
  | { error: string; status: number }
> {
  if (typeof body.sso_payload === "string" && body.sso_payload) {
    const locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId || !LOCATION_ID_RE.test(locationId)) {
      return { error: "Invalid SSO payload", status: 401 };
    }
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("id, ghl_access_token, ghl_refresh_token, ghl_expires_at, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep || !rep.ghl_access_token) {
      return { error: "No GHL credentials found for location", status: 401 };
    }
    return {
      accessToken: rep.ghl_access_token,
      ghlLocationId: rep.ghl_location_id,
      repId: rep.id,
      refreshToken: rep.ghl_refresh_token,
      expiresAt: rep.ghl_expires_at,
    };
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Authorization required", status: 401 };
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) {
    return { error: "Invalid authorization", status: 401 };
  }
  const { data: rep } = await supabase
    .from("localist_reps")
    .select("id, ghl_access_token, ghl_refresh_token, ghl_expires_at, ghl_location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!rep || !rep.ghl_access_token) {
    return { error: "No GHL credentials found", status: 401 };
  }
  return {
    accessToken: rep.ghl_access_token,
    ghlLocationId: rep.ghl_location_id,
    repId: rep.id,
    refreshToken: rep.ghl_refresh_token,
    expiresAt: rep.ghl_expires_at,
  };
}

/** Find or create the "County" custom field in GHL */
async function resolveCountyFieldId(
  accessToken: string,
  locationId: string
): Promise<string | null> {
  try {
    // List existing custom fields
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
      console.error(`[push-counties] Failed to list custom fields: ${listRes.status}`);
      return null;
    }

    const listData = await listRes.json();
    const fields = listData.customFields ?? [];

    // Look for existing County field
    const existing = fields.find(
      (f: { name?: string; fieldKey?: string }) =>
        f.name?.toLowerCase() === "county" ||
        f.fieldKey?.toLowerCase() === "contact.county"
    );
    if (existing?.id) {
      console.log(`[push-counties] Found existing County field: ${existing.id}`);
      return existing.id;
    }

    // Create one
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
      return null;
    }

    const createData = await createRes.json();
    const newId = createData.customField?.id ?? createData.id ?? null;
    console.log(`[push-counties] Created County field: ${newId}`);
    return newId;
  } catch (err) {
    console.error("[push-counties] resolveCountyFieldId error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ok */ }

  const authHeader = req.headers.get("Authorization");
  const creds = await resolveCredentials(supabase, authHeader, body);
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
    const newToken = await refreshGhlToken(supabase, repId, refreshToken);
    if (!newToken) {
      return new Response(JSON.stringify({ error: "Failed to refresh GHL token. Please re-authorize." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    accessToken = newToken;
  }

  // Resolve custom field ID
  const countyFieldId = await resolveCountyFieldId(accessToken, ghlLocationId);
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

  const { data: contacts, error: fetchErr } = await supabase
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
    // Count remaining
    const { count: remaining } = await supabase
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
            return { id: c.id, success: false };
          }

          return { id: c.id, success: true };
        } catch (err) {
          console.error(`[push-counties] PUT error for ${c.contact_id}:`, err);
          return { id: c.id, success: false };
        }
      })
    );

    // Mark successful pushes
    const successIds = results.filter((r) => r.success).map((r) => r.id);
    if (successIds.length > 0) {
      const { error: updateErr } = await supabase
        .from("localist_contacts")
        .update({ county_pushed: true })
        .in("id", successIds);

      if (updateErr) {
        console.error("[push-counties] Failed to mark county_pushed:", updateErr.message);
      } else {
        pushed += successIds.length;
      }
    }

    // Rate-limit delay
    if (i + BATCH_SIZE < contacts.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Count remaining
  const { count: remaining } = await supabase
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
