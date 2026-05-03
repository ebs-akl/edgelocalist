import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "https://esm.sh/crypto-js@4.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getPayloadVariants(payload: string): string[] {
  const variants = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (value && value.trim()) variants.add(value.trim());
  };

  add(payload);
  add(payload.replace(/ /g, "+"));
  add(payload.replace(/-/g, "+").replace(/_/g, "/"));
  add(payload.replace(/\s+/g, ""));
  add(payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));

  try {
    const decoded = decodeURIComponent(payload);
    add(decoded);
    add(decoded.replace(/ /g, "+"));
    add(decoded.replace(/-/g, "+").replace(/_/g, "/"));
    add(decoded.replace(/\s+/g, ""));
    add(decoded.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    // Payload may already be decoded.
  }

  return Array.from(variants);
}

function getCandidateKeys(): Array<{ name: string; key: string }> {
  const candidates = [
    { name: "GHL_SSO_KEY_LOCALIST", key: Deno.env.get("GHL_SSO_KEY_LOCALIST") },
    { name: "GHL_SSO_KEY_ALOMAR", key: Deno.env.get("GHL_SSO_KEY_ALOMAR") },
    { name: "GHL_SSO_KEY_COOKY", key: Deno.env.get("GHL_SSO_KEY_COOKY") },
    { name: "GHL_SSO_KEY", key: Deno.env.get("GHL_SSO_KEY") },
    { name: "VITE_GHL_SHARED_SECRET", key: Deno.env.get("VITE_GHL_SHARED_SECRET") },
  ];
  return candidates.filter((c): c is { name: string; key: string } => !!c.key && c.key.length > 0);
}

