import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  interface ContactPayload {
    contact_id: string;
    first_name: string;
    city: string;
    phone: string;
  }

  const { contacts, message_template } = await req.json() as {
    contacts: ContactPayload[];
    message_template: string; // template with {{first_name}} and {{city}} placeholders
  };

  if (!contacts?.length || !message_template) {
    return new Response(JSON.stringify({ error: "Missing contacts or message_template" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load GHL credentials
  const { data: rep } = await supabase
    .from("localist_reps")
    .select("ghl_access_token, ghl_location_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!rep?.ghl_access_token || !rep?.ghl_location_id) {
    return new Response(JSON.stringify({ error: "GHL not connected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { contact_id: string; success: boolean; error?: string }[] = [];

  for (const contact of contacts) {
    // Personalise message
    const body = message_template
      .replace(/\{\{first_name\}\}/g, contact.first_name)
      .replace(/\{\{city\}\}/g, contact.city)
      .replace(/\{\{rep_name\}\}/g, rep.full_name ?? "your rep");

    try {
      const res = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages/outbound",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${rep.ghl_access_token}`,
            Version: "2021-04-15",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "SMS",
            contactId: contact.contact_id,
            locationId: rep.ghl_location_id,
            message: body,
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

    // Throttle: 1–2 second random delay between sends to mimic organic 1:1 messaging
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
