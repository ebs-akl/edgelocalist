import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";
import { resolveGhlToken } from "../_shared/ghl-credentials.ts";
import { decryptSsoPayload } from "../_shared/sso-decrypt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  body: Record<string, unknown>,
): Promise<{ accessToken: string; ghlLocationId: string; repId: string; refreshToken: string; expiresAt: string | null } | { error: string; status: number }> {
  let repId: string | null = null;
  let locationId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };
    repId = user.id;
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();
    locationId = rep?.ghl_location_id ?? null;
  } else if (typeof body.sso_payload === "string" && body.sso_payload) {
    const loc = decryptSsoPayload(body.sso_payload);
    if (!loc) return { error: "Cryptographic verification failed", status: 401 };
    if (!LOCATION_ID_RE.test(loc)) return { error: "Invalid location_id", status: 400 };
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("id, ghl_location_id")
      .eq("ghl_location_id", loc)
      .maybeSingle();
    if (!rep?.id) return { error: "No rep found for this location", status: 400 };
    repId = rep.id;
    locationId = rep.ghl_location_id ?? loc;
  } else {
    return { error: "Missing authorization", status: 401 };
  }

  if (!locationId || !LOCATION_ID_RE.test(locationId)) return { error: "GHL not connected", status: 400 };

  const tok = await resolveGhlToken(supabase, repId, locationId);
  if (!tok) return { error: "GHL not connected", status: 400 };
  return { accessToken: tok.accessToken, ghlLocationId: locationId, repId, refreshToken: tok.refreshToken, expiresAt: tok.expiresAt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers.get("Authorization");

  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Validate inputs ──
  const contactIds = rawBody.contact_ids;
  const tag = typeof rawBody.tag === "string" ? rawBody.tag.trim() : "";

  if (!tag || tag.length > 100) {
    return new Response(JSON.stringify({ error: "Tag is required (max 100 chars)" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return new Response(JSON.stringify({ error: "Missing or empty contact_ids array" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (contactIds.length > 2000) {
    return new Response(JSON.stringify({ error: "Maximum 2000 contacts per request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter to valid string IDs
  const validIds = contactIds
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());

  if (validIds.length === 0) {
    return new Response(JSON.stringify({ error: "No valid contact IDs found" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Resolve credentials ──
  const creds = await resolveCredentials(supabase, authHeader, rawBody);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Token refresh ──
  let activeToken = creds.accessToken;
  if (isTokenExpired(creds.expiresAt)) {
    const refreshed = await refreshGhlToken(supabase, creds.repId, creds.refreshToken);
    if (refreshed) {
      activeToken = refreshed;
    } else {
      return new Response(JSON.stringify({ error: "GHL token expired. Please reconnect your CRM." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── Bulk tag via GHL API (max 500 per call) ──
  const BULK_BATCH = 500;
  let totalSucceeded = 0;
  let totalErrors = 0;

  for (let i = 0; i < validIds.length; i += BULK_BATCH) {
    const batch = validIds.slice(i, i + BULK_BATCH);

    const res = await fetch(
      "https://services.leadconnectorhq.com/contacts/bulk/tags/update/add",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: batch,
          tags: [tag],
          locationId: creds.ghlLocationId,
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Bulk tag batch ${Math.floor(i / BULK_BATCH) + 1} failed (${res.status}):`, errBody);
      totalErrors += batch.length;
      continue;
    }

    const data = await res.json();
    console.log(`Bulk tag batch ${Math.floor(i / BULK_BATCH) + 1}:`, JSON.stringify(data));

    if (data.succeded === true || data.succeeded === true) {
      totalSucceeded += batch.length - (data.errorCount ?? 0);
      totalErrors += data.errorCount ?? 0;
    } else {
      totalErrors += batch.length;
    }
  }

  const totalBatches = Math.ceil(validIds.length / BULK_BATCH);

  return new Response(
    JSON.stringify({
      tagged: totalSucceeded,
      failed: totalErrors,
      total: validIds.length,
      batches: totalBatches,
      tag,
      message: `Tag "${tag}" applied to ${totalSucceeded} contacts.${totalErrors > 0 ? ` ${totalErrors} failed.` : ""} Set up a GHL Workflow triggered by this tag to send your SMS.`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
