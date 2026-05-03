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

/**
 * Decrypt the SSO payload from GHL Custom Page handshake.
 * Returns the locationId or null on failure.
 */
function decryptSsoPayload(ssoPayload: string): string | null {
  const ssoKey = Deno.env.get("GHL_SSO_KEY");
  if (!ssoKey) {
    console.error("GHL_SSO_KEY not configured");
    return null;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(ssoPayload, ssoKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    const decryptedData = JSON.parse(decryptedString);
    return decryptedData.activeLocation ?? decryptedData.locationId ?? decryptedData.location_id ?? null;
  } catch (err) {
    console.error("SSO decryption failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin client — bypasses RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Resolve location_id: SSO payload or Bearer auth (no raw location_id) ──
  let locationId: string | null = null;

  if (typeof body.sso_payload === "string" && body.sso_payload) {
    locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId) {
      return new Response(JSON.stringify({ error: "Cryptographic verification failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // Require Bearer auth for non-SSO mode
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

  const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 100) : 100;
  const skip = typeof body.skip === "number" ? Math.max(body.skip, 0) : 0;

  // Validate location_id
  if (!locationId || !LOCATION_ID_RE.test(locationId)) {
    return new Response(JSON.stringify({ error: "Missing or invalid location_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look up rep strictly by location_id (no cross-rep fallback for data isolation)
  const { data: rep } = await supabase
    .from("localist_reps")
    .select("id, ghl_access_token, ghl_refresh_token, ghl_expires_at, ghl_location_id")
    .eq("ghl_location_id", locationId)
    .maybeSingle();

  if (!rep?.ghl_access_token) {
    return new Response(JSON.stringify({ error: "No CRM token found for this location." }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rep?.ghl_location_id) {
    return new Response(JSON.stringify({ error: "No CRM token found for this location." }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const repId = rep.id;
  let accessToken = rep.ghl_access_token!;
  const ghlLocationId = rep.ghl_location_id;

  // Auto-refresh expired token
  if (isTokenExpired(rep.ghl_expires_at) && rep.ghl_refresh_token) {
    console.log(`Token expired for rep ${repId}, attempting refresh...`);
    const newToken = await refreshGhlToken(supabase, repId, rep.ghl_refresh_token);
    if (newToken) {
      accessToken = newToken;
    } else {
      return new Response(JSON.stringify({ error: "CRM token expired and refresh failed. Please reconnect GoHighLevel." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ── Fetch contacts from GoHighLevel API ──
  try {
    const fetchUrl = new URL("https://services.leadconnectorhq.com/contacts/");
    fetchUrl.searchParams.set("locationId", ghlLocationId);
    fetchUrl.searchParams.set("limit", String(limit));
    const ghlRes = await fetch(fetchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20000),
      }
    );

    if (ghlRes.status === 401) {
      console.error("GHL API returned 401 for location:", ghlLocationId);
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ghlRes.ok) {
      console.error("GHL API error:", ghlRes.status);
      return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ghlData = await ghlRes.json();
    const contacts: Record<string, unknown>[] = ghlData.contacts ?? [];

    // ── Smart Upsert into localist_contacts ──
    if (contacts.length > 0) {
      const rows = contacts.map((c) => ({
        rep_id: repId,
        contact_id: (c.id as string) ?? "",
        first_name: (c.firstName as string) ?? "",
        last_name: (c.lastName as string) ?? "",
        phone: ((c.phone as string) ?? "").replace(/\D/g, ""),
        address: (c.address1 as string) ?? "",
        city: (c.city as string) ?? "",
        state: (c.state as string) ?? "",
        zip: (c.postalCode as string) ?? "",
        latitude: null as number | null,
        longitude: null as number | null,
      }));

      const BATCH_SIZE = 200;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error: rpcError } = await supabase.rpc(
          "smart_upsert_ghl_contacts",
          { p_rep_id: repId, p_contacts: batch }
        );
        if (rpcError) {
          console.error("Smart upsert error:", rpcError);
        }
      }
    }

    // ── Return the full contact list for this rep from DB ──
    const { data: allContacts, error: fetchErr } = await supabase
      .from("localist_contacts")
      .select("*")
      .eq("rep_id", repId)
      .order("updated_at", { ascending: false })
      .limit(1000);

    if (fetchErr) {
      console.error("Error fetching contacts from DB:", fetchErr);
      return new Response(JSON.stringify({ error: "Failed to retrieve contacts" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ contacts: allContacts ?? [], meta: ghlData.meta ?? {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-fetch-contacts error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
