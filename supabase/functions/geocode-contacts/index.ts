import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAPBOX_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN") ?? "";

interface ContactInput {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface GeoResult {
  id: string;
  lat: number | null;
  lng: number | null;
  source: "mapbox" | "failed";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeWithMapbox(contact: ContactInput): Promise<GeoResult> {
  if (!MAPBOX_TOKEN) {
    console.error("MAPBOX_ACCESS_TOKEN is not set");
    return { id: contact.id, lat: null, lng: null, source: "failed" };
  }
  try {
    const query = encodeURIComponent(
      `${contact.street} ${contact.city} ${contact.state} ${contact.zip}`
    );
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`Mapbox HTTP ${res.status}`);
    const data = await res.json();
    const [lng, lat] = data?.features?.[0]?.center ?? [];
    if (lat && lng) return { id: contact.id, lat, lng, source: "mapbox" };
    return { id: contact.id, lat: null, lng: null, source: "failed" };
  } catch (err) {
    console.error(`Mapbox geocode error for contact:`, err);
    return { id: contact.id, lat: null, lng: null, source: "failed" };
  }
}

async function geocodeBatchMapbox(contacts: ContactInput[]): Promise<GeoResult[]> {
  const CONCURRENCY = 5;
  const DELAY_MS = 200;
  const results: GeoResult[] = [];

  for (let i = 0; i < contacts.length; i += CONCURRENCY) {
    const chunk = contacts.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(geocodeWithMapbox));
    results.push(...chunkResults);
    if (i + CONCURRENCY < contacts.length) {
      await sleep(DELAY_MS);
    }
  }

  return results;
}

const MAX_CONTACTS = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { contacts?: unknown };
    const contacts = body.contacts;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contacts.length > MAX_CONTACTS) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_CONTACTS} contacts per batch` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each contact
    const validContacts: ContactInput[] = [];
    for (const c of contacts) {
      if (
        typeof c !== "object" || c === null ||
        typeof c.id !== "string" || !c.id.trim() ||
        typeof c.street !== "string" ||
        typeof c.city !== "string" ||
        typeof c.state !== "string" ||
        typeof c.zip !== "string"
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid contact data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      validContacts.push({
        id: c.id.trim(),
        street: String(c.street).slice(0, 200),
        city: String(c.city).slice(0, 100),
        state: String(c.state).slice(0, 50),
        zip: String(c.zip).slice(0, 20),
      });
    }

    console.log(`Geocoding ${validContacts.length} contacts via Mapbox.`);

    const results = await geocodeBatchMapbox(validContacts);

    const geocoded = results.filter((r) => r.lat !== null).length;
    console.log(`Done: ${geocoded}/${results.length} geocoded successfully`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geocode-contacts error:", err);
    return new Response(
      JSON.stringify({ error: "Geocoding failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
