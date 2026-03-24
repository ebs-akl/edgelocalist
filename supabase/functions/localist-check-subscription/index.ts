import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth client: verify JWT against the project that issued the token
  const authUrl = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
  const authKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authClient = createClient(authUrl, authKey, { auth: { persistSession: false } });

  // DB client: queries against the shared ALOMAR database
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Map DB subscription_tier values → Stripe product IDs the frontend already recognizes
  const DB_TIER_TO_PRODUCT: Record<string, string> = {
    edgedms: "prod_TT1lDpEK83RxB1",
    "EDGE BASIC": "prod_TT1lDpEK83RxB1",
    standalone: "prod_U3ouP5GYR2UtCT",
    LOCALIST: "prod_U3ouP5GYR2UtCT",
    "SNACK PACK": "prod_U3ovoEBZGIHGd6",
  };

  async function dbFallback(userId: string): Promise<Response | null> {
    const { data: rep } = await supabaseClient
      .from("localist_reps")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();

    const tier = rep?.subscription_tier?.trim() ?? "";
    const productId = DB_TIER_TO_PRODUCT[tier] ?? null;

    if (productId) {
      logStep("DB fallback matched", { tier, productId });
      return new Response(JSON.stringify({ subscribed: true, product_id: productId, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("DB fallback: no recognized tier", { tier });
    return null;
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, trying DB fallback");
      const fallback = await dbFallback(user.id);
      if (fallback) return fallback;
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Also check trialing
    const trialingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 10,
    });

    const allActive = [...subscriptions.data, ...trialingSubs.data];
    const hasActiveSub = allActive.length > 0;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub) {
      const subscription = allActive[0];
      try {
        const endVal = subscription.current_period_end;
        // Handle both Unix timestamp (number) and ISO string formats
        if (typeof endVal === "number") {
          subscriptionEnd = new Date(endVal * 1000).toISOString();
        } else if (typeof endVal === "string") {
          subscriptionEnd = new Date(endVal).toISOString();
        } else {
          subscriptionEnd = null;
        }
      } catch {
        subscriptionEnd = null;
      }
      productId = subscription.items.data[0].price.product as string;
      logStep("Active subscription found", { productId, subscriptionEnd });
    } else {
      logStep("No active Stripe subscription, trying DB fallback");
      const fallback = await dbFallback(user.id);
      if (fallback) return fallback;
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
