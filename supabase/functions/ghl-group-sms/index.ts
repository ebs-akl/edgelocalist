import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolve GHL credentials via Bearer token or location_id.
 */
async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  locationId: string | null,
): Promise<{ repName: string; accessToken: string; ghlLocationId: string } | { error: string; status: number }> {
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) return { error: "GHL not connected", status: 400 };
    return { repName: rep.full_name ?? "your rep", accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id };
  }

  if (locationId) {
    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id, full_name")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) return { error: "No rep found for this location_id", status: 400 };
    return { repName: rep.full_name ?? "your rep", accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id! };
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

  interface ContactPayload {
    contact_id: string;
    first_name: string;
    city: string;
    phone: string;
  }

  const body = await req.json() as {
    contacts: ContactPayload[];
    message_template: string;
    location_id?: string;
  };

  const { contacts, message_template, location_id } = body;

  if (!contacts?.length || !message_template) {
    return new Response(JSON.stringify({ error: "Missing contacts or message_template" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const creds = await resolveCredentials(supabase, authHeader, location_id || null);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { contact_id: string; success: boolean; error?: string }[] = [];

  for (const contact of contacts) {
    const msgBody = message_template
      .replace(/\{\{first_name\}\}/g, contact.first_name)
      .replace(/\{\{city\}\}/g, contact.city)
      .replace(/\{\{rep_name\}\}/g, creds.repName);

    try {
      const res = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages/outbound",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            Version: "2021-04-15",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "SMS",
            contactId: contact.contact_id,
            locationId: creds.ghlLocationId,
            message: msgBody,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("GHL SMS error for contact", contact.contact_id, data);
        results.push({ contact_id: contact.contact_id, success: false, error: data?.message ?? "Send failed" });
      } else {
        results.push({ contact_id: contact.contact_id, success: true });
      }
    } catch (err) {
      console.error("ghl-group-sms error:", err);
      results.push({ contact_id: contact.contact_id, success: false, error: String(err) });
    }

    const delay = 1000 + Math.random() * 1000;
    await sleep(delay);
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return new Response(
    JSON.stringify({ sent, failed, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
