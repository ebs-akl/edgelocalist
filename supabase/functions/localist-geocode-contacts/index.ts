import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;
const BATCH_SIZE = 50; // Mapbox batch limit
const DELAY_MS = 250; // Rate-limit delay between batches

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

function stripApt(address: string): string {
  return address
    .replace(/\s*(apt|unit|suite|ste|#|bldg|floor|fl)\s*[a-z0-9-]+/gi, "")
    .trim();
}

function isPOBox(address: string): boolean {
  return /^\s*p\.?\s*o\.?\s*box/i.test(address);
}

async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zip: string,
  token: string
): Promise<{ lat: number; lng: number; county: string | null } | null> {
  const cleaned = stripApt(street);
  if (!cleaned || isPOBox(cleaned)) return null;

  const query = encodeURIComponent(`${cleaned}, ${city}, ${state} ${zip}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&country=US&limit=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    const coords = feature?.center;
    if (!coords || coords.length < 2) return null;

    // Extract county from context array (Mapbox calls it "district")
    let county: string | null = null;
    if (Array.isArray(feature.context)) {
      const district = feature.context.find((ctx: { id?: string }) =>
        typeof ctx.id === "string" && ctx.id.startsWith("district.")
      );
      if (district?.text) county = district.text;
    }

    return { lng: coords[0], lat: coords[1], county };
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
  const MAPBOX_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MAPBOX_TOKEN) {
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
      // Fallback: find any rep with a token for this location
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

  // ── Fetch contacts needing geocoding ──
  const backfillCounty = body.backfill_county === true;
  const maxContacts = (typeof body.limit === "number" && body.limit > 0)
    ? Math.min(body.limit as number, 500)
    : 500;

  let query = supabase
    .from("localist_contacts")
    .select("id, address, city, state, zip")
    .eq("rep_id", repId)
    .not("address", "is", null)
    .not("address", "eq", "");

  if (backfillCounty) {
    // Target contacts that have coordinates but no county
    query = query.not("latitude", "is", null).is("county", null);
  } else {
    // Normal mode: contacts without coordinates
    query = query.is("latitude", null);
  }

  const { data: contacts, error: fetchErr } = await query.limit(maxContacts);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!contacts || contacts.length === 0) {
    return new Response(JSON.stringify({ geocoded: 0, remaining: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Geocode in batches ──
  let geocoded = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (c) => {
        const coords = await geocodeAddress(
          c.address ?? "",
          c.city ?? "",
          c.state ?? "",
          c.zip ?? "",
          MAPBOX_TOKEN
        );
        return { id: c.id, coords };
      })
    );

    // Update contacts with coordinates
    for (const r of results) {
      if (r.coords) {
        const { error: updateErr } = await supabase
          .from("localist_contacts")
          .update({
            latitude: r.coords.lat,
            longitude: r.coords.lng,
            county: r.coords.county,
          })
          .eq("id", r.id);

        if (!updateErr) geocoded++;
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
    .is("latitude", null)
    .not("address", "is", null)
    .not("address", "eq", "");

  return new Response(
    JSON.stringify({ geocoded, remaining: remaining ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
