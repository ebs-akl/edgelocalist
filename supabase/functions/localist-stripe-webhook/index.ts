import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIMARY = "#2b998e";
const SECONDARY = "#485856";
const BG = "#f2f2f2";
const CARD_BG = "#ffffff";
const TEXT = "#1a1a1a";
const MUTED = "#666666";
const LOGO_URL = "https://localist.automatedknifelife.com/akl-localist-logo.png";
const APP_NAME = "AKL LocaList";
const SUPPORT_EMAIL = "support@edgedms.com";
const DASHBOARD_URL = "https://localist.automatedknifelife.com/dashboard";

const TIER_NAMES: Record<string, string> = {
  prod_U3ouP5GYR2UtCT: "LOCALIST",
  prod_U3ovoEBZGIHGd6: "SNACK PACK",
  prod_TT1lDpEK83RxB1: "EDGE BASIC",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

type RepUpdate = Partial<{
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  payment_method_on_file: boolean;
}>;

/** Update fields in localist_reps by email */
async function updateRepByEmail(email: string, patch: RepUpdate): Promise<void> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("localist_reps")
    .update(patch)
    .eq("email", email)
    .select("id, email");

  if (error) {
    logStep("ERROR updating rep", { email, patch, error: error.message });
  } else if (!data || data.length === 0) {
    logStep("WARNING: No rep found for email", { email, patch });
  } else {
    logStep("✅ Updated rep", { email, patch, repId: data[0].id });
  }
}

async function updateSubscriptionTier(email: string, tier: string): Promise<void> {
  await updateRepByEmail(email, { subscription_tier: tier });
}

/** Determine if a subscription has a payment method on file */
async function hasPaymentMethod(stripe: Stripe, sub: Stripe.Subscription): Promise<boolean> {
  if (sub.default_payment_method) return true;
  try {
    const cust = await stripe.customers.retrieve(sub.customer as string);
    if (cust.deleted) return false;
    const c = cust as Stripe.Customer;
    if (c.invoice_settings?.default_payment_method || c.default_source) return true;
    const pms = await stripe.paymentMethods.list({ customer: c.id, type: "card", limit: 1 });
    return pms.data.length > 0;
  } catch (e) {
    logStep("hasPaymentMethod error", { error: String(e) });
    return false;
  }
}

/** Sync a subscription's status/PM/tier to the rep row */
async function syncSubscription(stripe: Stripe, sub: Stripe.Subscription): Promise<void> {
  const email = await getCustomerEmail(stripe, sub.customer as string);
  if (!email) {
    logStep("WARNING: No email for subscription sync", { subId: sub.id });
    return;
  }
  const productId = sub.items.data[0]?.price?.product as string | undefined;
  const tier = (productId && TIER_NAMES[productId]) || undefined;
  const pm = await hasPaymentMethod(stripe, sub);
  const trialEnd = (sub as any).trial_end;
  const trial_ends_at = typeof trialEnd === "number" ? new Date(trialEnd * 1000).toISOString() : null;

  const patch: RepUpdate = {
    subscription_status: sub.status,
    payment_method_on_file: pm,
    trial_ends_at,
  };
  if (tier) patch.subscription_tier = tier;
  await updateRepByEmail(email, patch);
}

/** Resolve customer email from a Stripe customer ID */
async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email || null;
  } catch (e) {
    logStep("ERROR retrieving customer email", { customerId, error: String(e) });
    return null;
  }
}

function buildConfirmationEmail(customerEmail: string, tierName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}!</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BG};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: ${CARD_BG}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${SECONDARY}; padding: 28px 32px; text-align: center;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 16px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: ${TEXT}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                You're All Set! 🎉
              </h1>
              <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: ${MUTED};">
                Your <strong style="color: ${TEXT};">${tierName}</strong> subscription is now active. Welcome to ${APP_NAME} — your proximity-based contact search tool is ready to go.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${MUTED};">
                Head to your dashboard to start searching contacts, viewing your map, and managing your territory.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${DASHBOARD_URL}" target="_blank" style="display: inline-block; background-color: ${PRIMARY}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 8px; letter-spacing: 0.3px;">
                      Go to My Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #999999; text-align: center; line-height: 1.5;">
                This email was sent by <strong>${APP_NAME}</strong> · Part of the EdgeDMS Platform
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center; line-height: 1.5;">
                Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color: ${PRIMARY}; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET not set");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // ── checkout.session.completed ──────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email || session.customer_email;

      if (!customerEmail) {
        logStep("No customer email in checkout session, skipping");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine tier name from the subscription's product
      let tierName = "Standalone";
      if (session.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price?.product as string;
          if (productId && TIER_NAMES[productId]) {
            tierName = TIER_NAMES[productId];
          }
        } catch (e) {
          logStep("Could not retrieve subscription for tier name", { error: String(e) });
        }
      }

      // Update tier + sync sub fields (status, PM, trial)
      if (session.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(stripe, subscription);
        } catch (e) {
          logStep("syncSubscription failed during checkout.completed", { error: String(e) });
          await updateSubscriptionTier(customerEmail, tierName);
        }
      } else {
        await updateSubscriptionTier(customerEmail, tierName);
      }

      // Send confirmation email
      const html = buildConfirmationEmail(customerEmail, tierName);
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${APP_NAME} <noreply@the.automatedknifelife.com>`,
          to: [customerEmail],
          subject: `Welcome to ${APP_NAME} — You're All Set! 🎉`,
          html,
        }),
      });

      const resendResult = await resendResponse.json();
      if (!resendResponse.ok) {
        logStep("Resend API error", resendResult);
      } else {
        logStep(`✅ Sent confirmation email to ${customerEmail}`, { resendId: resendResult.id });
      }
    }

    // ── customer.subscription.created / updated ─────────────────────
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(stripe, subscription);
    }

    // ── customer.subscription.deleted ───────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const email = await getCustomerEmail(stripe, subscription.customer as string);
      if (email) {
        await updateRepByEmail(email, {
          subscription_tier: "expired",
          subscription_status: "canceled",
          payment_method_on_file: false,
        });
      } else {
        logStep("WARNING: Could not resolve email for deleted subscription", { subId: subscription.id });
      }
    }

    // ── invoice.payment_failed ──────────────────────────────────────
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const email = await getCustomerEmail(stripe, invoice.customer as string);
      if (email) {
        await updateRepByEmail(email, { subscription_status: "past_due" });
        logStep("Payment failed — set to past_due", { email });
      } else {
        logStep("WARNING: Could not resolve email for failed invoice", { customerId: invoice.customer });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
