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
const LOGO_URL = "https://edgelocalist.lovable.app/lovable-uploads/localist-final-logo-2.png";
const APP_NAME = "AKL LocaList";
const SUPPORT_EMAIL = "support@edgedms.com";

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
}

interface HookPayload {
  user: { id: string; email: string };
  email_data: EmailData;
}

function getEmailContent(type: string, confirmUrl: string, otpCode: string): { subject: string; heading: string; body: string; buttonText: string; showButton: boolean } {
  switch (type) {
    case "signup":
      return {
        subject: `Confirm your ${APP_NAME} account`,
        heading: "Welcome to Edge LocaList! 🎉",
        body: "You're almost there! Click the button below to confirm your email address and activate your dashboard. Once confirmed, you'll be able to search contacts, view your map, and manage your territory.",
        buttonText: "Confirm My Account",
        showButton: true,
      };
    case "recovery":
      return {
        subject: `Reset your ${APP_NAME} password`,
        heading: "Reset Your Password",
        body: "We received a request to reset your password. Click the button below to choose a new one. If you didn't request this, you can safely ignore this email — your password won't change.",
        buttonText: "Reset Password",
        showButton: true,
      };
    case "magiclink":
      return {
        subject: `Your ${APP_NAME} Sign-In Link`,
        heading: "Your Secure Sign-In Link",
        body: "You requested a passwordless sign-in to your Edge LocaList dashboard. Click the button below to sign in instantly — no password needed. This link expires in 1 hour.",
        buttonText: "Sign In to Dashboard",
        showButton: true,
      };
    case "email_change":
      return {
        subject: `Confirm your new email for ${APP_NAME}`,
        heading: "Confirm Your New Email",
        body: "You requested to change your email address. Click the button below to confirm your new email. If you didn't make this change, contact support immediately.",
        buttonText: "Confirm Email Change",
        showButton: true,
      };
    case "invite":
      return {
        subject: `You've been invited to ${APP_NAME}`,
        heading: "You're Invited! 📍",
        body: "You've been invited to join Edge LocaList — the proximity-based contact search tool for Cutco reps. Click below to accept the invitation and set up your account.",
        buttonText: "Accept Invitation",
        showButton: true,
      };
    case "reauthentication":
      return {
        subject: `Your ${APP_NAME} verification code`,
        heading: "Verification Code",
        body: `Your verification code is: <strong style="font-size: 28px; letter-spacing: 4px; color: ${PRIMARY}; display: block; text-align: center; margin: 16px 0;">${otpCode}</strong>Enter this code to continue. It expires in 10 minutes.`,
        buttonText: "",
        showButton: false,
      };
    default:
      return {
        subject: `${APP_NAME} Notification`,
        heading: "Hello from Edge LocaList",
        body: "You have a notification from Edge LocaList. Click below for more details.",
        buttonText: "View Details",
        showButton: true,
      };
  }
}

function buildHtml(content: { subject: string; heading: string; body: string; buttonText: string; showButton: boolean }, confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
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
                ${content.heading}
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${MUTED};">
                ${content.body}
              </p>
              ${content.showButton ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${confirmUrl}" target="_blank" style="display: inline-block; background-color: ${PRIMARY}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 8px; letter-spacing: 0.3px;">
                      ${content.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
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
              ${content.showButton ? `
              <p style="margin: 12px 0 0; font-size: 11px; color: #bbbbbb; text-align: center; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${confirmUrl}" style="color: ${PRIMARY}; word-break: break-all; text-decoration: none; font-size: 11px;">${confirmUrl}</a>
              </p>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const signatureHeader = req.headers.get("webhook-signature");
  if (!signatureHeader) return false;

  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!secret) return false;

  // Extract the base64 key from "v1,whsec_<base64>"
  const parts = secret.split("whsec_");
  if (parts.length < 2) return false;
  const secretBytes = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));

  // Parse timestamp and signatures from header: "v1,<ts>,<sig>"
  const sigParts = signatureHeader.split(",");
  // Find v1 signatures
  const timestamp = sigParts.find((p) => p.startsWith("t="))?.slice(2);
  const v1Sigs = sigParts
    .filter((p) => p.startsWith("v1,") || p.startsWith("v1="))
    .map((p) => p.slice(3));

  // If standard format: "v1,<base64sig>" with msgId and timestamp
  const msgId = req.headers.get("webhook-id") || "";
  const msgTimestamp = req.headers.get("webhook-timestamp") || timestamp || "";

  // Construct signed content per Standard Webhooks spec
  const signedContent = `${msgId}.${msgTimestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Compare against all v1 signatures in the header
  if (v1Sigs.length > 0) {
    return v1Sigs.some((s) => s === computed);
  }

  // Fallback: compare full signature parts
  return signatureHeader.split(" ").some((part) => {
    const val = part.startsWith("v1,") ? part.slice(3) : part;
    return val === computed;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();

    const valid = await verifySignature(req, body);
    if (!valid) {
      console.error("Invalid or missing HMAC signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: HookPayload = JSON.parse(body);
    const { user, email_data } = payload;

    if (!user?.email || !email_data?.email_action_type) {
      return new Response(JSON.stringify({ error: "Invalid hook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build confirmation URL
    const siteUrl = email_data.site_url || "https://edgelocalist.lovable.app";
    const redirectTo = email_data.redirect_to || `${siteUrl}/dashboard`;
    const tokenHash = email_data.token_hash || "";
    const token = email_data.token || "";
    const type = email_data.email_action_type;

    let confirmUrl: string;
    if (type === "reauthentication") {
      confirmUrl = ""; // no link needed for OTP
    } else {
      // Use the Supabase verify endpoint with token_hash
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || siteUrl;
      const supabaseType = type === "signup" ? "signup" : type === "recovery" ? "recovery" : type === "magiclink" ? "magiclink" : type === "email_change" ? "email_change" : "invite";
      confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${supabaseType}&redirect_to=${encodeURIComponent(redirectTo)}`;
    }

    const content = getEmailContent(type, confirmUrl, token);
    const html = buildHtml(content, confirmUrl);

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${APP_NAME} <noreply@the.automatedknifelife.com>`,
        to: [user.email],
        subject: content.subject,
        html,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", JSON.stringify(resendResult));
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Sent ${type} email to ${user.email} via Resend. ID: ${resendResult.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
