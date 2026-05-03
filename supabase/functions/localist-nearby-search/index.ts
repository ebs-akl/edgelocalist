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

async function geocodeAddress(address: string, token: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;
  const query = encodeURIComponent(address.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&country=US&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error("Mapbox geocode failed:", res.status);
      return null;
    }
    const data = await res.json();
    const coords = data.features?.[0]?.center;
    if (!coords || coords.length < 2) return null;
    return { lng: coords[0], lat: coords[1] };
  } catch (err) {
    console.error("Mapbox geocode error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const MAPBOX_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN");

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
      return new Response(JSON.stringify({ error: "No rep found for this location" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    repId = rep.id;
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

  // ── Resolve coordinates: either provided directly or geocode an address ──
  let centerLat: number;
  let centerLng: number;

  if (typeof body.center_lat === "number" && typeof body.center_lng === "number") {
    centerLat = body.center_lat;
    centerLng = body.center_lng;
  } else if (typeof body.address === "string" && body.address.trim()) {
    if (!MAPBOX_TOKEN) {
      return new Response(JSON.stringify({ error: "Geocoding not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const coords = await geocodeAddress(body.address as string, MAPBOX_TOKEN);
    if (!coords) {
      return new Response(JSON.stringify({ error: "address_not_found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    centerLat = coords.lat;
    centerLng = coords.lng;
    console.log("Geocoded address to:", centerLat, centerLng);
  } else {
    return new Response(JSON.stringify({ error: "Provide center_lat/center_lng or address" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  // ── Pagination params ──
  const page = Math.max(1, Number(body.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 50));
  const offset = (page - 1) * limit;

  // ── Run both queries in parallel ──
  const [pageResult, markersResult] = await Promise.all([
    supabase.rpc("nearby_contacts_page", {
      rep: repId,
      center_lat: centerLat,
      center_lng: centerLng,
      radius_miles: radiusMiles,
      p_limit: limit,
      p_offset: offset,
    }),
    supabase.rpc("nearby_map_markers", {
      rep: repId,
      center_lat: centerLat,
      center_lng: centerLng,
      radius_miles: radiusMiles,
    }),
  ]);

  if (pageResult.error) {
    console.error("nearby_contacts_page error:", pageResult.error);
    return new Response(JSON.stringify({ error: "Search failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (markersResult.error) {
    console.error("nearby_map_markers error:", markersResult.error);
    // Non-fatal: return paginated contacts without markers
  }

  const paginatedContacts = pageResult.data ?? [];
  const totalCount = paginatedContacts.length > 0 ? Number(paginatedContacts[0].total_count) : 0;
  const mapMarkers = markersResult.data ?? [];

  return new Response(JSON.stringify({
    paginatedContacts,
    totalCount,
    mapMarkers,
    center_lat: centerLat,
    center_lng: centerLng,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
