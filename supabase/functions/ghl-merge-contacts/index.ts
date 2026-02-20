import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "https://esm.sh/crypto-js@4.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCATION_ID_RE = /^[a-zA-Z0-9]{5,50}$/;
const REP_NUMBER_RE = /^\d{8}$/;

function decryptSsoPayload(ssoPayload: string): string | null {
  try {
    const key = Deno.env.get("GHL_SSO_KEY");
    if (!key) return null;
    const bytes = CryptoJS.AES.decrypt(ssoPayload, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;
    const parsed = JSON.parse(decrypted);
    return parsed.activeLocation ?? parsed.locationId ?? parsed.location_id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { sso_payload, rep_number } = body;

    // Validate rep_number format
    const trimmedRepNum = (rep_number || "").trim();
    if (!REP_NUMBER_RE.test(trimmedRepNum)) {
      return new Response(
        JSON.stringify({ error: "Invalid rep_number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve and validate locationId from SSO payload (required)
    if (!sso_payload) {
      return new Response(
        JSON.stringify({ error: "SSO payload required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const locationId = decryptSsoPayload(sso_payload);
    if (!locationId || !LOCATION_ID_RE.test(locationId)) {
      return new Response(
        JSON.stringify({ error: "Invalid SSO payload" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that this locationId owns this rep_number
    const { data: rep, error: repError } = await supabase
      .from("localist_reps")
      .select("id, rep_number, ghl_location_id")
      .eq("ghl_location_id", locationId)
      .single();

    if (repError || !rep) {
      return new Response(
        JSON.stringify({ error: "No rep found for this location" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The rep_number in the request must match the rep's own rep_number
    if (rep.rep_number !== trimmedRepNum) {
      return new Response(
        JSON.stringify({ error: "Rep number does not match this location" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Perform the merge: claim orphaned contacts that match this rep_number
    const { data, error } = await supabase
      .from("localist_contacts")
      .update({ location_id: locationId })
      .eq("rep_number", trimmedRepNum)
      .is("location_id", null)
      .select("id");

    if (error) {
      return new Response(
        JSON.stringify({ error: "Merge failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = data?.length ?? 0;
    return new Response(
      JSON.stringify({ success: true, merged: count }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
