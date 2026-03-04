import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const EFFECTIVE_DATE = "March 4, 2026";
const COMPANY = "Edge Branding Solutions LLC";
const CONTACT_EMAIL = "support@edgebrandingsolutions.com";

export default function Legal() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              alt="AKL LocaList"
              className="h-10 w-auto object-contain"
              src="/lovable-uploads/localist-final-logo-2.png"
            />
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          Legal
        </h1>
        <p className="text-muted-foreground mb-10">
          Privacy Policy & Terms of Service for{" "}
          <strong>AKL LocaList</strong> and{" "}
          <strong>ALOMAR Order Catcher</strong>, operated by {COMPANY}.
        </p>

        {/* ─── TABLE OF CONTENTS ─── */}
        <div className="rounded-lg border p-5 mb-12 bg-muted/30">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Contents
          </h2>
          <ul className="space-y-1 text-sm">
            <li>
              <a href="#privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#terms-of-service" className="text-primary hover:underline">
                Terms of Service
              </a>
            </li>
          </ul>
        </div>

        {/* ═══════════════════════════════════════════
            PRIVACY POLICY
        ═══════════════════════════════════════════ */}
        <section id="privacy-policy" className="scroll-mt-24 mb-20">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Privacy Policy
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Effective Date: {EFFECTIVE_DATE}
          </p>

          <div className="prose prose-sm max-w-none text-foreground space-y-6 [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
            <p>
              This Privacy Policy describes how {COMPANY} ("<strong>Company</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") collects, uses, and shares information in connection with the <strong>AKL LocaList</strong> and <strong>ALOMAR Order Catcher</strong> applications (collectively, the "<strong>Services</strong>"). By using the Services you agree to the practices described in this policy.
            </p>

            <h3>1. Information We Collect</h3>
            <p><strong>a. Account Information.</strong> When you register we collect your name, email address, and an encrypted password. If you subscribe to a paid plan we collect payment information through our third-party payment processor, Stripe. We do not store your full credit card number.</p>

            <p><strong>b. Contact Data (AKL LocaList).</strong> You may upload customer contact lists (CSV files) or sync contacts from a connected CRM. This data may include names, phone numbers, mailing addresses, order history, and lifetime value. Addresses are processed to derive geographic coordinates so that proximity-based search can function.</p>

            <p><strong>c. Email & Order Data (ALOMAR Order Catcher).</strong> When you forward emails to your unique ALOMAR forwarding address, our AI engine parses the email content and any attached PDF documents to extract structured data such as order numbers, item descriptions, quantities, prices, shipping addresses, commission amounts, and service request details. The raw email content and attachments are processed in memory and are <strong>not</strong> stored after extraction.</p>

            <p><strong>d. Usage Data.</strong> We automatically collect device type, browser type, IP address, pages visited, and feature usage through standard server logs and analytics.</p>

            <p><strong>e. Cookies.</strong> We use essential cookies for session management and authentication. We may use analytics cookies to understand how the Services are used. You can control cookies through your browser settings.</p>

            <h3>2. How We Use Your Information</h3>
            <ul>
              <li>To provide, operate, and maintain the Services.</li>
              <li>To process and display your contact data, orders, service requests, commissions, and leads.</li>
              <li>To enable location-based search and mapping features.</li>
              <li>To process payments and manage subscriptions.</li>
              <li>To send transactional emails (account verification, password resets, subscription confirmations).</li>
              <li>To improve and develop new features.</li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To comply with legal obligations.</li>
            </ul>

            <h3>3. How We Share Your Information</h3>
            <p>We do <strong>not</strong> sell your personal information. We may share information with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Supabase (database & authentication hosting), Stripe (payment processing), Mapbox (map rendering & geocoding), and AI processing providers — each bound by data-processing agreements.</li>
              <li><strong>CRM Integrations:</strong> If you connect a third-party CRM (e.g., via OAuth), data is transmitted to that platform per your instruction. We act as a conduit and do not control how the CRM processes your data.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, subpoena, court order, or government request.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred to the successor entity.</li>
            </ul>

            <h3>4. Data Security</h3>
            <p>All data is encrypted in transit (TLS 1.2+) and at rest. Database access is governed by row-level security (RLS) policies ensuring only authenticated users can access their own records. OAuth tokens for connected CRMs are stored encrypted and refreshed automatically. Despite these measures, no method of transmission or storage is 100% secure.</p>

            <h3>5. Data Retention</h3>
            <p>We retain your account and associated data for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention). Anonymized or aggregated data may be retained indefinitely.</p>

            <h3>6. Your Rights & Choices</h3>
            <ul>
              <li><strong>Access & Export:</strong> You can view and export your data from the dashboard at any time.</li>
              <li><strong>Correction:</strong> You can update your profile and contact data directly within the Services.</li>
              <li><strong>Deletion:</strong> You may request account deletion by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary">{CONTACT_EMAIL}</a>.</li>
              <li><strong>Opt-Out of Communications:</strong> Transactional emails are required for account operation. You may opt out of promotional communications at any time.</li>
            </ul>
            <p>If you are a resident of the European Economic Area (EEA), United Kingdom (UK), or California, you may have additional rights under GDPR or CCPA, including the right to data portability and the right to object to processing. Contact us to exercise these rights.</p>

            <h3>7. Children's Privacy</h3>
            <p>The Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we learn we have collected data from a child, we will delete it promptly.</p>

            <h3>8. Third-Party Links</h3>
            <p>The Services may contain links to third-party websites or services. We are not responsible for their privacy practices. We encourage you to read the privacy policies of any third-party sites you visit.</p>

            <h3>9. Changes to This Privacy Policy</h3>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Effective Date." Your continued use of the Services after changes constitutes acceptance of the updated policy.</p>

            <h3>10. Contact Us</h3>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary">{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            TERMS OF SERVICE
        ═══════════════════════════════════════════ */}
        <section id="terms-of-service" className="scroll-mt-24">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Terms of Service
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Effective Date: {EFFECTIVE_DATE}
          </p>

          <div className="prose prose-sm max-w-none text-foreground space-y-6 [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
            <p>
              These Terms of Service ("<strong>Terms</strong>") govern your access to and use of the <strong>AKL LocaList</strong> and <strong>ALOMAR Order Catcher</strong> applications (collectively, the "<strong>Services</strong>") provided by {COMPANY} ("<strong>Company</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"). By creating an account or using the Services, you agree to be bound by these Terms.
            </p>

            <h3>1. Eligibility</h3>
            <p>You must be at least 18 years old and capable of forming a binding contract to use the Services. By using the Services, you represent and warrant that you meet these requirements.</p>

            <h3>2. Account Registration</h3>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

            <h3>3. Description of Services</h3>
            <p><strong>AKL LocaList</strong> is a proximity-based contact search tool that allows users to upload customer contact lists, process addresses into searchable geographic data, and perform radius-based searches to find nearby contacts. Features include CSV upload, map-based visualization, one-tap call/text/directions, group messaging via CRM workflow triggers, and bulk tagging.</p>
            <p><strong>ALOMAR Order Catcher</strong> is an AI-powered email parsing engine that processes forwarded Cutco-related emails to extract and log order data, service requests, commissions, and leads. Data can be synced to compatible CRM platforms via webhooks or direct integration.</p>

            <h3>4. Acceptable Use</h3>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Services for any unlawful purpose or in violation of any applicable law or regulation.</li>
              <li>Upload, transmit, or store any content that infringes the intellectual property rights of any third party.</li>
              <li>Attempt to gain unauthorized access to any part of the Services, other accounts, or computer systems.</li>
              <li>Use the Services to send unsolicited bulk messages (spam) or violate the Telephone Consumer Protection Act (TCPA) or similar laws.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Services.</li>
              <li>Use automated scripts, bots, or scrapers to access the Services except through our published APIs.</li>
              <li>Interfere with or disrupt the integrity or performance of the Services.</li>
              <li>Share your account credentials with any other person.</li>
            </ul>

            <h3>5. SMS & Messaging Compliance</h3>
            <p>The Services provide tools for composing and triggering SMS messages through connected CRM platforms. <strong>You are solely responsible</strong> for ensuring that all messages you send comply with applicable laws, including but not limited to the TCPA, CAN-SPAM Act, and any state or local telemarketing regulations. You represent that you have obtained proper consent from each recipient before sending any message. {COMPANY} does not send messages on your behalf — we save message content and apply workflow trigger tags; your CRM platform handles actual message delivery.</p>

            <h3>6. Subscriptions & Payment</h3>
            <p><strong>a. Free Trial.</strong> We may offer a free trial period. At the end of the trial, your access to paid features will be suspended unless you subscribe to a paid plan.</p>
            <p><strong>b. Billing.</strong> Paid subscriptions are billed monthly through Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.</p>
            <p><strong>c. Cancellation.</strong> You may cancel your subscription at any time through the Settings page or Stripe customer portal. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial billing periods.</p>
            <p><strong>d. Price Changes.</strong> We reserve the right to change subscription prices. We will provide at least 30 days' notice of any price increase. Continued use after the effective date constitutes acceptance of the new price.</p>

            <h3>7. Your Data & Content</h3>
            <p>You retain all rights to the data you upload, import, or create through the Services ("<strong>Your Content</strong>"). By using the Services, you grant us a limited, non-exclusive license to process, store, and display Your Content solely to provide the Services to you. We do not claim ownership of Your Content.</p>

            <h3>8. Intellectual Property</h3>
            <p>The Services, including all software, designs, text, graphics, logos, and trademarks, are the property of {COMPANY} or its licensors and are protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Services without our prior written consent.</p>

            <h3>9. Third-Party Integrations</h3>
            <p>The Services may integrate with third-party platforms (e.g., CRM systems, mapping providers, payment processors). Your use of third-party services is subject to their respective terms and privacy policies. We are not responsible for the availability, accuracy, or practices of any third-party service.</p>

            <h3>10. Disclaimer of Warranties</h3>
            <p>THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED.</p>

            <h3>11. Limitation of Liability</h3>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY} AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES, REGARDLESS OF THE THEORY OF LIABILITY. OUR TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE AMOUNTS YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.</p>

            <h3>12. Indemnification</h3>
            <p>You agree to indemnify, defend, and hold harmless {COMPANY} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Services; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; or (d) your content or data.</p>

            <h3>13. Termination</h3>
            <p>We may suspend or terminate your access to the Services at any time, with or without cause, and with or without notice. Upon termination, your right to use the Services ceases immediately. Sections that by their nature should survive termination (including Limitation of Liability, Indemnification, and Governing Law) shall survive.</p>

            <h3>14. Governing Law & Dispute Resolution</h3>
            <p>These Terms are governed by and construed in accordance with the laws of the State of New York, without regard to its conflict-of-laws principles. Any dispute arising out of or relating to these Terms or the Services shall be resolved exclusively in the state or federal courts located in New York County, New York, and you consent to the personal jurisdiction of such courts.</p>

            <h3>15. Changes to These Terms</h3>
            <p>We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Effective Date." Your continued use of the Services after such changes constitutes acceptance of the revised Terms.</p>

            <h3>16. Severability</h3>
            <p>If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>

            <h3>17. Entire Agreement</h3>
            <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and {COMPANY} regarding the Services and supersede all prior agreements and understandings.</p>

            <h3>18. Contact Us</h3>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary">{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> This document is provided for informational purposes and does not constitute legal advice. You should consult with a qualified attorney to ensure compliance with applicable laws.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
