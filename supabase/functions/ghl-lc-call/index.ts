import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Resolve GHL credentials via Bearer token or location_id.
 */
async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  locationId: string | null,
): Promise<{ accessToken: string; ghlLocationId: string } | { error: string; status: number }> {
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) return { error: "GHL not connected", status: 400 };
    return { accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id };
  }

  if (locationId) {
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) return { error: "No rep found for this location_id", status: 400 };
    return { accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id! };
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

  const { contact_id, to_number, location_id } = await req.json() as {
    contact_id: string;
    to_number: string;
    location_id?: string;
  };

  if (!contact_id || !to_number) {
    return new Response(JSON.stringify({ error: "Missing contact_id or to_number" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const creds = await resolveCredentials(supabase, authHeader, location_id || null);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const callRes = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages/outbound",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          Version: "2021-04-15",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "Call",
          contactId: contact_id,
          locationId: creds.ghlLocationId,
          toNumber: to_number,
        }),
      }
    );

    const callData = await callRes.json();

    if (!callRes.ok) {
      console.error("GHL call error:", callData);
      return new Response(JSON.stringify({ error: "GHL call failed", details: callData }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: callData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-lc-call error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
