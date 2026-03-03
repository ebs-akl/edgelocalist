import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

function decryptSsoPayload(ssoPayload: string): string | null {
  const ssoKey = Deno.env.get("GHL_SSO_KEY");
  if (!ssoKey) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ssoPayload, ssoKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    const decryptedData = JSON.parse(decryptedString);
    return decryptedData.activeLocation ?? decryptedData.locationId ?? decryptedData.location_id ?? null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate inputs
  const tag = typeof body.tag === "string" ? body.tag.trim() : "";
  if (!tag || tag.length > 100) {
    return new Response(JSON.stringify({ error: "Tag is required (max 100 chars)" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contactIds = Array.isArray(body.contact_ids) ? body.contact_ids as string[] : [];
  if (contactIds.length === 0 || contactIds.length > 500) {
    return new Response(JSON.stringify({ error: "Provide 1-500 contact_ids" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Auth: SSO or Bearer ──
  let locationId: string | null = null;

  if (typeof body.sso_payload === "string" && body.sso_payload) {
    locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId) {
      return new Response(JSON.stringify({ error: "Cryptographic verification failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: authRep } = await supabase
      .from("localist_reps")
      .select("ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();
    locationId = authRep?.ghl_location_id ?? null;
  }

  if (!locationId || !LOCATION_ID_RE.test(locationId)) {
    return new Response(JSON.stringify({ error: "Missing or invalid location_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get rep with token
  let { data: rep } = await supabase
    .from("localist_reps")
    .select("id, ghl_access_token, ghl_refresh_token, ghl_expires_at, ghl_location_id")
    .eq("ghl_location_id", locationId)
    .maybeSingle();

  if (!rep?.ghl_access_token) {
    const { data: tokenRep } = await supabase
      .from("localist_reps")
      .select("id, ghl_access_token, ghl_refresh_token, ghl_expires_at, ghl_location_id")
      .not("ghl_access_token", "is", null)
      .limit(1)
      .maybeSingle();
    if (tokenRep?.ghl_access_token) {
      rep = tokenRep;
    } else {
      return new Response(JSON.stringify({ error: "No CRM token found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let accessToken = rep.ghl_access_token!;

  // Refresh if expired
  if (isTokenExpired(rep.ghl_expires_at) && rep.ghl_refresh_token) {
    const newToken = await refreshGhlToken(supabase, rep.id, rep.ghl_refresh_token);
    if (newToken) {
      accessToken = newToken;
    } else {
      return new Response(JSON.stringify({ error: "Token expired. Please reconnect GoHighLevel." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── Apply tag to each contact via GHL API ──
  const results: { contactId: string; success: boolean; error?: string }[] = [];
  let successCount = 0;

  for (const contactId of contactIds) {
    try {
      // First fetch existing tags
      const getRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!getRes.ok) {
        results.push({ contactId, success: false, error: `GET ${getRes.status}` });
        continue;
      }

      const contactData = await getRes.json();
      const existingTags: string[] = contactData.contact?.tags ?? [];

      // Add new tag if not already present
      if (existingTags.includes(tag)) {
        results.push({ contactId, success: true }); // already tagged
        successCount++;
        continue;
      }

      const updatedTags = [...existingTags, tag];

      const putRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ tags: updatedTags }),
        signal: AbortSignal.timeout(10000),
      });

      if (putRes.ok) {
        results.push({ contactId, success: true });
        successCount++;
      } else {
        const errText = await putRes.text();
        console.error(`Tag PUT failed for ${contactId} (${putRes.status}):`, errText);
        results.push({ contactId, success: false, error: "Failed to update contact tags" });
      }
    } catch (err) {
      console.error(`Tag error for ${contactId}:`, err);
      results.push({ contactId, success: false, error: "Request failed" });
    }

    // Rate limit: small delay between calls
    if (contactIds.length > 1) await sleep(200);
  }

  return new Response(JSON.stringify({
    tagged: successCount,
    failed: contactIds.length - successCount,
    tag,
    results,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
