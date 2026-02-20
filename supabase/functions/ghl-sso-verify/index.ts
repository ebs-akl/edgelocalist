import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "https://esm.sh/crypto-js@4.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GHL_SSO_KEY = Deno.env.get("GHL_SSO_KEY");
    if (!GHL_SSO_KEY) {
      console.error("GHL_SSO_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error: GHL_SSO_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: { payload?: string } = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body — expected JSON with 'payload' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { payload } = body;
    if (!payload || typeof payload !== "string" || payload.length < 20) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'payload' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt using CryptoJS AES (standard OpenSSL format — "Salted__" prefix)
    const bytes = CryptoJS.AES.decrypt(payload, GHL_SSO_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      console.error("Decryption resulted in empty string. Payload length:", payload.length);
      return new Response(
        JSON.stringify({
          error: "Decryption resulted in empty string. Check GHL_SSO_KEY matches the key configured in GoHighLevel.",
          payload_length: payload.length,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userData: Record<string, unknown>;
    try {
      userData = JSON.parse(decryptedString);
    } catch {
      console.error("Decrypted string is not valid JSON:", decryptedString.substring(0, 100));
      return new Response(
        JSON.stringify({
          error: "Decrypted payload is not valid JSON",
          preview: decryptedString.substring(0, 50),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract locationId — this is what all other edge functions need
    const locationId = userData.locationId || userData.location_id;
    if (!locationId) {
      return new Response(
        JSON.stringify({
          error: "Decrypted payload does not contain locationId",
          keys: Object.keys(userData),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("SSO verified successfully for location:", locationId);

    return new Response(
      JSON.stringify({
        success: true,
        locationId,
        userData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ghl-sso-verify unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error during SSO verification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
