import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-ghl-secret",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;

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

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const locationId = typeof body.location_id === "string" ? body.location_id.trim() : null;
  const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 100) : 100;
  const skip = typeof body.skip === "number" ? Math.max(body.skip, 0) : 0;

  // Resolve credentials: Bearer token (standalone) or location_id + shared secret (GHL iframe)
  let accessToken: string;
  let ghlLocationId: string;

  if (authHeader?.startsWith("Bearer ")) {
    // Standalone mode: verify user via Supabase auth
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Could not verify user" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!rep?.ghl_access_token || !rep?.ghl_location_id) {
      return new Response(JSON.stringify({ error: "No CRM token found for this location" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    accessToken = rep.ghl_access_token;
    ghlLocationId = rep.ghl_location_id;
  } else if (locationId) {
    // GHL iframe mode: validate shared secret
    if (!locationId || !LOCATION_ID_RE.test(locationId)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sharedSecret = Deno.env.get("GHL_SHARED_SECRET");
    const providedSecret = req.headers.get("x-ghl-secret");
    if (!sharedSecret || providedSecret !== sharedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rep } = await supabase
      .from("localist_reps")
      .select("ghl_access_token, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .maybeSingle();

    if (!rep?.ghl_access_token) {
      return new Response(JSON.stringify({ error: "No CRM token found for this location" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    accessToken = rep.ghl_access_token;
    ghlLocationId = rep.ghl_location_id!;
  } else {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Call GoHighLevel API
  try {
    const ghlRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(ghlLocationId)}&limit=${limit}&skip=${skip}`,
      {
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
      console.error("GHL API error:", ghlRes.status, await ghlRes.text());
      return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ghlData = await ghlRes.json();
    const contacts: Record<string, unknown>[] = ghlData.contacts ?? [];

    // --- Smart Upsert into localist_contacts ---
    if (contacts.length > 0) {
      // Resolve rep_id for this location
      const { data: repRow } = await supabase
        .from("localist_reps")
        .select("id")
        .eq("ghl_location_id", ghlLocationId)
        .maybeSingle();

      if (repRow) {
        const rows = contacts.map((c) => ({
          rep_id: repRow.id,
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

        // Use the smart_upsert_ghl_contacts RPC which:
        // - Matches by rep_id + phone to find existing CSV records
        // - Preserves existing lat/lng when present
        // - Sets source = 'ghl' and links ghl contact_id
        const BATCH_SIZE = 200;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const { error: rpcError } = await supabase.rpc(
            "smart_upsert_ghl_contacts",
            { p_rep_id: repRow.id, p_contacts: JSON.stringify(batch) }
          );
          if (rpcError) {
            console.error("Smart upsert error:", rpcError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ contacts, meta: ghlData.meta ?? {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ghl-fetch-contacts error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch contacts" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
