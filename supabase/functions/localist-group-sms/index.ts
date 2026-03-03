import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";
import { refreshGhlToken, isTokenExpired } from "../_shared/ghl-refresh-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PHONE_RE = /^\+?[0-9]{7,15}$/;
const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

function decryptSsoPayload(ssoPayload: string): string | null {
  const ssoKey = Deno.env.get("GHL_SSO_KEY");
  if (!ssoKey) { console.error("GHL_SSO_KEY not configured"); return null; }
  try {
    const bytes = CryptoJS.AES.decrypt(ssoPayload, ssoKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    const decryptedData = JSON.parse(decryptedString);
    return decryptedData.activeLocation ?? decryptedData.locationId ?? decryptedData.location_id ?? null;
  } catch (err) { console.error("SSO decryption failed:", err); return null; }
}

async function resolveCredentials(
  supabase: ReturnType<typeof createClient>,
  authHeader: string | null,
  body: Record<string, unknown>,
): Promise<{ repName: string; accessToken: string; ghlLocationId: string; repId: string; refreshToken: string; expiresAt: string | null } | { error: string; status: number }> {
  // 1. Bearer token auth (standalone mode)
  if (authHeader?.startsWith("Bearer ")) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return { error: "Could not verify user", status: 401 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id, ghl_refresh_token, ghl_expires_at, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) return { error: "GHL not connected", status: 400 };
    return { repName: rep.full_name ?? "your rep", accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id, repId: user.id, refreshToken: rep.ghl_refresh_token ?? "", expiresAt: rep.ghl_expires_at };
  }

  // 2. SSO payload auth (GHL iframe mode)
  if (typeof body.sso_payload === "string" && body.sso_payload) {
    const locationId = decryptSsoPayload(body.sso_payload);
    if (!locationId) return { error: "Cryptographic verification failed", status: 401 };
    if (!LOCATION_ID_RE.test(locationId)) return { error: "Invalid location_id", status: 400 };

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("id, ghl_access_token, ghl_location_id, ghl_refresh_token, ghl_expires_at, full_name")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) return { error: "No rep found for this location", status: 400 };
    return { repName: rep.full_name ?? "your rep", accessToken: rep.ghl_access_token, ghlLocationId: rep.ghl_location_id!, repId: rep.id, refreshToken: rep.ghl_refresh_token ?? "", expiresAt: rep.ghl_expires_at };
  }

  return { error: "Missing authorization", status: 401 };
}

const ALLOWED_PLACEHOLDERS = new Set(["first_name", "city", "rep_name"]);

function toTitleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
}

function sanitizeTemplate(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    return ALLOWED_PLACEHOLDERS.has(name) ? match : "";
  });
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
  const authHeader = req.headers.get("Authorization");

  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contacts = rawBody.contacts;
  const message_template = typeof rawBody.message_template === "string" ? rawBody.message_template : "";

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return new Response(JSON.stringify({ error: "Missing or empty contacts array" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!message_template || message_template.length > 918) {
    return new Response(JSON.stringify({ error: "Message template missing or exceeds 918 character limit" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (contacts.length > 2000) {
    return new Response(JSON.stringify({ error: "Maximum 2000 contacts per request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  interface ContactPayload {
    contact_id: string;
    first_name: string;
    city: string;
    phone: string;
  }

  const validContacts: ContactPayload[] = [];
  for (const c of contacts) {
    if (
      typeof c !== "object" || c === null ||
      typeof c.contact_id !== "string" || !c.contact_id.trim() ||
      typeof c.first_name !== "string" ||
      typeof c.phone !== "string" || !PHONE_RE.test(c.phone.replace(/[\s()-]/g, ""))
    ) {
      return new Response(JSON.stringify({ error: "Invalid contact data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    validContacts.push({
      contact_id: c.contact_id.trim(),
      first_name: String(c.first_name).slice(0, 100),
      city: typeof c.city === "string" ? String(c.city).slice(0, 100) : "",
      phone: c.phone.trim(),
    });
  }

  const safeTemplate = sanitizeTemplate(message_template);

  const creds = await resolveCredentials(supabase, authHeader, rawBody);
  if ("error" in creds) {
    return new Response(JSON.stringify({ error: creds.error }), {
      status: creds.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Rate limiting ──
  const HOURLY_LIMIT = 200;
  const DAILY_LIMIT = 500;
  const contactCount = validContacts.length;
  const nowHour = new Date();
  nowHour.setMinutes(0, 0, 0);
  const windowStart = nowHour.toISOString();
  const today = new Date().toISOString().slice(0, 10);

  // Upsert hourly window
  const { data: rl, error: rlErr } = await supabase
    .from("sms_rate_limits")
    .upsert(
      { location_id: creds.ghlLocationId, window_start: windowStart, send_count: 0, daily_start: today, daily_count: 0 },
      { onConflict: "location_id,window_start", ignoreDuplicates: true }
    )
    .select("send_count, daily_count, daily_start")
    .eq("location_id", creds.ghlLocationId)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (rlErr) {
    console.error("Rate limit check failed:", rlErr);
    return new Response(JSON.stringify({ error: "Rate limit check failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const hourlyUsed = rl?.send_count ?? 0;
  const dailyUsed = rl?.daily_start === today ? (rl?.daily_count ?? 0) : 0;
  const hourlyRemaining = Math.max(0, HOURLY_LIMIT - hourlyUsed);
  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyUsed);
  const allowedToSend = Math.min(contactCount, hourlyRemaining, dailyRemaining);

  if (allowedToSend <= 0) {
    return new Response(JSON.stringify({ error: "SMS rate limit reached. Try again later." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contactsToSend = validContacts.slice(0, allowedToSend);
  const skippedContacts = validContacts.slice(allowedToSend);

  const limitReason = hourlyRemaining <= dailyRemaining
    ? `Hourly SMS limit reached (${HOURLY_LIMIT}).`
    : `Daily SMS limit reached (${DAILY_LIMIT}).`;

  // ── Token refresh ──
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

  const results: { contact_id: string; success: boolean; error?: string }[] = skippedContacts.map((c) => ({
    contact_id: c.contact_id,
    success: false,
    error: limitReason,
  }));

  for (const contact of contactsToSend) {
    const msgBody = safeTemplate
      .replace(/\{\{first_name\}\}/g, toTitleCase(contact.first_name))
      .replace(/\{\{city\}\}/g, toTitleCase(contact.city))
      .replace(/\{\{rep_name\}\}/g, toTitleCase(creds.repName));

    try {
      const res = await fetch(
        "https://services.leadconnectorhq.com/conversations/messages/outbound",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeToken}`,
            Version: "2021-04-15",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "SMS",
            contactId: contact.contact_id,
            locationId: creds.ghlLocationId,
            message: msgBody,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("GHL SMS error for contact", contact.contact_id, data);
        results.push({ contact_id: contact.contact_id, success: false, error: "Send failed" });
      } else {
        results.push({ contact_id: contact.contact_id, success: true });
      }
    } catch (err) {
      console.error("ghl-group-sms error:", err);
      results.push({ contact_id: contact.contact_id, success: false, error: "Send failed" });
    }

    const delay = 250 + Math.random() * 200;
    await sleep(delay);
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  // Update rate limit counters with actual sent count
  if (sent > 0) {
    await supabase.rpc("increment_sms_rate_limit", {
      p_location_id: creds.ghlLocationId,
      p_window_start: windowStart,
      p_count: sent,
      p_today: today,
    }).catch((err: unknown) => console.error("Rate limit increment failed:", err));
  }

  return new Response(
    JSON.stringify({ sent, failed, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
