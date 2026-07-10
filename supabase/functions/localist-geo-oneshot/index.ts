import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TEMPORARY one-shot geocoder for a single rep_id. Delete after use.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REP_ID = "2da6ce66-ef87-49c3-8014-1a258e58780f";
const BATCH_SIZE = 20;
const DELAY_MS = 150;
const MAX_PER_CALL = 100;



function stripApt(a: string) {
  return a.replace(/\s*(apt|unit|suite|ste|#|bldg|floor|fl)\s*[a-z0-9-]+/gi, "").trim();
}
function isPO(a: string) {
  return /^\s*p\.?\s*o\.?\s*box/i.test(a);
}

async function geocode(street: string, city: string, state: string, zip: string, token: string) {
  const cleaned = stripApt(street);
  if (!cleaned || isPO(cleaned)) return null;
  const q = encodeURIComponent(`${cleaned}, ${city}, ${state} ${zip}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${token}&country=US&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    const c = f?.center;
    if (!c || c.length < 2) return null;
    let county: string | null = null;
    if (Array.isArray(f.context)) {
      const d = f.context.find((x: { id?: string }) => typeof x.id === "string" && x.id.startsWith("district."));
      if (d?.text) county = d.text;
    }
    return { lng: c[0], lat: c[1], county };
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MAPBOX = Deno.env.get("MAPBOX_ACCESS_TOKEN")!;
  const supabase = createClient(SUPABASE_URL, KEY);

  let afterId = "";
  try { const b = await req.json(); if (typeof b.after_id === "string") afterId = b.after_id; } catch { /* ok */ }




  let q = supabase
    .from("localist_contacts")
    .select("id, address, city, state, zip")
    .eq("rep_id", REP_ID)
    .is("latitude", null)
    .not("address", "is", null).not("address", "eq", "")
    .not("city", "is", null).not("state", "is", null).not("zip", "is", null)
    .order("id", { ascending: true })
    .limit(MAX_PER_CALL);
  if (afterId) q = q.gt("id", afterId);
  const { data: contacts } = await q;

  if (!contacts?.length) {
    const { count } = await supabase.from("localist_contacts").select("id", { count: "exact", head: true })
      .eq("rep_id", REP_ID).is("latitude", null);
    return new Response(JSON.stringify({ geocoded: 0, remaining_null_lat: count ?? 0, done: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }


  let geocoded = 0, missed = 0;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (c) => ({
      id: c.id,
      coords: await geocode(c.address ?? "", c.city ?? "", c.state ?? "", c.zip ?? "", MAPBOX),
    })));
    for (const r of results) {
      if (r.coords) {
        await supabase.from("localist_contacts")
          .update({ latitude: r.coords.lat, longitude: r.coords.lng, county: r.coords.county })
          .eq("id", r.id);
        geocoded++;
      } else missed++;
    }
    if (i + BATCH_SIZE < contacts.length) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const { count } = await supabase.from("localist_contacts").select("id", { count: "exact", head: true })
    .eq("rep_id", REP_ID).is("latitude", null);

  const lastId = contacts[contacts.length - 1].id;
  return new Response(JSON.stringify({ geocoded, missed, remaining_null_lat: count ?? 0, last_id: lastId, processed: contacts.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });

});
