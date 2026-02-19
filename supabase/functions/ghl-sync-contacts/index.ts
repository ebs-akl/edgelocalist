import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GHL custom field IDs for lat/lng
const LAT_FIELD_ID = "ZVN9RS1nJEZfNbMVqGVN";
const LNG_FIELD_ID = "VI1lTTp020TB9ycXII1e";

function getCustomField(contact: Record<string, unknown>, fieldId: string): string | null {
  const fields = contact.customFields as Array<{ id: string; value: string }> ?? [];
  return fields.find((f) => f.id === fieldId)?.value ?? null;
}

/**
 * Resolve GHL credentials via either:
 *   1. Bearer token → Supabase auth → localist_reps by user id
 *   2. location_id in body → localist_reps by ghl_location_id
 */
async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  locationId: string | null,
): Promise<{ repId: string; accessToken: string; ghlLocationId: string } | { error: string; status: number }> {
  // Pathway A: Bearer token (standalone mode)
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) return { error: "GHL not connected", status: 400 };
    return { repId: user.id, accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id };
  }

  // Pathway B: location_id (GHL iframe mode)
  if (locationId) {
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("id, ghl_access_token, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) return { error: "No rep found for this location_id", status: 400 };
    return { repId: rep.id, accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id! };
  }

  return { error: "Missing Authorization header or location_id", status: 401 };
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

  // Parse body (may contain location_id and/or stats_only)
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body is fine for GET-like calls */ }

  const locationId = (body.location_id as string) || null;
  const statsOnly = !!(body.stats_only);

  const creds = await resolveCredentials(supabase, authHeader, locationId);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Stats-only mode: return contact count and last sync for this rep
  if (statsOnly) {
    const { count, data } = await supabase
      .from("localist_contacts")
      .select("updated_at", { count: "exact", head: false })
      .eq("rep_id", creds.repId)
      .order("updated_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({
      count: count ?? 0,
      last_sync: data?.[0]?.updated_at ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    // Paginate through all GHL contacts
    const allContacts: Record<string, unknown>[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const ghlRes = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${creds.ghlLocationId}&limit=${limit}&skip=${(page - 1) * limit}`,
        {
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            Version: "2021-07-28",
          },
          signal: AbortSignal.timeout(20000),
        }
      );

      if (!ghlRes.ok) {
        const errText = await ghlRes.text();
        console.error(`GHL API error page ${page}:`, errText);
        break;
      }

      const ghlData = await ghlRes.json();
      const contacts: Record<string, unknown>[] = ghlData.contacts ?? [];
      allContacts.push(...contacts);

      if (contacts.length < limit) break;
      page++;
      if (page > 100) break;
    }

    console.log(`Fetched ${allContacts.length} contacts from GHL`);

    if (allContacts.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = allContacts.map((c) => {
      const latStr = getCustomField(c, LAT_FIELD_ID);
      const lngStr = getCustomField(c, LNG_FIELD_ID);
      const lat = latStr ? parseFloat(latStr) : null;
      const lng = lngStr ? parseFloat(lngStr) : null;

      return {
        rep_id: creds.repId,
        contact_id: c.id as string,
        first_name: (c.firstName as string) ?? "",
        last_name: (c.lastName as string) ?? "",
        phone: ((c.phone as string) ?? "").replace(/\D/g, ""),
        address: (c.address1 as string) ?? "",
        city: (c.city as string) ?? "",
        state: (c.state as string) ?? "",
        zip: (c.postalCode as string) ?? "",
        latitude: isNaN(lat!) ? null : lat,
        longitude: isNaN(lng!) ? null : lng,
      };
    });

    // Smart upsert: matches on phone to merge CSV→GHL contacts,
    // preserves existing geocoded coordinates, upgrades source to 'ghl'
    const BATCH_SIZE = 200;
    let totalUpserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error: rpcError } = await supabase.rpc(
        "smart_upsert_ghl_contacts",
        { p_contacts: JSON.stringify(batch) }
      );

      if (rpcError) {
        console.error("Smart upsert error:", rpcError);
      } else {
        totalUpserted += (data as number) ?? batch.length;
      }
    }

    return new Response(JSON.stringify({ synced: totalUpserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-sync-contacts error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
