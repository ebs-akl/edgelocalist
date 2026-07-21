import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";
import { decryptSsoPayloadFull } from "../_shared/sso-decrypt.ts";
import { mintLocationTokenFromAgency } from "../_shared/ghl-location-token.ts";

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
const ORDER_COUNT_FIELD_KEY = "contact.order_count";
const GIFT_COUNT_FIELD_KEY = "contact.gift_count";
const RLT_FIELD_KEY = "contact.rlt";
const BIZ_FIELD_KEY = "contact.biz";
const CAT_FIELD_KEY = "contact.cat";
const LAST_SERVICE_FIELD_KEY = "contact.last_service";

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

function isTimeoutError(err: unknown): boolean {
  const message = getErrorMessage(err).toLowerCase();
  const name = err instanceof Error ? err.name.toLowerCase() : "";
  return name.includes("timeout") || name.includes("abort") || message.includes("timed out") || message.includes("timeout");
}

function getSyncErrorResponse(err: unknown): { message: string; status: number } {
  const message = getErrorMessage(err);
  if (isTimeoutError(err) || /timed out|timeout/i.test(message)) {
    return {
      message: "The CRM took too long to return contacts. Please wait a minute and try again.",
      status: 504,
    };
  }
  if (/rate limit|too many requests/i.test(message)) {
    return {
      message: "The CRM is rate limiting contact sync right now. Please wait a minute and try again.",
      status: 429,
    };
  }
  return { message: message || "Sync failed", status: 500 };
}

async function fetchCrmContactsPage(
  url: string,
  accessToken: string,
  pageNum: number
): Promise<Record<string, unknown>> {
  const maxAttempts = 3;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ghlRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
        signal: AbortSignal.timeout(45000),
      });

      if (ghlRes.ok) {
        return await ghlRes.json();
      }

      const errText = await ghlRes.text();
      const retryAfter = Number.parseInt(ghlRes.headers.get("retry-after") ?? "", 10);
      const canRetry = ghlRes.status === 429 || ghlRes.status >= 500;
      console.error(`CRM API error page ${pageNum} attempt ${attempt} (status ${ghlRes.status}):`, errText);

      if (canRetry && attempt < maxAttempts) {
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 2500);
        continue;
      }

      if (ghlRes.status === 401 || ghlRes.status === 403) {
        throw new Error("CRM authorization failed. Please reconnect your CRM account.");
      }
      if (ghlRes.status === 429) {
        throw new Error("CRM rate limit reached while fetching contacts.");
      }
      throw new Error(`CRM contact fetch failed with status ${ghlRes.status}`);
    } catch (err) {
      lastErr = err;
      console.error(`CRM contact fetch page ${pageNum} attempt ${attempt} failed:`, err);
      if (attempt < maxAttempts && isTimeoutError(err)) {
        await sleep(attempt * 2500);
        continue;
      }
      throw err;
    }
  }

  throw lastErr ?? new Error("CRM contact fetch failed");
}

function getCustomFieldById(contact: Record<string, unknown>, fieldId: string): string | null {
  const fields = contact.customFields as Array<{ id: string; value: string }> ?? [];
  return fields.find((f) => f.id === fieldId)?.value ?? null;
}

type ContactCustomField = { id: string; value: unknown; fieldKey?: string; key?: string };

function looksLikeDate(value: string): boolean {
  const v = value.trim();
  if (!v) return false;

  return (
    /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/.test(v) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v) ||
    /^[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}$/.test(v)
  );
}

function looksLikeEpochMillis(value: number): boolean {
  const abs = Math.abs(value);
  return abs >= 1e11 && abs <= 4e12;
}

function normalizeDateForDb(value: string): string | null {
  const v = value.trim();
  if (!looksLikeDate(v)) return null;

  const parsed = Date.parse(v);
  if (!Number.isFinite(parsed)) return null;

  return new Date(parsed).toISOString().slice(0, 10);
}

