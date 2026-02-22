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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    console.log("[ghl-webhook-update] Received payload keys:", Object.keys(body));

    // Extract contact_id
    const contactId = body.id || body.contact_id;
    if (!contactId) {
      return new Response(
        JSON.stringify({ error: "Missing contact_id or id in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract location_id
    const locationId =
      body.locationId ||
      body.location_id ||
      body.location?.id ||
      null;

    if (!locationId) {
      return new Response(
        JSON.stringify({ error: "Missing locationId in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract standard fields
    const firstName = body.firstName || body.first_name || null;
    const lastName = body.lastName || body.last_name || null;
    const phone = body.phone ? String(body.phone).replace(/\D/g, "") : null;
    const address = body.address1 || body.address || null;
    const city = body.city || null;
    const state = body.state || null;
    const zip = body.postalCode || body.zip || null;

    // Extract custom fields (Lifetime Value, Last Order Date)
    let lifetimeValue: number | null = null;
    let lastOrderDate: string | null = null;

    const customData = body.customData || body.customFields || body.custom_data;
    if (customData && typeof customData === "object") {
      // Try common key patterns
      for (const [key, val] of Object.entries(customData)) {
        const k = String(key).toLowerCase();
        if (k.includes("lifetime") && k.includes("value")) {
          const parsed = parseFloat(String(val));
          if (!isNaN(parsed)) lifetimeValue = parsed;
        }
        if (k.includes("last") && k.includes("order") && k.includes("date")) {
          lastOrderDate = val ? String(val) : null;
        }
      }
    }

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

    // Upsert the contact
    const { error: upsertErr } = await supabase
      .from("localist_contacts")
      .upsert(
        {
          rep_id: repId,
          contact_id: contactId,
          ghl_contact_id: contactId,
          location_id: locationId,
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
          city,
          state,
          zip,
          lifetime_value: lifetimeValue,
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
