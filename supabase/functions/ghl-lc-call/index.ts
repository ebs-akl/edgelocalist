import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-zA-Z]{20,40}$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;
const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

function decryptSsoPayload(ssoPayload: string): string | null {
  const ssoKey = Deno.env.get("GHL_SSO_KEY");
  if (!ssoKey) { console.error("GHL_SSO_KEY not configured"); return null; }
  try {
    const bytes = CryptoJS.AES.decrypt(ssoPayload, ssoKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    const decryptedData = JSON.parse(decryptedString);
    return decryptedData.activeLocation ?? decryptedData.locationId ?? decryptedData.location_id ?? null;
  } catch (err) { console.error("SSO decryption failed:", err); return null; }
}

async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  body: Record<string, unknown>,
): Promise<{ accessToken: string; ghlLocationId: string } | { error: string; status: number }> {
  // 1. Bearer token auth (standalone mode)
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

  // 2. SSO payload auth (GHL iframe mode)
  if (typeof body.sso_payload === "string" && body.sso_payload) {
    const locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId) return { error: "Cryptographic verification failed", status: 401 };
    if (!LOCATION_ID_RE.test(locationId)) return { error: "Invalid location_id", status: 400 };

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

  const creds = await resolveCredentials(supabase, authHeader, body);
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
