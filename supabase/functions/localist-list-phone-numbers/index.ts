import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

function decryptSsoPayload(ssoPayload: string): string | null {
  const ssoKey = Deno.env.get("GHL_SSO_KEY");
  if (!ssoKey) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ssoPayload, ssoKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    const data = JSON.parse(decryptedString);
    return data.activeLocation ?? data.locationId ?? data.location_id ?? null;
  } catch { return null; }
}

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

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* GET with no body is fine */ }

  const creds = await resolveCredentials(supabase, authHeader, body);
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

  // Fetch phone numbers from GHL
  try {
    const url = `https://services.leadconnectorhq.com/phone-system/numbers/location/${creds.ghlLocationId}?limit=50`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Version: "2021-04-15",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("GHL phone numbers error:", res.status, errData);
      // 404 means phone system not connected — return empty list gracefully
      if (res.status === 404) {
        return new Response(JSON.stringify({ phoneNumbers: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to fetch phone numbers" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    // GHL returns { data: [...] } or { phoneNumbers: [...] }
    const numbers = data?.data ?? data?.phoneNumbers ?? [];

    const phoneNumbers = numbers.map((n: Record<string, unknown>) => ({
      id: n.id ?? n._id ?? "",
      phoneNumber: n.phoneNumber ?? n.phone ?? n.number ?? "",
      friendlyName: n.friendlyName ?? n.name ?? n.label ?? "",
      isDefault: n.isDefault ?? false,
    }));

    return new Response(JSON.stringify({ phoneNumbers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Phone number fetch error:", err);
    return new Response(JSON.stringify({ phoneNumbers: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
