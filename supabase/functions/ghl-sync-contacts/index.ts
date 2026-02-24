import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GHL custom field keys for lat/lng and Cutco metrics
const LAT_FIELD_KEY = "contact.custom_lat";
const LNG_FIELD_KEY = "contact.custom_lng";
const LTV_FIELD_KEY = "contact.lifetime_";
const LAST_ORD_FIELD_KEY = "contact.last_order_date";

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

function getCustomFieldById(contact: Record<string, unknown>, fieldId: string): string | null {
  const fields = contact.customFields as Array<{ id: string; value: string }> ?? [];
  return fields.find((f) => f.id === fieldId)?.value ?? null;
}

type ContactCustomField = { id: string; value: unknown; fieldKey?: string; key?: string };

function looksLikeDate(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) return true;
  const parsed = Date.parse(v);
  return Number.isFinite(parsed) && v.length >= 8;
}

function inferMetricFieldIdsFromContacts(
  contacts: Record<string, unknown>[]
): { ltvFieldId: string | null; lastOrdFieldId: string | null } {
  const stats = new Map<string, { numeric: number; date: number; currency: number; highValue: number; latLike: number; total: number }>();

  for (const contact of contacts.slice(0, 600)) {
    const fields = (contact.customFields as ContactCustomField[] | undefined) ?? [];
    for (const field of fields) {
      if (!field?.id) continue;
      const raw = String(field.value ?? "").trim();
      if (!raw) continue;

      const current = stats.get(field.id) ?? { numeric: 0, date: 0, currency: 0, highValue: 0, latLike: 0, total: 0 };
      current.total += 1;

      const cleanedNumeric = raw.replace(/[^0-9.-]+/g, "");
      const parsed = Number.parseFloat(cleanedNumeric);
      if (Number.isFinite(parsed)) {
        current.numeric += 1;
        if (/[$,]/.test(raw)) current.currency += 1;
        if (Math.abs(parsed) >= 200) current.highValue += 1;
        if (Math.abs(parsed) <= 90) current.latLike += 1;
      }

      if (looksLikeDate(raw)) {
        current.date += 1;
      }

      stats.set(field.id, current);
    }
  }

  let ltvFieldId: string | null = null;
  let ltvScore = Number.NEGATIVE_INFINITY;
  let lastOrdFieldId: string | null = null;
  let dateScore = Number.NEGATIVE_INFINITY;

  for (const [fieldId, s] of stats.entries()) {
    const numericRatio = s.total ? s.numeric / s.total : 0;
    const dateRatio = s.total ? s.date / s.total : 0;

    const candidateLtvScore = s.currency * 4 + s.highValue * 2 + s.numeric - s.latLike * 2;
    if (numericRatio >= 0.5 && candidateLtvScore > ltvScore) {
      ltvScore = candidateLtvScore;
      ltvFieldId = fieldId;
    }

    if (dateRatio >= 0.5 && s.date > dateScore) {
      dateScore = s.date;
      lastOrdFieldId = fieldId;
    }
  }

  console.log(`Fallback inference candidates inspected: ${stats.size}. inferred ltv=${ltvFieldId}, lastOrd=${lastOrdFieldId}`);
  return { ltvFieldId, lastOrdFieldId };
}

async function discoverFieldIdsFromContact(
  accessToken: string,
  contactId: string
): Promise<{ latFieldId: string | null; lngFieldId: string | null; ltvFieldId: string | null; lastOrdFieldId: string | null }> {
  const result = { latFieldId: null as string | null, lngFieldId: null as string | null, ltvFieldId: null as string | null, lastOrdFieldId: null as string | null };
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`Failed to fetch single contact for field discovery: ${res.status}`);
      return result;
    }
    const data = await res.json();
    const contact = data.contact ?? data;
    const fields = contact.customFields as Array<{ id: string; value: unknown; fieldKey?: string; key?: string }> ?? [];
    console.log(`Field discovery from contact ${contactId}: ${JSON.stringify(fields.map(f => ({ id: f.id, key: f.fieldKey ?? f.key })))}`);
    for (const f of fields) {
      const key = f.fieldKey ?? f.key ?? "";
      if (key === LAT_FIELD_KEY) result.latFieldId = f.id;
      if (key === LNG_FIELD_KEY) result.lngFieldId = f.id;
      if (key === LTV_FIELD_KEY || key.includes("lifetime")) result.ltvFieldId = f.id;
      if (key === LAST_ORD_FIELD_KEY || key.includes("last_order")) result.lastOrdFieldId = f.id;
    }
    console.log(`Discovered field IDs: lat=${result.latFieldId}, lng=${result.lngFieldId}, ltv=${result.ltvFieldId}, lastOrd=${result.lastOrdFieldId}`);
    return result;
  } catch (err) {
    console.error("Error discovering custom field IDs:", err);
    return result;
  }
}

function toTitleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
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
      console.log(`Using rep ${tokenRep.id} with token for location ${tokenRep.ghl_location_id} (SSO location: ${locationId})`);
      rep = tokenRep;
    } else {
      return new Response(JSON.stringify({ error: "No rep found for this location" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const repId = rep.id;
  let accessToken = rep.ghl_access_token!;
  const ghlLocationId = rep.ghl_location_id!;

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

  // Stats-only mode: return contact count, searchable count, and last sync for this rep
  if (statsOnly) {
    const { count, data } = await supabase
      .from("localist_contacts")
      .select("updated_at", { count: "exact", head: false })
      .eq("rep_id", repId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const { count: searchableCount } = await supabase
      .from("localist_contacts")
      .select("id", { count: "exact", head: true })
      .eq("rep_id", repId)
      .not("latitude", "is", null);

    return new Response(JSON.stringify({
      count: count ?? 0,
      searchable: searchableCount ?? 0,
      last_sync: data?.[0]?.updated_at ?? null,
      rep_id: repId,
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

    // Discover custom field IDs by fetching a single contact's full details
    const firstContactId = allContacts[0].id as string;
    let { latFieldId, lngFieldId, ltvFieldId, lastOrdFieldId } = await discoverFieldIdsFromContact(accessToken, firstContactId);

    // Fallback: infer IDs directly from contact values when GHL omits fieldKey metadata
    if (!ltvFieldId || !lastOrdFieldId) {
      const inferred = inferMetricFieldIdsFromContacts(allContacts);
      if (!ltvFieldId) ltvFieldId = inferred.ltvFieldId;
      if (!lastOrdFieldId) lastOrdFieldId = inferred.lastOrdFieldId;
      console.log(`Post-fallback field IDs: ltv=${ltvFieldId}, lastOrd=${lastOrdFieldId}`);
    }

    let coordCount = 0;
    const rows = allContacts.map((c) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let lifetimeValue: number | null = null;
      let lastOrderDate: string | null = null;

      if (latFieldId && lngFieldId) {
        const latStr = getCustomFieldById(c, latFieldId);
        const lngStr = getCustomFieldById(c, lngFieldId);
        lat = latStr ? parseFloat(String(latStr)) : null;
        lng = lngStr ? parseFloat(String(lngStr)) : null;
        if (isNaN(lat!)) lat = null;
        if (isNaN(lng!)) lng = null;
        if (lat !== null && lng !== null) coordCount++;
      }

      // Extract LTV from custom field
      if (ltvFieldId) {
        const ltvStr = getCustomFieldById(c, ltvFieldId);
        if (ltvStr) {
          const cleaned = String(ltvStr).replace(/[^0-9.-]+/g, "");
          lifetimeValue = parseFloat(cleaned) || null;
        }
      }

      // Extract Last Order Date from custom field
      if (lastOrdFieldId) {
        const ordStr = getCustomFieldById(c, lastOrdFieldId);
        if (ordStr) lastOrderDate = String(ordStr);
      }

      return {
        rep_id: repId,
        contact_id: c.id as string,
        first_name: toTitleCase((c.firstName as string) ?? ""),
        last_name: toTitleCase((c.lastName as string) ?? ""),
        phone: ((c.phone as string) ?? "").replace(/\D/g, ""),
        address: (c.address1 as string) ?? "",
        city: (c.city as string) ?? "",
        state: (c.state as string) ?? "",
        zip: (c.postalCode as string) ?? "",
        latitude: lat,
        longitude: lng,
        lifetime_value: lifetimeValue,
        last_order_date: lastOrderDate,
      };
    });

    console.log(`Contacts with pre-existing coordinates: ${coordCount}/${allContacts.length}`);

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
