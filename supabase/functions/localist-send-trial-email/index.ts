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
const CRAVE_URL = "https://crave.automatedknifelife.com";

function craveBlock(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 8px; background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); border-radius: 12px; border: 1px solid #fde68a;">
      <tr>
        <td style="padding: 20px 24px;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #b45309; letter-spacing: 1px; text-transform: uppercase;">Free Bonus for Reps</p>
          <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${TEXT};">Get Crave: Your Recipe Hub — free for life</h3>
          <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.5; color: ${MUTED};">
            Crave is a personal recipe vault and weekly meal planner. Paste any recipe URL and Crave instantly strips the ads and life stories — leaving just the ingredients and instructions. Save favorite demo recipes, filter by tag, and plan the week's meals in one tap. <strong style="color:${TEXT}">Best of all, you can brand it as your own and share your personal link with every customer</strong> — they get a free recipe app for life, and every time they open it they see your photo, name, and contact info pinned at the top and bottom. Constant top-of-mind exposure that drives service calls and referrals straight back to you.
          </p>
          <a href="${CRAVE_URL}" target="_blank" style="display: inline-block; background-color: #b45309; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 8px;">
            Open Crave Free →
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
        subject: `Welcome to your 7-day free trial of ${APP_NAME}`,
        preheader: "Your GPS for Profit is ready — let's populate your map.",
        heading: `Welcome to ${APP_NAME}, ${firstName}! 🗺️`,
        body: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">
            Welcome to your 7-day free trial of ${APP_NAME}! We are thrilled to have you on board.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            You now hold the ultimate <strong>"GPS for Profit"</strong> right in your pocket. No more wasting gas, zig-zagging across town, or sitting in a coffee shop feeling defeated when a 2:00 PM appointment cancels. With LocaList, you will be able to instantly search a <strong>5, 10, 25, or 50-mile radius</strong> to find nearby past customers, turning a dead hour into a highly profitable drop-by service call!
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            But before you can start rescuing your no-shows and optimizing your daily routes, we need to populate your map.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            We've made this incredibly simple. Watch this quick training video to see exactly how to export your customer list directly from VectorConnect and upload it straight into LocaList:
          </p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;text-align:center;">
            📹 <a href="https://video.edgedms.com/video/exploring-the-localist-app-2sut" target="_blank" style="color:${PRIMARY};font-weight:600;text-decoration:none;">Watch the LocaList Training Video →</a>
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            Once you drop in your customer CSV file, the system automatically batches and encrypts your data, placing color-coded opportunity pins across your map so you can instantly spot your highest-value targets.
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${TEXT};">
            <strong>Your 7-day trial is officially ticking.</strong> Watch the video, get your contacts loaded today, and let's turn your next cancelled demo into a $500 service call!
          </p>
        `,
        ctaText: "Open My Dashboard",
        ctaUrl: `${APP_URL}/dashboard`,
      };
    case 2:
      return {
        subject: `${firstName}, your map is ready (Trial update inside!) 🚀`,
        preheader: "2 days left in your trial — plus an exclusive $7 upgrade for Cutco reps.",
        heading: `${firstName}, you've built something worth keeping.`,
        body: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            You're 2 days from the end of your free trial. Before it converts, here's what most reps say tipped them over the edge:
          </p>
          <ul style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.7;color:${TEXT};">
            <li><strong>Group SMS</strong> — tag 30 nearby contacts, blast a personalized "I'm in your area" with merge fields, get 3–5 stops out of it.</li>
            <li><strong>County-level segmentation</strong> — your contacts get auto-tagged by county so you can route by ZIP, school district, or city.</li>
            <li><strong>Real-time CRM sync</strong> — anything you change in the field shows up in your CRM instantly. No double entry.</li>
          </ul>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            At <strong>$9/month</strong>, one extra service call pays for the year. No contracts — cancel any time from your dashboard.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            <strong>Want to keep going with just the map?</strong> You don't need to do anything — your LocaList trial converts automatically on day 7.
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${MUTED};">
            <strong>Want to automate your entire business?</strong> Since you are already seeing the power of managing your territory, we are offering an exclusive upgrade to the full <strong>Edge DMS Basic (Automated Knife Life Edition)</strong>. For just <strong>$7</strong>, you get a 7-day all-access pass to the ultimate CRM built specifically for Cutco reps. This unlocks our <strong>2-Way Texting, Missed Call Text-Back, automated Calendars, and the Social Planner</strong>.
          </p>
          <p style="margin:18px 0 8px;font-size:15px;line-height:1.6;color:${TEXT};text-align:center;">
            Tap below to manage your account or claim your $7 upgrade.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr>
              <td align="center" style="padding:8px 6px;">
                <a href="${APP_URL}/settings" target="_blank" style="display:inline-block;background-color:${SECONDARY};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 24px;border-radius:8px;">
                  Keep LocaList Only
                </a>
              </td>
              <td align="center" style="padding:8px 6px;">
                <a href="https://automatedknifelife.com/747-checkout" target="_blank" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 24px;border-radius:8px;">
                  Claim My $7 Edge DMS Trial →
                </a>
              </td>
            </tr>
          </table>
        `,
        ctaText: "",
        ctaUrl: "",
      };
    case 3:
      return {
        subject: `Nice work, ${firstName}. Your map is loaded. 📍`,
        preheader: "One tap. Pre-filled text. Turn nearby pins into drop-by service calls.",
        heading: `Nice work, ${firstName}. Your map is loaded. 📍`,
        body: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">
            Now the fun part. LocaList makes rescuing your no-shows and reaching out to nearby customers completely frictionless.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            When you spot a high-value pin in your area, just tap the contact card and hit <strong>"Text"</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${MUTED};">
            This one-tap action instantly opens your phone's native messaging app with a pre-filled introduction ready to go. No typing out numbers, no fumbling for words. Just tap, send, and turn that "I'm in the area" text into a profitable in-person drop-by.
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${TEXT};">
            <strong>Pro tip:</strong> Pair your drop-by text with a 20-minute window — it's the highest-converting timing to secure a quick service call.
          </p>
        `,
        ctaText: "Try the One-Tap Text",
        ctaUrl: `${APP_URL}/dashboard`,
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
              ${c.ctaText && c.ctaUrl ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:14px 0 8px;">
                    <a href="${c.ctaUrl}" target="_blank" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                      ${c.ctaText}
                    </a>
                  </td>
                </tr>
              </table>` : ''}
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
    const INTERNAL_SECRET = Deno.env.get("INTERNAL_CRON_SECRET");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authorize: either internal cron secret OR a valid authenticated user JWT
    const provided = req.headers.get("x-internal-secret");
    const isInternal = !!INTERNAL_SECRET && provided === INTERNAL_SECRET;
    let isAuthedUser = false;
    if (!isInternal) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
      if (token) {
        const tmp = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { data: u } = await tmp.auth.getUser(token);
        isAuthedUser = !!u?.user;
      }
    }
    if (!isInternal && !isAuthedUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rep_id, step, test_email, test_name } = await req.json();
    if (![1, 2, 3].includes(step)) {
      return new Response(JSON.stringify({ error: "Invalid step" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let recipientEmail: string;
    let firstName: string;

    if (test_email) {
      // Test send: skip idempotency + rep lookup
      recipientEmail = test_email;
      firstName = (test_name || test_email).split(" ")[0].split("@")[0];
    } else {
      if (!rep_id) {
        return new Response(JSON.stringify({ error: "Missing rep_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await admin
        .from("localist_trial_emails")
        .select("id")
        .eq("rep_id", rep_id)
        .eq("step", step)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: rep, error: repErr } = await admin
        .from("localist_reps")
        .select("email, full_name")
        .eq("id", rep_id)
        .maybeSingle();
      if (repErr || !rep?.email) {
        return new Response(JSON.stringify({ error: "Rep not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      recipientEmail = rep.email;
      firstName = (rep.full_name || rep.email).split(" ")[0].split("@")[0];
    }
    const content = getEmailContent(step as 1 | 2 | 3, firstName);
    const html = buildHtml(content);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${APP_NAME} <hello@the.automatedknifelife.com>`,
        to: [recipientEmail],
        subject: test_email ? `[TEST] ${content.subject}` : content.subject,
        html,
      }),
    });
    const resendResult = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend error:", JSON.stringify(resendResult));
      return new Response(JSON.stringify({ error: "Failed to send", details: resendResult }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!test_email) {
      await admin.from("localist_trial_emails").insert({ rep_id, step, resend_id: resendResult.id });
    }
    console.log(`✅ Sent trial step ${step} to ${recipientEmail} (${resendResult.id})`);

    return new Response(JSON.stringify({ success: true, id: resendResult.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("localist-send-trial-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
