import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

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

  // ── Auth: SSO payload or Bearer token ──
  let repId: string | null = null;

  if (typeof body.sso_payload === "string" && body.sso_payload) {
    const locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId || !LOCATION_ID_RE.test(locationId)) {
      return new Response(JSON.stringify({ error: "Invalid SSO payload" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep) {
      const { data: anyRep } = await supabase
        .from("localist_reps")
        .select("id")
        .not("ghl_access_token", "is", null)
        .limit(1)
        .maybeSingle();
      repId = anyRep?.id ?? null;
    } else {
      repId = rep.id;
    }
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    repId = user.id;
  }

  if (!repId) {
    return new Response(JSON.stringify({ error: "Could not determine rep" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Validate search params ──
  const centerLat = Number(body.center_lat);
  const centerLng = Number(body.center_lng);
  const radiusMiles = Number(body.radius_miles);

  if (isNaN(centerLat) || isNaN(centerLng) || isNaN(radiusMiles)) {
    return new Response(JSON.stringify({ error: "Invalid search parameters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (radiusMiles <= 0 || radiusMiles > 100) {
    return new Response(JSON.stringify({ error: "Radius must be between 0 and 100 miles" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Run the spatial query directly (service role bypasses RLS) ──
  const { data, error } = await supabase.rpc("nearby_contacts_service", {
    rep: repId,
    center_lat: centerLat,
    center_lng: centerLng,
    radius_miles: radiusMiles,
  });

  if (error) {
    // Fallback: try raw query if RPC doesn't exist yet
    console.error("nearby_contacts_service error:", error);
    return new Response(JSON.stringify({ error: "Search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ contacts: data ?? [] }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
