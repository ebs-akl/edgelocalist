import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { resolveGhlToken } from "../_shared/ghl-credentials.ts";
import { decryptSsoPayload } from "../_shared/sso-decrypt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

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

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate inputs
  const tag = typeof body.tag === "string" ? body.tag.trim() : "";
  if (!tag || tag.length > 100) {
    return new Response(JSON.stringify({ error: "Tag is required (max 100 chars)" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawIds = Array.isArray(body.contact_ids) ? body.contact_ids as string[] : [];
  const contactIds = rawIds
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());

  if (contactIds.length === 0) {
    return new Response(JSON.stringify({ error: "Provide at least 1 contact_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (contactIds.length > 2000) {
    return new Response(JSON.stringify({ error: "Maximum 2000 contacts per request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Auth: SSO or Bearer ──
  let locationId: string | null = null;
  let repId: string | null = null;

  if (typeof body.sso_payload === "string" && body.sso_payload) {
    locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId) {
      return new Response(JSON.stringify({ error: "Cryptographic verification failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: authRep } = await supabase
      .from("localist_reps")
      .select("ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();
    locationId = authRep?.ghl_location_id ?? null;
    repId = user.id;
  }

  if (!locationId || !LOCATION_ID_RE.test(locationId)) {
    return new Response(JSON.stringify({ error: "Missing or invalid location_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get rep (token is resolved from profile_oauth_tokens via the shared helper)
  let { data: rep } = await supabase
    .from("localist_reps")
    .select("id, ghl_location_id")
    .eq("ghl_location_id", locationId)
    .maybeSingle();

  if (!rep?.id) {
    return new Response(JSON.stringify({ error: "No CRM token found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tok = await resolveGhlToken(supabase, rep.id, locationId);
  if (!tok) {
    return new Response(JSON.stringify({ error: "No CRM token found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = tok.accessToken;

  // ── Bulk tag via GHL API (batches of 500) ──
  const BULK_BATCH = 500;
  let totalSucceeded = 0;
  let totalErrors = 0;

  for (let i = 0; i < contactIds.length; i += BULK_BATCH) {
    const batch = contactIds.slice(i, i + BULK_BATCH);

    const res = await fetch(
      "https://services.leadconnectorhq.com/contacts/bulk/tags/update/add",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: batch,
          tags: [tag],
          locationId: locationId,
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

  return new Response(JSON.stringify({
    tagged: totalSucceeded,
    failed: totalErrors,
    total: contactIds.length,
    tag,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