function inferMetricFieldIdsFromContacts(
  contacts: Record<string, unknown>[]
): { ltvFieldId: string | null; lastOrdFieldId: string | null } {
  const stats = new Map<string, { numeric: number; date: number; currency: number; highValue: number; latLike: number; epochLike: number; total: number }>();

  for (const contact of contacts.slice(0, 600)) {
    const fields = (contact.customFields as ContactCustomField[] | undefined) ?? [];
    for (const field of fields) {
      if (!field?.id) continue;
      const raw = String(field.value ?? "").trim();
      if (!raw) continue;

      const current = stats.get(field.id) ?? { numeric: 0, date: 0, currency: 0, highValue: 0, latLike: 0, epochLike: 0, total: 0 };
      current.total += 1;

      const cleanedNumeric = raw.replace(/[^0-9.-]+/g, "");
      const parsed = Number.parseFloat(cleanedNumeric);
      if (Number.isFinite(parsed)) {
        const isEpoch = looksLikeEpochMillis(parsed);
        current.numeric += 1;
        if (/[$,]/.test(raw)) current.currency += 1;
        if (Math.abs(parsed) >= 200 && !isEpoch) current.highValue += 1;
        if (Math.abs(parsed) <= 90) current.latLike += 1;
        if (isEpoch) current.epochLike += 1;
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
    const epochRatio = s.total ? s.epochLike / s.total : 0;

    const candidateLtvScore = s.currency * 6 + s.highValue * 2 + s.numeric - s.latLike * 3 - s.epochLike * 8 - s.date * 2;
    if (numericRatio >= 0.5 && epochRatio < 0.2 && candidateLtvScore > ltvScore) {
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
): Promise<{
  latFieldId: string | null; lngFieldId: string | null;
  ltvFieldId: string | null; lastOrdFieldId: string | null;
  orderCountFieldId: string | null; giftCountFieldId: string | null;
  rltFieldId: string | null; bizFieldId: string | null;
  catFieldId: string | null; lastServiceFieldId: string | null;
}> {
  const result = {
    latFieldId: null as string | null, lngFieldId: null as string | null,
    ltvFieldId: null as string | null, lastOrdFieldId: null as string | null,
    orderCountFieldId: null as string | null, giftCountFieldId: null as string | null,
    rltFieldId: null as string | null, bizFieldId: null as string | null,
    catFieldId: null as string | null, lastServiceFieldId: null as string | null,
  };
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
      const key = (f.fieldKey ?? f.key ?? "").toLowerCase();
      if (key === LAT_FIELD_KEY) result.latFieldId = f.id;
      if (key === LNG_FIELD_KEY) result.lngFieldId = f.id;
      if (key === LTV_FIELD_KEY || key.includes("lifetime")) result.ltvFieldId = f.id;
      if (key === LAST_ORD_FIELD_KEY || key.includes("last_order")) result.lastOrdFieldId = f.id;
      if (key === ORDER_COUNT_FIELD_KEY || key.includes("order_count") || key.includes("orders")) result.orderCountFieldId = f.id;
      if (key === GIFT_COUNT_FIELD_KEY || key.includes("gift_count") || key.includes("gifts")) result.giftCountFieldId = f.id;
      if (key === RLT_FIELD_KEY || key.includes("rlt") || key.includes("relationship")) result.rltFieldId = f.id;
      if (key === BIZ_FIELD_KEY || key.includes("biz") || key.includes("business")) result.bizFieldId = f.id;
      if (key === CAT_FIELD_KEY || key.includes("cat") && !key.includes("category_id")) result.catFieldId = f.id;
      if (key === LAST_SERVICE_FIELD_KEY || key.includes("last_service") || key.includes("service_date")) result.lastServiceFieldId = f.id;
    }
    console.log(`Discovered field IDs: lat=${result.latFieldId}, lng=${result.lngFieldId}, ltv=${result.ltvFieldId}, lastOrd=${result.lastOrdFieldId}, orders=${result.orderCountFieldId}, gifts=${result.giftCountFieldId}, rlt=${result.rltFieldId}, biz=${result.bizFieldId}, cat=${result.catFieldId}, lastService=${result.lastServiceFieldId}`);
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

  let companyId: string | null = null;

  if (typeof body.sso_payload === "string" && body.sso_payload) {
    const decoded = decryptSsoPayloadFull(body.sso_payload);
    if (!decoded) {
      return new Response(JSON.stringify({ error: "Cryptographic verification failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    locationId = decoded.locationId;
    companyId = decoded.companyId;
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

  // Look up rep by location_id
  let { data: rep } = await supabase
    .from("localist_reps")
    .select("id, ghl_access_token, ghl_refresh_token, ghl_expires_at, ghl_location_id")
    .eq("ghl_location_id", locationId)
    .maybeSingle();

  // Agency-install fallback: no per-location token stored yet.
  // Mint one on demand from the agency (Company-scoped) token.
  if (rep && !rep.ghl_access_token) {
    const minted = await mintLocationTokenFromAgency(supabase, rep.id, locationId, companyId);
    if (minted) {
      rep = {
        ...rep,
        ghl_access_token: minted,
        ghl_expires_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  if (!rep?.ghl_access_token) {
    return new Response(JSON.stringify({ error: "No CRM connection found for this location. Please connect GoHighLevel first." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

      const ghlData = await fetchCrmContactsPage(url.toString(), accessToken, pageNum);
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
    let { latFieldId, lngFieldId, ltvFieldId, lastOrdFieldId, orderCountFieldId, giftCountFieldId, rltFieldId, bizFieldId, catFieldId, lastServiceFieldId } = await discoverFieldIdsFromContact(accessToken, firstContactId);

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
      let orderCount: number | null = null;
      let giftCount: number | null = null;
      let rlt: string | null = null;
      let biz: string | null = null;
      let cat: string | null = null;
      let lastServiceDate: string | null = null;

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
          const parsedLtv = Number.parseFloat(cleaned);
          lifetimeValue = Number.isFinite(parsedLtv) && !looksLikeEpochMillis(parsedLtv) ? parsedLtv : null;
        }
      }

      // Extract Last Order Date from custom field
      if (lastOrdFieldId) {
        const ordStr = getCustomFieldById(c, lastOrdFieldId);
        if (ordStr) lastOrderDate = normalizeDateForDb(String(ordStr));
      }

      // Extract Cutco metrics from custom fields
      if (orderCountFieldId) {
        const val = getCustomFieldById(c, orderCountFieldId);
        if (val) { const n = parseInt(String(val), 10); orderCount = Number.isFinite(n) ? n : null; }
      }
      if (giftCountFieldId) {
        const val = getCustomFieldById(c, giftCountFieldId);
        if (val) { const n = parseInt(String(val), 10); giftCount = Number.isFinite(n) ? n : null; }
      }
      if (rltFieldId) {
        const val = getCustomFieldById(c, rltFieldId);
        if (val) rlt = String(val).trim() || null;
      }
      if (bizFieldId) {
        const val = getCustomFieldById(c, bizFieldId);
        if (val) biz = String(val).trim() || null;
      }
      if (catFieldId) {
        const val = getCustomFieldById(c, catFieldId);
        if (val) cat = String(val).trim() || null;
      }
      if (lastServiceFieldId) {
        const val = getCustomFieldById(c, lastServiceFieldId);
        if (val) lastServiceDate = normalizeDateForDb(String(val)) ?? String(val).trim();
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
        order_count: orderCount,
        gift_count: giftCount,
        rlt,
        biz,
        cat,
        last_service_date: lastServiceDate,
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
    const { message, status } = getSyncErrorResponse(err);
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
