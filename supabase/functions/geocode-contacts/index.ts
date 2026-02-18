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
  if (!MAPBOX_TOKEN) return { id: contact.id, lat: null, lng: null, source: "failed" };
  try {
    const query = encodeURIComponent(`${contact.street} ${contact.city} ${contact.state} ${contact.zip}`);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`
    );
    const data = await res.json();
    const [lng, lat] = data?.features?.[0]?.center ?? [];
    if (lat && lng) return { id: contact.id, lat, lng, source: "mapbox" };
    return { id: contact.id, lat: null, lng: null, source: "failed" };
  } catch {
    return { id: contact.id, lat: null, lng: null, source: "failed" };
  }
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
    const res = await fetch(
      "https://geocoding.geo.census.gov/geocoder/locations/addressbatch",
      { method: "POST", body: form }
    );
    if (!res.ok) throw new Error(`Census HTTP ${res.status}`);
    censusText = await res.text();
  } catch (err) {
    console.error("Census geocoder unreachable:", err);
    // Fall back to Mapbox for all contacts
    return Promise.all(contacts.map(geocodeWithMapbox));
  }

  // Parse Census response CSV
  const lines = censusText.trim().split("\n");
  const resultMap: Record<string, GeoResult> = {};

  for (const line of lines) {
    const parts = line.split(",");
    // Census response: id, input address, match status, match type, matched address, coordinates, tigerLineId, side
    const id = parts[0]?.trim();
    const matchStatus = parts[2]?.trim(); // Match, No_Match, Tie
    const coordStr = parts[5]?.trim(); // "lng,lat"

    if (!id) continue;

    if (matchStatus === "Match" && coordStr) {
      const [lng, lat] = coordStr.split(",").map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        resultMap[id] = { id, lat, lng, source: "census" };
        continue;
      }
    }

    // No match or tie — fall back to Mapbox
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      resultMap[id] = await geocodeWithMapbox(contact);
    } else {
      resultMap[id] = { id, lat: null, lng: null, source: "failed" };
    }
  }

  // Ensure all contacts have a result (some may not appear in Census response)
  for (const c of contacts) {
    if (!resultMap[c.id]) {
      resultMap[c.id] = await geocodeWithMapbox(c);
    }
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

    // Process in batches of 500
    const BATCH_SIZE = 500;
    const allResults: GeoResult[] = [];

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const batchResults = await geocodeBatchWithCensus(batch);
      allResults.push(...batchResults);
    }

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