function tryDecryptPayload(
  payload: string,
  candidateKeys: Array<{ name: string; key: string }>
): { decrypted: string | null; variantCount: number; usedKeyName: string | null } {
  const payloadVariants = getPayloadVariants(payload);

  for (const { name, key } of candidateKeys) {
    for (const [variantIndex, variant] of payloadVariants.entries()) {
      try {
        const bytes = CryptoJS.AES.decrypt(variant, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (decrypted && decrypted.trim().startsWith("{")) {
          return {
            decrypted,
            variantCount: payloadVariants.length,
            usedKeyName: `${name} (variant ${variantIndex + 1})`,
          };
        }
      } catch (decryptErr) {
        // Expected for wrong key; only log at debug level
        console.log(
          `Decrypt miss with ${name} variant ${variantIndex + 1}:`,
          decryptErr instanceof Error ? decryptErr.message : String(decryptErr)
        );
      }
    }
  }

  return { decrypted: null, variantCount: payloadVariants.length, usedKeyName: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing server config: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateKeys = getCandidateKeys();

    // ── Safe diagnostic: log fingerprint of each key (no full values) ──
    for (const { name, key } of candidateKeys) {
      try {
        const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
        const sha = Array.from(new Uint8Array(hashBuf))
          .slice(0, 6)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const first4 = key.substring(0, 4);
        const last4 = key.substring(Math.max(0, key.length - 4));
        const ws = /\s/.test(key);
        console.log(
          `Key ${name}: len=${key.length} first=${first4} last=${last4} sha256=${sha} ws=${ws}`
        );
      } catch (e) {
        console.log(`Key ${name}: fingerprint failed ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (candidateKeys.length === 0) {
      console.error("No GHL SSO keys configured (checked: GHL_SSO_KEY_LOCALIST, GHL_SSO_KEY_ALOMAR, GHL_SSO_KEY_COOKY, GHL_SSO_KEY, VITE_GHL_SHARED_SECRET)");
      return new Response(
        JSON.stringify({ error: "Server configuration error: no SSO key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: { payload?: string; ssoPayload?: string } = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body — expected JSON with 'payload' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = body.payload || body.ssoPayload;
    if (!payload || typeof payload !== "string" || payload.length < 20) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'payload' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Decrypt SSO payload (try all configured GHL app keys) ──
    const { decrypted: decryptedString, variantCount, usedKeyName } = tryDecryptPayload(
      payload,
      candidateKeys
    );

    if (!decryptedString) {
      console.error(
        "Decryption failed. Payload length:",
        payload.length,
        "Variants tried:",
        variantCount,
        "Keys tried:",
        candidateKeys.map((k) => k.name).join(", "),
        "First 40 chars:",
        payload.substring(0, 40)
      );
      return new Response(
        JSON.stringify({ error: "SSO authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Decrypted SSO payload using ${usedKeyName}`);

    let userData: Record<string, unknown>;
    try {
      userData = JSON.parse(decryptedString);
    } catch {
      console.error("Decrypted string is not valid JSON:", decryptedString.substring(0, 100));
      return new Response(
        JSON.stringify({ error: "Decrypted payload is not valid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Extract fields from SSO payload ──
    const locationId =
      userData.activeLocation ||
      userData.locationId ||
      userData.location_id ||
      userData.LocationId ||
      (userData.location && typeof userData.location === "object" && (userData.location as any).id) ||
      null;

    const companyId =
      userData.companyId ||
      userData.company_id ||
      userData.CompanyId ||
      (userData.company && typeof userData.company === "object" && (userData.company as any).id) ||
      null;

    if (!locationId) {
      console.log("DECRYPTED USER DATA (no locationId found):", JSON.stringify(userData));
      return new Response(
        JSON.stringify({ error: "Missing location ID in SSO payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ssoEmail = (userData.email || userData.userEmail || userData.user_email || "") as string;
    const firstName = (userData.firstName || userData.first_name || "") as string;
    const lastName = (userData.lastName || userData.last_name || "") as string;
    const fullName = `${firstName} ${lastName}`.trim();

    // ── Step 3: Find or create Supabase auth user ──
    let authUserId: string | null = null;
    let authEmail: string | null = null;

    // Check if a rep already exists for this GHL location
    const { data: existingRep } = await supabase
      .from("localist_reps")
      .select("id, email, full_name")
      .eq("ghl_location_id", locationId as string)
      .maybeSingle();

    if (existingRep) {
      // Rep row exists — check if a matching auth.users entry exists
      const { data: { user: existingAuthUser } } = await supabase.auth.admin.getUserById(existingRep.id);

      if (existingAuthUser) {
        // Auth user exists — reuse it
        authUserId = existingAuthUser.id;
        authEmail = existingAuthUser.email!;
        console.log("Found existing auth user:", authUserId);
      } else {
        // Rep exists but no auth user by that ID — try to create, or find existing by email
        authEmail = existingRep.email || ssoEmail || `ghl-${locationId}@edgelocalist.app`;
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          id: existingRep.id,
          email: authEmail,
          email_confirm: true,
          user_metadata: fullName ? { full_name: fullName } : undefined,
        });

        if (createErr) {
          console.warn("createUser failed (may already exist):", createErr.message);
          // Email already registered under a different ID — look up by email
          const { data: { users: foundUsers } } = await supabase.auth.admin.listUsers({
            filter: { email: authEmail },
          } as any);
          const matchedUser = (foundUsers || []).find((u: any) => u.email === authEmail);
          if (matchedUser) {
            authUserId = matchedUser.id;
            authEmail = matchedUser.email!;
            // Update the rep row to point to the actual auth user ID
            if (matchedUser.id !== existingRep.id) {
              console.log(`Re-linking rep from ${existingRep.id} to auth user ${matchedUser.id}`);
              // Update contacts to the correct auth user
              await supabase.from("localist_contacts").update({ rep_id: matchedUser.id }).eq("rep_id", existingRep.id);
              await supabase.from("localist_reps").delete().eq("id", existingRep.id);
              await supabase.from("localist_reps").upsert({
                id: matchedUser.id,
                email: ssoEmail || authEmail,
                ghl_location_id: locationId as string,
                full_name: fullName || existingRep.full_name || null,
              }, { onConflict: "id" });
            }
            console.log("Recovered auth user by email:", authUserId);
          } else {
            return new Response(
              JSON.stringify({ error: "Cannot provision auth session" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          authUserId = newUser.user.id;
          console.log("Created auth user with existing rep ID:", authUserId);
        }
      }
    } else {
      // No rep for this location — create new auth user + rep row.
      // IMPORTANT: Always use a location-specific synthetic email to prevent
      // cross-account hijacking when multiple GHL sub-accounts share the same
      // agency owner email in their SSO payload.
      const syntheticEmail = `ghl-${locationId}@edgelocalist.app`;
      authEmail = syntheticEmail;

      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          ...(fullName ? { full_name: fullName } : {}),
          sso_email: ssoEmail || null,
        },
      });

      if (createErr) {
        console.error("Failed to create new auth user:", createErr.message);
        // Synthetic email collision means a user was previously created for this
        // location but has no rep row (edge case). Look up by synthetic email.
        const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
        const matchedUser = (existingUsers || []).find((u: any) => u.email === syntheticEmail);

        if (matchedUser) {
          authUserId = matchedUser.id;
          authEmail = matchedUser.email!;
          // Ensure rep row exists
          await supabase.from("localist_reps").upsert({
            id: authUserId,
            email: ssoEmail || syntheticEmail,
            ghl_location_id: locationId as string,
            full_name: fullName || null,
          }, { onConflict: "id" });
          console.log("Recovered existing synthetic user for location:", authUserId);
        } else {
          return new Response(
            JSON.stringify({ error: "Cannot provision auth session" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (newUser?.user) {
        authUserId = newUser.user.id;
        // Create the rep row
        await supabase.from("localist_reps").upsert({
          id: authUserId,
          email: ssoEmail || syntheticEmail,
          ghl_location_id: locationId as string,
          full_name: fullName || null,
        }, { onConflict: "id" });
        console.log("Created new auth user + rep:", authUserId);
      }
    }

    if (!authUserId || !authEmail) {
      return new Response(
        JSON.stringify({ error: "Failed to provision auth session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4: Generate magic link token for session establishment ──
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Failed to generate magic link:", linkError?.message);
      return new Response(
        JSON.stringify({ error: "Failed to generate session token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ SSO verified + session provisioned. locationId:", locationId, "userId:", authUserId);

    return new Response(
      JSON.stringify({
        success: true,
        locationId,
        companyId,
        hashed_token: linkData.properties.hashed_token,
        user_id: authUserId,
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
