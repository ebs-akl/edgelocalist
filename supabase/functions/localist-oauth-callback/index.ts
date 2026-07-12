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
  const GHL_CLIENT_SECRET = Deno.env.get("GHL_CLIENT_SECRET_LOCALIST");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!GHL_CLIENT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!GHL_CLIENT_SECRET) {
    console.error("GHL_CLIENT_SECRET_LOCALIST is not defined in environment variables.");
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as { code?: string; redirect_uri?: string; user_type?: string; state?: string };
    const code = body.code;
    const redirect_uri = body.redirect_uri || "https://edgelocalist.app/callback";
    const state = body.state;
    // Default to Location to preserve existing per-sub-account installs;
    // Agency-install callbacks pass user_type: "Company" so we can mint a
    // company-scoped token and stash it in agency_oauth_tokens.
    const userType = body.user_type === "Company" ? "Company" : "Location";

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

    // ── CSRF protection: validate & consume `state` token ──
    const supabaseAdminEarly = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!state || typeof state !== "string" || state.length < 16 || state.length > 128) {
      return new Response(JSON.stringify({ error: "Missing or invalid state token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: stateRow } = await supabaseAdminEarly
      .from("oauth_states")
      .select("id, expires_at")
      .eq("state", state)
      .maybeSingle();
    if (!stateRow) {
      return new Response(JSON.stringify({ error: "Invalid or expired state" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (stateRow.expires_at && new Date(stateRow.expires_at as string).getTime() < Date.now()) {
      await supabaseAdminEarly.from("oauth_states").delete().eq("id", stateRow.id);
      return new Response(JSON.stringify({ error: "State token expired" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Consume state (one-time use)
    await supabaseAdminEarly.from("oauth_states").delete().eq("id", stateRow.id);

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
        user_type: userType,
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
    const { access_token, refresh_token, locationId, companyId } = tokenData;

    if (!access_token) {
      console.error("Invalid token response from GHL:", JSON.stringify(tokenData));
      return new Response(JSON.stringify({ error: "Invalid response from provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Agency-level (Company) install ──
    // Stash the company-scoped token in the shared agency_oauth_tokens table.
    // Per-sub-account access still resolves via the existing per-location
    // install flow (or can be minted on demand via GHL's locationToken API).
    const isCompanyInstall =
      userType === "Company" ||
      tokenData?.userType === "Company" ||
      (!locationId && !!companyId);

    if (isCompanyInstall) {
      if (!companyId) {
        return new Response(JSON.stringify({ error: "Agency install missing companyId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const agencyExpiresAt = new Date(
        Date.now() + (tokenData.expires_in ?? 86400) * 1000
      ).toISOString();
      const { error: agencyErr } = await supabaseAdmin.from("agency_oauth_tokens").upsert({
        provider: "ghl",
        company_id: companyId,
        access_token,
        refresh_token: refresh_token ?? "",
        expires_at: agencyExpiresAt,
        scope: tokenData.scope ?? null,
        user_type: "Company",
        raw: tokenData,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider,company_id" });
      if (agencyErr) {
        console.error("agency_oauth_tokens upsert error:", agencyErr);
        return new Response(JSON.stringify({ error: "Failed to store agency token" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, companyId, mode: "agency" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!locationId) {
      return new Response(JSON.stringify({ error: "Location install missing locationId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = supabaseAdminEarly;

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
      // Location already claimed — require the caller to prove ownership.
      // Unauthenticated re-installs are rejected to prevent token hijack.
      if (!authUserId) {
        return new Response(JSON.stringify({ error: "Sign in required to re-authorize this location" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existingRow.id !== authUserId) {
        return new Response(JSON.stringify({ error: "This location is already connected to another account" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin
        .from("localist_reps")
        .update(tokenPayload)
        .eq("id", existingRow.id);
      saveError = error;
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
