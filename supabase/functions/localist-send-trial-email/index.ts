import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRIMARY = "#2b998e";
const SECONDARY = "#485856";
const BG = "#f2f2f2";
const CARD_BG = "#ffffff";
const TEXT = "#1a1a1a";
const MUTED = "#666666";
const LOGO_URL = "https://edgelocalist.lovable.app/lovable-uploads/localist-final-logo-2.png";
const APP_NAME = "AKL LocaList";
const SUPPORT_EMAIL = "support@edgedms.com";
const APP_URL = "https://localist.edgedms.com";
const CRAVE_URL = "https://crave.app";

function craveBlock(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 8px; background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); border-radius: 12px; border: 1px solid #fde68a;">
      <tr>
        <td style="padding: 20px 24px;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #b45309; letter-spacing: 1px; text-transform: uppercase;">Free Bonus for Reps</p>
          <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${TEXT};">Get the Crave app — free for life</h3>
          <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.5; color: ${MUTED};">
            Crave is the pocket-sized prospecting partner built for Cutco reps. Capture leads, log every visit, and never lose a follow-up while you're walking the field. Use code <strong style="color:${TEXT}">LOCALIST</strong> at sign-up.
          </p>
          <a href="${CRAVE_URL}" target="_blank" style="display: inline-block; background-color: #b45309; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 8px;">
            Download Crave Free →
          </a>
        </td>
      </tr>
    </table>
  `;
}

interface EmailContent {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

function getEmailContent(step: 1 | 2 | 3, firstName: string): EmailContent {
  switch (step) {
    case 1:
      return {
        subject: `Welcome to ${APP_NAME} — let's map your territory`,
        preheader: "Step 1: Connect your CRM and your contact map comes alive in seconds.",
        heading: `Welcome aboard, ${firstName}! 🗺️`,
        body: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            You just unlocked the fastest way to turn your contact list into a route plan. Here's what you can do today:
          </p>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.7;color:${TEXT};">
            <li><strong>Auto-import your CRM contacts</strong> — connect once and we pull in every customer, address, and tag.</li>
            <li><strong>See them on a live map</strong> — every contact pinned, color-coded by category (RLT, BIZ, REG).</li>
            <li><strong>Drop-in mode in 1 tap</strong> — when you're between appointments, find every nearby contact in 5–50 mile radius.</li>
          </ul>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${MUTED};">
            <strong>Your 7-day trial is active</strong> — no charges until day 7. Let's get you set up.
          </p>
        `,
        ctaText: "Open My Dashboard",
        ctaUrl: `${APP_URL}/dashboard`,
      };
    case 2:
      return {
        subject: `Your map is live — try the Drop-In SMS playbook`,
        preheader: "Step 2: 18 proven SMS scripts that turn 'I'm in your neighborhood' into face-to-face meetings.",
        heading: `Nice work, ${firstName}. Your map is loaded. 📍`,
        body: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            Now the fun part. ${APP_NAME} ships with an <strong>SMS Snippet Library</strong> — 18 battle-tested scripts that top reps use to convert "I'm in the area" into in-person stops.
          </p>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.7;color:${TEXT};">
            <li><strong>💼 Business Gifting</strong> — The Coffee &amp; Catch-Up, The Artifact Drop</li>
            <li><strong>🏠 Realtor / Lender</strong> — Top-Down Coffee Drop, The Show and Tell</li>
            <li><strong>🔪 Neighborhood Stop-Ins</strong> — Forever Guarantee Audit, Unpacked Gear Audit</li>
          </ul>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${MUTED};">
            Each snippet auto-fills the contact's first name and your name. Pick a contact on the map, tap "Send SMS," and you're booked.
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${MUTED};">
            Pro tip: pair the <strong>"Morning Gap"</strong> variant with a 20-minute window — it's the highest-converting timing in the library.
          </p>
        `,
        ctaText: "Try the SMS Snippets",
        ctaUrl: `${APP_URL}/dashboard`,
      };
    case 3:
      return {
        subject: `Your trial wraps in 2 days — keep your territory`,
        preheader: "Day 5: Group SMS, route stacking, and the upgrades that pay for themselves on the first stop.",
        heading: `${firstName}, you've built something worth keeping. 🚀`,
        body: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            You're 2 days from the end of your free trial. Before it converts, here's what most reps say tipped them over the edge:
          </p>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.7;color:${TEXT};">
            <li><strong>Group SMS</strong> — tag 30 nearby contacts, blast a personalized "I'm in your area" with merge fields, get 3–5 stops out of it.</li>
            <li><strong>County-level segmentation</strong> — your contacts get auto-tagged by county so you can route by ZIP, school district, or city.</li>
            <li><strong>Real-time CRM sync</strong> — anything you change in the field shows up in your CRM instantly. No double entry.</li>
          </ul>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${MUTED};">
            At <strong>$9/month</strong>, one extra service call pays for the year. No contracts — cancel any time from your dashboard.
          </p>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${MUTED};">
            Want to keep going? You don't need to do anything — your trial converts automatically on day 7. Want to add territory automation tools? Tap below.
          </p>
        `,
        ctaText: "Manage My Subscription",
        ctaUrl: `${APP_URL}/settings`,
      };
  }
}

function buildHtml(c: EmailContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BG};opacity:0;">${c.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color:${SECONDARY};padding:28px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 8px;">
              <h1 style="margin:0 0 18px;font-size:22px;font-weight:700;color:${TEXT};">${c.heading}</h1>
              ${c.body}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:14px 0 8px;">
                    <a href="${c.ctaUrl}" target="_blank" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                      ${c.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ${craveBlock()}
            </td>
          </tr>
          <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e5e5;margin:0;" /></td></tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <p style="margin:0 0 8px;font-size:12px;color:#999;text-align:center;line-height:1.5;">
                Sent by <strong>${APP_NAME}</strong> · Part of the EdgeDMS Platform
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#999;text-align:center;line-height:1.5;">
                Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:${PRIMARY};text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#bbb;text-align:center;line-height:1.5;">
                Cutco Cutlery is a registered trademark of Cutco Corporation. Edge Branding Solutions LLC is an independent representative organization and is not affiliated with, endorsed by, or sponsored by Cutco Corporation.
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { rep_id, step } = await req.json();
    if (!rep_id || ![1, 2, 3].includes(step)) {
      return new Response(JSON.stringify({ error: "Invalid rep_id or step" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Idempotency check
    const { data: existing } = await admin
      .from("localist_trial_emails")
      .select("id")
      .eq("rep_id", rep_id)
      .eq("step", step)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load rep
    const { data: rep, error: repErr } = await admin
      .from("localist_reps")
      .select("email, full_name")
      .eq("id", rep_id)
      .maybeSingle();
    if (repErr || !rep?.email) {
      return new Response(JSON.stringify({ error: "Rep not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const firstName = (rep.full_name || rep.email).split(" ")[0].split("@")[0];
    const content = getEmailContent(step as 1 | 2 | 3, firstName);
    const html = buildHtml(content);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${APP_NAME} <hello@the.automatedknifelife.com>`,
        to: [rep.email],
        subject: content.subject,
        html,
      }),
    });
    const resendResult = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend error:", JSON.stringify(resendResult));
      return new Response(JSON.stringify({ error: "Failed to send", details: resendResult }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("localist_trial_emails").insert({ rep_id, step, resend_id: resendResult.id });
    console.log(`✅ Sent trial step ${step} to ${rep.email} (${resendResult.id})`);

    return new Response(JSON.stringify({ success: true, id: resendResult.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("localist-send-trial-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
