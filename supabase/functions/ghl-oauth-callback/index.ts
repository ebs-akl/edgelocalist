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

  if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { code?: string; redirect_uri?: string };
    const { code, redirect_uri } = body;

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
        redirect_uri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("GHL token exchange failed. Status:", tokenRes.status, "Body:", errBody);
      let ghlError = { error: `GHL API error (${tokenRes.status})`, error_description: errBody };
      try {
        const parsed = JSON.parse(errBody);
        ghlError = {
          error: parsed.error || ghlError.error,
          error_description: parsed.error_description || parsed.message || errBody,
        };
      } catch (_) { /* use raw text fallback */ }
      return new Response(JSON.stringify(ghlError), {
        status: tokenRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, locationId } = tokenData;

    if (!access_token || !locationId) {
      console.error("Invalid token response from GHL:", JSON.stringify(tokenData));
      return new Response(JSON.stringify({ error: "Invalid response from provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to identify user from Authorization header first, then fall back to locationId lookup
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (!userError && user) {
        userId = user.id;
      }
    }

    if (userId) {
      // Authenticated user — update by user id
      const { error: updateError } = await supabase
        .from("localist_reps")
        .update({
          ghl_access_token: access_token,
          ghl_refresh_token: refresh_token ?? null,
          ghl_location_id: locationId,
          subscription_tier: "edgedms",
        })
        .eq("id", userId);

      if (updateError) {
        console.error("DB update error (by user):", updateError);
        return new Response(JSON.stringify({ error: "Failed to save credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Unauthenticated (GHL Marketplace install) — upsert by locationId
      const { error: upsertError } = await supabase
        .from("localist_reps")
        .update({
          ghl_access_token: access_token,
          ghl_refresh_token: refresh_token ?? null,
          subscription_tier: "edgedms",
        })
        .eq("ghl_location_id", locationId);

      if (upsertError) {
        console.error("DB update error (by location):", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
