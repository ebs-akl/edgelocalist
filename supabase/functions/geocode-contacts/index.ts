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
  source: "census" | "mapbox" | "failed";
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
      { signal: AbortSignal.timeout(8000) }
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

// Geocode a small batch via Mapbox in parallel (capped at concurrency of 10)
async function geocodeBatchMapbox(contacts: ContactInput[]): Promise<GeoResult[]> {
  const CONCURRENCY = 10;
  const results: GeoResult[] = [];
  for (let i = 0; i < contacts.length; i += CONCURRENCY) {
    const chunk = contacts.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(geocodeWithMapbox));
    results.push(...chunkResults);
  }
  return results;
}

async function geocodeBatchWithCensus(contacts: ContactInput[]): Promise<GeoResult[]> {
  // Build CSV for Census batch geocoder
  const csvLines = ["Unique ID,Street address,City,State,ZIP"];
  for (const c of contacts) {
    const safeStreet = c.street.replace(/,/g, " ");
    const safeCity = c.city.replace(/,/g, " ");
    csvLines.push(`${c.id},${safeStreet},${safeCity},${c.state},${c.zip}`);
  }
  const csvBody = csvLines.join("\n");

  const form = new FormData();
  form.append("addressFile", new Blob([csvBody], { type: "text/csv" }), "addresses.csv");
  form.append("benchmark", "Public_AR_Current");
  form.append("returntype", "locations");

  let censusText = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout for Census
    const res = await fetch(
      "https://geocoding.geo.census.gov/geocoder/locations/addressbatch",
      { method: "POST", body: form, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Census HTTP ${res.status}`);
    censusText = await res.text();
  } catch (err) {
    console.warn("Census geocoder failed, falling back to Mapbox for entire batch:", err);
    return geocodeBatchMapbox(contacts);
  }

  // Parse Census response CSV
  const lines = censusText.trim().split("\n");
  const resultMap: Record<string, GeoResult> = {};
  const mapboxFallbackNeeded: ContactInput[] = [];

  for (const line of lines) {
    const parts = line.split(",");
    const id = parts[0]?.trim();
    const matchStatus = parts[2]?.trim();
    const coordStr = parts[5]?.trim();

    if (!id) continue;

    if (matchStatus === "Match" && coordStr) {
      const [lng, lat] = coordStr.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        resultMap[id] = { id, lat, lng, source: "census" };
        continue;
      }
    }

    // Queue for Mapbox fallback instead of calling immediately
    const contact = contacts.find((c) => c.id === id);
    if (contact) mapboxFallbackNeeded.push(contact);
    else resultMap[id] = { id, lat: null, lng: null, source: "failed" };
  }

  // Ensure contacts not in Census response are also queued
  for (const c of contacts) {
    if (!resultMap[c.id] && !mapboxFallbackNeeded.find((m) => m.id === c.id)) {
      mapboxFallbackNeeded.push(c);
    }
  }

  // Run Mapbox fallbacks in parallel batches
  if (mapboxFallbackNeeded.length > 0) {
    const fallbackResults = await geocodeBatchMapbox(mapboxFallbackNeeded);
    for (const r of fallbackResults) resultMap[r.id] = r;
  }

  return Object.values(resultMap);
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

    console.log(`Geocoding ${contacts.length} contacts. MAPBOX_TOKEN present: ${!!MAPBOX_TOKEN}`);

    // Process in sub-batches of 100 (Census handles up to 10k but we want faster failures)
    const BATCH_SIZE = 100;
    const allResults: GeoResult[] = [];

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const batchResults = await geocodeBatchWithCensus(batch);
      allResults.push(...batchResults);
    }

    const geocoded = allResults.filter((r) => r.lat !== null).length;
    console.log(`Done: ${geocoded}/${allResults.length} geocoded successfully`);

    return new Response(
      JSON.stringify({ results: allResults }),
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
