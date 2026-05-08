import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";
import { decryptSsoPayload } from "../_shared/sso-decrypt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;
const CUSTOM_VALUE_NAME = "localist_sms_message";

async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  body: Record<string, unknown>,
): Promise<{ accessToken: string; ghlLocationId: string; repId: string; refreshToken: string; expiresAt: string | null } | { error: string; status: number }> {
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id, ghl_refresh_token, ghl_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) return { error: "GHL not connected", status: 400 };
    return { accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id, repId: user.id, refreshToken: rep.ghl_refresh_token ?? "", expiresAt: rep.ghl_expires_at };
  }

  if (typeof body.sso_payload === "string" && body.sso_payload) {
    const locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId) return { error: "Cryptographic verification failed", status: 401 };
    if (!LOCATION_ID_RE.test(locationId)) return { error: "Invalid location_id", status: 400 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("id, ghl_access_token, ghl_location_id, ghl_refresh_token, ghl_expires_at")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) return { error: "No rep found for this location", status: 400 };
    return { accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id!, repId: rep.id, refreshToken: rep.ghl_refresh_token ?? "", expiresAt: rep.ghl_expires_at };
  }

  return { error: "Missing authorization", status: 401 };
}

/**
 * Find or create the "localist_sms_message" custom value, then update it.
 */
async function setCustomValue(
  accessToken: string,
  locationId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = "https://services.leadconnectorhq.com";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  // 1. List existing custom values to find ours
  const listRes = await fetch(`${baseUrl}/locations/${locationId}/customValues`, {
    method: "GET",
    headers,
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error(`List custom values failed (${listRes.status}):`, errText);
    return { success: false, error: `Failed to list custom values: ${listRes.status}` };
  }

  const listData = await listRes.json();
  const customValues: Array<{ id: string; name: string; value: string }> = listData.customValues ?? [];

  // Match by name or fieldKey (GHL generates a fieldKey from the name)
  const normalise = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "_");
  const existing = customValues.find(
    (cv: any) =>
      normalise(cv.name) === CUSTOM_VALUE_NAME ||
      cv.name === CUSTOM_VALUE_NAME ||
      cv.fieldKey === CUSTOM_VALUE_NAME ||
      normalise(cv.fieldKey ?? "") === CUSTOM_VALUE_NAME
  );

  if (existing) {
    // 2a. Update existing custom value
    const updateRes = await fetch(`${baseUrl}/locations/${locationId}/customValues/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name: existing.name, value: message }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error(`Update custom value failed (${updateRes.status}):`, errText);
      return { success: false, error: `Failed to update custom value: ${updateRes.status}` };
    }

    console.log(`Updated custom value "${existing.name}" (${existing.id})`);
    return { success: true };
  } else {
    // 2b. Create new custom value
    const createRes = await fetch(`${baseUrl}/locations/${locationId}/customValues`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: CUSTOM_VALUE_NAME, value: message }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      console.log(`Created custom value "${CUSTOM_VALUE_NAME}" (${createData.customValue?.id ?? "unknown"})`);
      return { success: true };
    }

    // 2c. Fallback: if create fails because key already exists, re-fetch and update
    const errText = await createRes.text();
    if (createRes.status === 400 && errText.includes("already exists")) {
      console.log("Custom value exists but wasn't matched — re-fetching to update...");
      const retryList = await fetch(`${baseUrl}/locations/${locationId}/customValues`, { method: "GET", headers });
      if (retryList.ok) {
        const retryData = await retryList.json();
        const allCvs: any[] = retryData.customValues ?? [];
        // Find by any field containing our name
        const match = allCvs.find((cv: any) =>
          JSON.stringify(cv).toLowerCase().includes("localist_sms_message") ||
          JSON.stringify(cv).toLowerCase().includes("localist sms message")
        );
        if (match) {
          const updateRes2 = await fetch(`${baseUrl}/locations/${locationId}/customValues/${match.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ name: match.name, value: message }),
          });
          if (updateRes2.ok) {
            console.log(`Fallback update succeeded for "${match.name}" (${match.id})`);
            return { success: true };
          }
        }
      }
    }

    console.error(`Create custom value failed (${createRes.status}):`, errText);
    return { success: false, error: `Failed to create custom value: ${createRes.status}` };
  }
}

Deno.serve(async (req) => {
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

  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate message
  const message = typeof rawBody.message === "string" ? rawBody.message.trim() : "";
  if (!message || message.length > 1000) {
    return new Response(JSON.stringify({ error: "Message is required (max 1000 chars)" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve credentials
  const creds = await resolveCredentials(supabase, authHeader, rawBody);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Token refresh
  let activeToken = creds.accessToken;
  if (isTokenExpired(creds.expiresAt)) {
    const refreshed = await refreshGhlToken(supabase, creds.repId, creds.refreshToken);
    if (refreshed) {
      activeToken = refreshed;
    } else {
      return new Response(JSON.stringify({ error: "GHL token expired. Please reconnect your CRM." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Set the custom value
  const result = await setCustomValue(activeToken, creds.ghlLocationId, message);

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Custom value "localist_sms_message" updated. Use {{custom_values.${CUSTOM_VALUE_NAME}}} in your GHL Workflow.`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
