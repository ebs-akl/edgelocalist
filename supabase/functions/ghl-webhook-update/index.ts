import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify shared secret
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (secret !== Deno.env.get("GHL_WEBHOOK_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = await req.json();
    console.log("[ghl-webhook-update] Received payload keys:", Object.keys(payload));

    // 4. Extract the exact data we need
    const contactId = payload.id || payload.contact_id;
    const locationId = payload.locationId || payload.location?.id;

    if (!contactId || !locationId) {
      return new Response(
        JSON.stringify({ error: "Missing Contact ID or Location ID in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GHL sometimes puts custom fields at the root level, sometimes inside customData
    const customData = payload.customData || payload;

    // 🔪 Extract the Knife Emoji fields
    const rawLtv = customData['🔪Lifetime $'] || null;
    const lastOrderDate = customData['🔪Last Order Date'] || null;

    // Clean the LTV string (remove '$', ',', and spaces) and convert to a number
    let parsedLtv = 0;
    if (rawLtv) {
      const cleanLtvString = String(rawLtv).replace(/[^0-9.-]+/g, "");
      parsedLtv = parseFloat(cleanLtvString) || 0;
    }

    // Extract phone
    const phone = payload.phone ? String(payload.phone).replace(/\D/g, "") : null;

    // Find the rep_id for this location
    const { data: rep, error: repErr } = await supabase
      .from("localist_reps")
      .select("id")
      .eq("ghl_location_id", locationId)
      .limit(1)
      .maybeSingle();

    if (repErr || !rep) {
      console.error("[ghl-webhook-update] No rep found for location:", locationId, repErr);
      return new Response(
        JSON.stringify({ error: "No rep found for this location" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const repId = rep.id;

    // 5. Format and upsert the contact
    const { error: upsertErr } = await supabase
      .from("localist_contacts")
      .upsert(
        {
          rep_id: repId,
          contact_id: contactId,
          ghl_contact_id: contactId,
          location_id: locationId,
          first_name: payload.first_name || payload.firstName || '',
          last_name: payload.last_name || payload.lastName || '',
          phone,
          address: payload.address1 || payload.address || '',
          city: payload.city || '',
          state: payload.state || '',
          zip: payload.postalCode || payload.postal_code || '',
          latitude: customData['custom_lat'] ? parseFloat(customData['custom_lat']) : null,
          longitude: customData['custom_lng'] ? parseFloat(customData['custom_lng']) : null,
          lifetime_value: parsedLtv,
          last_order_date: lastOrderDate,
          source: "ghl",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "rep_id,contact_id" }
      );

    if (upsertErr) {
      console.error("[ghl-webhook-update] Upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ error: upsertErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ghl-webhook-update] Upserted contact:", contactId, "for rep:", repId);

    return new Response(
      JSON.stringify({ success: true, contact_id: contactId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ghl-webhook-update] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
