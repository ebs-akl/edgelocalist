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
    console.error(`Mapbox error for ${contact.id}:`, err);
    return { id: contact.id, lat: null, lng: null, source: "failed" };
  }
}

// Process contacts in small parallel chunks with a delay between chunks to avoid rate limits
async function geocodeBatchMapbox(contacts: ContactInput[]): Promise<GeoResult[]> {
  const CONCURRENCY = 5;   // 5 parallel requests at a time
  const DELAY_MS = 200;    // 200ms pause between chunks (~25 req/s max)
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts } = await req.json() as { contacts: ContactInput[] };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Geocoding ${contacts.length} contacts via Mapbox. Token present: ${!!MAPBOX_TOKEN}`);

    const results = await geocodeBatchMapbox(contacts);

    const geocoded = results.filter((r) => r.lat !== null).length;
    console.log(`Done: ${geocoded}/${results.length} geocoded successfully`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geocode-contacts error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
