import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID");

  if (!GHL_CLIENT_ID) {
    return new Response(JSON.stringify({ error: "GHL_CLIENT_ID not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { redirect_uri } = await req.json() as { redirect_uri: string };

  const params = new URLSearchParams({
    response_type: "code",
    client_id: GHL_CLIENT_ID,
    redirect_uri,
    scope: "contacts.readonly contacts.write locations.readonly conversations/message.write",
  });

  const url = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?${params}`;

  return new Response(JSON.stringify({ url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
