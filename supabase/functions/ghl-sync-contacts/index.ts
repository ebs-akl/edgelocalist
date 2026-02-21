import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GHL custom field IDs for lat/lng
const LAT_FIELD_ID = "ZVN9RS1nJEZfNbMVqGVN";
const LNG_FIELD_ID = "VI1lTTp020TB9ycXII1e";

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

function getCustomField(contact: Record<string, unknown>, fieldId: string): string | null {
  const fields = contact.customFields as Array<{ id: string; value: string }> ?? [];
  return fields.find((f) => f.id === fieldId)?.value ?? null;
}

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
    // GHL SSO payloads use "activeLocation" — fall back to other known names
    return decryptedData.activeLocation ?? decryptedData.locationId ?? decryptedData.location_id ?? null;
  } catch (err) {
    console.error("SSO decryption failed:", err);
    return null;
  }
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

  // Parse body
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

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

  const statsOnly = !!(body.stats_only);

  // Validate location_id
  if (!locationId || !LOCATION_ID_RE.test(locationId)) {
    return new Response(JSON.stringify({ error: "Missing or invalid location_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look up rep by location_id, then fallback to any rep with a token
  let { data: rep } = await supabase
    .from("localist_reps")
    .select("id, ghl_access_token, ghl_location_id")
    .eq("ghl_location_id", locationId)
    .maybeSingle();

  if (!rep?.ghl_access_token) {
    // Fallback: find any rep with a valid GHL token (location may have changed)
    const { data: tokenRep } = await supabase
      .from("localist_reps")
      .select("id, ghl_access_token, ghl_location_id")
      .not("ghl_access_token", "is", null)
      .limit(1)
      .maybeSingle();

    if (tokenRep?.ghl_access_token) {
      console.log(`Using rep ${tokenRep.id} with token for location ${tokenRep.ghl_location_id} (SSO location: ${locationId})`);
      rep = tokenRep; // Keep original ghl_location_id for API calls
    } else {
      return new Response(JSON.stringify({ error: "No rep found for this location" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const repId = rep.id;
  const accessToken = rep.ghl_access_token;
  const ghlLocationId = rep.ghl_location_id!;

  // Stats-only mode: return contact count and last sync for this rep
  if (statsOnly) {
    const { count, data } = await supabase
      .from("localist_contacts")
      .select("updated_at", { count: "exact", head: false })
      .eq("rep_id", repId)
      .order("updated_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({
      count: count ?? 0,
      last_sync: data?.[0]?.updated_at ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    // Paginate through all GHL contacts using cursor-based pagination
    const allContacts: Record<string, unknown>[] = [];
    const limit = 100;
    let startAfter: string | undefined;
    let startAfterId: string | undefined;
    let pageNum = 0;

    while (true) {
      const url = new URL("https://services.leadconnectorhq.com/contacts/");
      url.searchParams.set("locationId", ghlLocationId);
      url.searchParams.set("limit", String(limit));
      if (startAfter) url.searchParams.set("startAfter", startAfter);
      if (startAfterId) url.searchParams.set("startAfterId", startAfterId);

      const ghlRes = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!ghlRes.ok) {
        const errText = await ghlRes.text();
        console.error(`GHL API error page ${pageNum} (status ${ghlRes.status}):`, errText);
        return new Response(JSON.stringify({ error: `GHL API error: ${errText}` }), {
          status: ghlRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ghlData = await ghlRes.json();
      const contacts: Record<string, unknown>[] = ghlData.contacts ?? [];
      allContacts.push(...contacts);

      // Use cursor from meta for next page
      const meta = ghlData.meta;
      if (contacts.length < limit || !meta?.startAfter || !meta?.startAfterId) break;
      startAfter = meta.startAfter;
      startAfterId = meta.startAfterId;
      pageNum++;
      if (pageNum > 150) break;
    }

    console.log(`Fetched ${allContacts.length} contacts from GHL`);

    if (allContacts.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = allContacts.map((c) => {
      const latStr = getCustomField(c, LAT_FIELD_ID);
      const lngStr = getCustomField(c, LNG_FIELD_ID);
      const lat = latStr ? parseFloat(latStr) : null;
      const lng = lngStr ? parseFloat(lngStr) : null;

      return {
        rep_id: repId,
        contact_id: c.id as string,
        first_name: (c.firstName as string) ?? "",
        last_name: (c.lastName as string) ?? "",
        phone: ((c.phone as string) ?? "").replace(/\D/g, ""),
        address: (c.address1 as string) ?? "",
        city: (c.city as string) ?? "",
        state: (c.state as string) ?? "",
        zip: (c.postalCode as string) ?? "",
        latitude: isNaN(lat!) ? null : lat,
        longitude: isNaN(lng!) ? null : lng,
      };
    });

    // Smart upsert in batches
    const BATCH_SIZE = 200;
    let totalUpserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error: rpcError } = await supabase.rpc(
        "smart_upsert_ghl_contacts",
        { p_rep_id: repId, p_contacts: batch }
      );

      if (rpcError) {
        console.error("Smart upsert error:", rpcError);
      } else {
        totalUpserted += (data as number) ?? batch.length;
      }
    }

    return new Response(JSON.stringify({ synced: totalUpserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-sync-contacts error:", err);
    return new Response(JSON.stringify({ error: "Sync failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
