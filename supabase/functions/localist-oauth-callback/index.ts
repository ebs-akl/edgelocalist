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

  const GHL_CLIENT_ID = Deno.env.get("GHL_CLIENT_ID");
  const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GHL_CLIENT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!GHL_CLIENT_SECRET) {
    console.error("GHL_CLIENT_SECRET is not defined in environment variables.");
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { code?: string; redirect_uri?: string };
    const code = body.code;
    const redirect_uri = body.redirect_uri || "https://edgelocalist.app/callback";

    // Input validation
    if (!code || typeof code !== "string" || code.length > 2048) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!redirect_uri || typeof redirect_uri !== "string" || !redirect_uri.startsWith("https://")) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchanging authorization code for tokens

    // Exchange code for tokens
    const tokenRes = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Version": "2021-07-28",
      },
      body: new URLSearchParams({
        client_id: GHL_CLIENT_ID,
        client_secret: GHL_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        user_type: "Location",
        redirect_uri,
      }),
    });

    const responseText = await tokenRes.text();

    if (!tokenRes.ok) {
      console.error(`GHL OAuth error (${tokenRes.status}):`, responseText);
      return new Response(JSON.stringify({ error: "OAuth authentication failed", hint: "Please try reconnecting GoHighLevel" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (_) {
      console.error("Failed to parse GHL success response:", responseText);
      return new Response(JSON.stringify({ error: "Invalid response from provider" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { access_token, refresh_token, locationId } = tokenData;

    if (!access_token || !locationId) {
      console.error("Invalid token response from GHL:", JSON.stringify(tokenData));
      return new Response(JSON.stringify({ error: "Invalid response from provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate expiry timestamp
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Resolve the authenticated user (if any)
    let authUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (user) authUserId = user.id;
    }

    // Check if this location already exists
    const { data: existingRow } = await supabaseAdmin
      .from("localist_reps")
      .select("id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    const tokenPayload = {
      ghl_location_id: locationId,
      ghl_access_token: access_token,
      ghl_refresh_token: refresh_token ?? null,
      ghl_expires_at: expiresAt,
      subscription_tier: "edgedms",
    };

    let saveError;
    if (existingRow) {
      // Location already claimed — only the owner or the same auth user can re-authorize
      if (authUserId && existingRow.id !== authUserId) {
        // Different authenticated user trying to claim an already-owned location
        return new Response(JSON.stringify({ error: "This location is already connected to another account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Update existing row (same owner or unauthenticated re-install)
      const { error } = await supabaseAdmin
        .from("localist_reps")
        .update(tokenPayload)
        .eq("id", existingRow.id);
      saveError = error;

      // If authenticated user matches, also ensure their row is updated
      if (authUserId && existingRow.id === authUserId) {
        // Already updated above via existingRow.id
      }
    } else {
      // New location — use authenticated user's ID if available, otherwise generate UUID
      const repId = authUserId ?? crypto.randomUUID();
      const { error } = await supabaseAdmin
        .from("localist_reps")
        .upsert({ ...tokenPayload, id: repId }, { onConflict: "id" });
      saveError = error;
    }

    return new Response(JSON.stringify({ success: true, locationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-oauth-callback error:", err);
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
