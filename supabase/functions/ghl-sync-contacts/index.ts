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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify user
  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Could not verify user" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load rep profile for GHL credentials
  const { data: rep, error: repError } = await supabase
    .from("localist_reps")
    .select("ghl_access_token, ghl_location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (repError || !rep?.ghl_access_token || !rep?.ghl_location_id) {
    return new Response(JSON.stringify({ error: "GHL not connected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Paginate through all GHL contacts
    const allContacts: Record<string, unknown>[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const ghlRes = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${rep.ghl_location_id}&limit=${limit}&skip=${(page - 1) * limit}`,
        {
          headers: {
            Authorization: `Bearer ${rep.ghl_access_token}`,
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

      // Safety cap
      if (page > 100) break;
    }

    console.log(`Fetched ${allContacts.length} contacts from GHL`);

    if (allContacts.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map GHL contacts → localist_contacts format
    const rows = allContacts.map((c) => {
      const latStr = getCustomField(c, LAT_FIELD_ID);
      const lngStr = getCustomField(c, LNG_FIELD_ID);
      const lat = latStr ? parseFloat(latStr) : null;
      const lng = lngStr ? parseFloat(lngStr) : null;

      return {
        rep_id: user.id,
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
        lifetime_value: null,
        last_order_date: null,
        last_service_date: null,
        source: "ghl" as const,
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert in batches of 500
    const BATCH_SIZE = 500;
    let totalUpserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from("localist_contacts")
        .upsert(batch, { onConflict: "rep_id,contact_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      } else {
        totalUpserted += batch.length;
      }
    }

    return new Response(JSON.stringify({ synced: totalUpserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-sync-contacts error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
