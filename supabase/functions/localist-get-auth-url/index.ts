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

  const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID_LOCALIST");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GHL_CLIENT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { redirect_uri?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { redirect_uri } = body;

  // Validate redirect_uri against allowlist
  const ALLOWED_REDIRECTS = new Set([
    "https://edgelocalist.app/callback",
    "https://edgelocalist.lovable.app/callback",
    "https://localist.automatedknifelife.com/callback",
    "https://localist.edgedms.com/callback",
    "https://the.automatedknifelife.com/callback",
  ]);

  const isAllowed = (uri: string | undefined) => {
    if (!uri) return false;
    if (ALLOWED_REDIRECTS.has(uri)) return true;
    try {
      const u = new URL(uri);
      // Allow any Lovable preview/published subdomain on /callback
      if (
        u.protocol === "https:" &&
        u.pathname === "/callback" &&
        (u.hostname.endsWith(".lovable.app") || u.hostname.endsWith(".lovableproject.com"))
      ) {
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  if (!isAllowed(redirect_uri)) {
    return new Response(JSON.stringify({ error: "Invalid redirect_uri" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── CSRF: generate & persist one-time state token (10 minute expiry) ──
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Best-effort tie to authenticated user (may be anonymous for fresh installs)
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (data?.user) userId = data.user.id;
  }

  const { error: stateErr } = await admin.from("oauth_states").insert({
    state,
    user_id: userId,
    expires_at: expiresAt,
  });
  if (stateErr) {
    console.error("Failed to persist oauth state:", stateErr);
    return new Response(JSON.stringify({ error: "Failed to initialize OAuth" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: GHL_CLIENT_ID,
    redirect_uri,
    scope: "contacts.readonly contacts.write users.readonly locations.readonly conversations/message.write locations/customFields.readonly locations/customFields.write",
    state,
  });

  const url = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?${params}`;

  return new Response(JSON.stringify({ url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
