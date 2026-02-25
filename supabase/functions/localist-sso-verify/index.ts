import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GHL_SSO_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing server config: GHL_SSO_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // ── Step 1: Decrypt SSO payload ──
    const bytes = CryptoJS.AES.decrypt(payload, GHL_SSO_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      console.error("Decryption resulted in empty string. Payload length:", payload.length);
      return new Response(
        JSON.stringify({ error: "Decryption failed. Check GHL_SSO_KEY." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
