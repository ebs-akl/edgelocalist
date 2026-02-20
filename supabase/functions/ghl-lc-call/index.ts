import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple validation helpers
const UUID_RE = /^[0-9a-zA-Z]{20,40}$/; // GHL IDs are not standard UUIDs
const PHONE_RE = /^\+?[0-9]{7,15}$/;

/**
 * Resolve GHL credentials via Bearer token or location_id.
 */
async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  locationId: string | null,
  headers?: Record<string, string | null> | null,
): Promise<{ accessToken: string; ghlLocationId: string } | { error: string; status: number }> {
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) return { error: "GHL not connected", status: 400 };
    return { accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id };
  }

  if (locationId) {
    const sharedSecret = Deno.env.get("GHL_SHARED_SECRET");
    const providedSecret = (headers as Record<string, string | null> | null)?.["x-ghl-secret"] ?? null;
    if (!sharedSecret || providedSecret !== sharedSecret) {
      return { error: "Unauthorized", status: 401 };
    }

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) return { error: "No rep found for this location", status: 400 };
    return { accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id! };
  }

  return { error: "Missing authorization", status: 401 };
}

serve(async (req) => {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contact_id = typeof body.contact_id === "string" ? body.contact_id.trim() : "";
  const to_number = typeof body.to_number === "string" ? body.to_number.trim() : "";
  const location_id = typeof body.location_id === "string" ? body.location_id.trim() : null;

  // Input validation
  if (!contact_id || !UUID_RE.test(contact_id)) {
    return new Response(JSON.stringify({ error: "Invalid contact_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!to_number || !PHONE_RE.test(to_number.replace(/[\s()-]/g, ""))) {
    return new Response(JSON.stringify({ error: "Invalid phone number" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reqHeaders: Record<string, string | null> = { "x-ghl-secret": req.headers.get("x-ghl-secret") };
  const creds = await resolveCredentials(supabase, authHeader, location_id, reqHeaders);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const callRes = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages/outbound",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          Version: "2021-04-15",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "Call",
          contactId: contact_id,
          locationId: creds.ghlLocationId,
          toNumber: to_number,
        }),
      }
    );

    const callData = await callRes.json();

    if (!callRes.ok) {
      console.error("GHL call error:", callData);
      return new Response(JSON.stringify({ error: "Call request failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: callData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-lc-call error:", err);
    return new Response(JSON.stringify({ error: "Call request failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
