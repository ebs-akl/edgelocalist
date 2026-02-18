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

  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Could not verify user" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { contact_id, to_number } = await req.json() as { contact_id: string; to_number: string };

  if (!contact_id || !to_number) {
    return new Response(JSON.stringify({ error: "Missing contact_id or to_number" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load GHL credentials
  const { data: rep } = await supabase
    .from("localist_reps")
    .select("ghl_access_token, ghl_location_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!rep?.ghl_access_token || !rep?.ghl_location_id) {
    return new Response(JSON.stringify({ error: "GHL not connected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const callRes = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages/outbound`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rep.ghl_access_token}`,
          Version: "2021-04-15",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "Call",
          contactId: contact_id,
          locationId: rep.ghl_location_id,
          toNumber: to_number,
        }),
      }
    );

    const callData = await callRes.json();

    if (!callRes.ok) {
      console.error("GHL call error:", callData);
      return new Response(JSON.stringify({ error: "GHL call failed", details: callData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: callData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-lc-call error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
