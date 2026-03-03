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

const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 10_000; // 10 seconds between batches

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

interface ContactPayload {
  contact_id: string;
  first_name: string;
  city: string;
  phone: string;
}

/**
 * Drip-send messages in batches of BATCH_SIZE with BATCH_INTERVAL_MS between batches.
 * Runs as a background task via EdgeRuntime.waitUntil.
 */
async function dripSend(
  contacts: ContactPayload[],
  safeTemplate: string,
  activeToken: string,
  ghlLocationId: string,
  repName: string,
  supabase: ReturnType<typeof createClient>,
  windowStart: string,
  today: string,
) {
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    // Send batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map(async (contact) => {
        const msgBody = safeTemplate
          .replace(/\{\{first_name\}\}/g, toTitleCase(contact.first_name))
          .replace(/\{\{city\}\}/g, toTitleCase(contact.city))
          .replace(/\{\{rep_name\}\}/g, toTitleCase(repName));

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
              locationId: ghlLocationId,
              message: msgBody,
            }),
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("GHL SMS error for contact", contact.contact_id, data);
          throw new Error("Send failed");
        }
        // consume body to prevent leaks
        await res.json().catch(() => {});
      })
    );

    const batchSent = batchResults.filter((r) => r.status === "fulfilled").length;
    const batchFailed = batchResults.filter((r) => r.status === "rejected").length;
    totalSent += batchSent;
    totalFailed += batchFailed;

    console.log(`Drip batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchSent} sent, ${batchFailed} failed`);

    // Update rate limit counters after each batch
    if (batchSent > 0) {
      await supabase.rpc("increment_sms_rate_limit", {
        p_location_id: ghlLocationId,
        p_window_start: windowStart,
        p_count: batchSent,
        p_today: today,
      }).catch((err: unknown) => console.error("Rate limit increment failed:", err));
    }

    // Wait between batches (skip wait after last batch)
    if (i + BATCH_SIZE < contacts.length) {
      await sleep(BATCH_INTERVAL_MS);
    }
  }

  console.log(`Drip send complete: ${totalSent} sent, ${totalFailed} failed out of ${contacts.length}`);
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
  const skipped = validContacts.length - allowedToSend;

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

  // ── Kick off background drip send ──
  const totalBatches = Math.ceil(contactsToSend.length / BATCH_SIZE);
  const estimatedSeconds = (totalBatches - 1) * (BATCH_INTERVAL_MS / 1000);

  console.log(`Queuing drip send: ${contactsToSend.length} contacts in ${totalBatches} batches (~${estimatedSeconds}s)`);

  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime.waitUntil(
    dripSend(
      contactsToSend,
      safeTemplate,
      activeToken,
      creds.ghlLocationId,
      creds.repName,
      supabase,
      windowStart,
      today,
    ).catch((err) => console.error("Drip send background error:", err))
  );

  // Return immediately
  return new Response(
    JSON.stringify({
      queued: contactsToSend.length,
      skipped,
      batches: totalBatches,
      estimatedSeconds,
      message: `${contactsToSend.length} messages queued for drip delivery (${BATCH_SIZE} every ${BATCH_INTERVAL_MS / 1000}s).${skipped > 0 ? ` ${skipped} skipped due to rate limits.` : ""}`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
