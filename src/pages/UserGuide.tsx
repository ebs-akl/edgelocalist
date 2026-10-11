import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Upload,
  Search,
  MapPin,
  Phone,
  MessageSquare,
  RefreshCw,
  Tag,
  Users,
  Settings,
  Shield,
  Download,
  Filter,
  CreditCard,
  Map as MapIcon,
  Plug,
} from "lucide-react";
import { localistLogo } from "@/lib/branding";
import Footer from "@/components/Footer";

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {title}
          </h2>
        </div>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed pl-0 sm:pl-12">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function SharedSearchDetails({ ghlMode }: { ghlMode: boolean }) {
  return (
    <>
      <p>
        Type any address, city, or ZIP code into the search bar and choose your radius — <strong>5, 10, 25, or 50 miles</strong> — then click <strong>Search</strong>. You can also paste raw coordinates (latitude, longitude), or tap the <strong>location button</strong> to search around where you are right now.
        {ghlMode ? " Inside your CRM, if precise GPS isn't available, an approximate location based on your internet connection is used instead." : ""}
      </p>
      <p>
        Results load <strong>50 per page</strong> with Previous / Next controls, and you can sort by <strong>Distance, Lifetime Value, Orders, or Last Service</strong>. Use the <strong>RLT / BIZ / REG</strong> filter chips to narrow results to a single customer category.
      </p>
      <p>
        Switch between <strong>List</strong> and <strong>Map</strong> views at any time. On the map, nearby pins group into clusters as you zoom out, and pin color reflects lifetime value: <strong>green</strong> for $1,000 and up, <strong>amber</strong> for $300 and up, <strong>gray</strong> below that. The <strong>red</strong> pin is always the center of your search.
      </p>
    </>
  );
}

function SelectAndExport({ ghlMode }: { ghlMode: boolean }) {
  return (
    <>
      <p>
        Tick individual contacts, or use the checkbox in the results header to select the whole page. When your search has more results than one page, a banner appears offering <strong>Select all N contacts across all pages</strong> — one click selects every matching contact, not just the 50 in front of you.
      </p>
      <p>
        Click <strong>Export CSV</strong> to download your whole result set (every page, not just the current one). The file includes first and last name, phone, full address, distance, lifetime value, order and gift counts, last order and last service dates, RLT / BIZ / CAT values, and county.
      </p>
      {ghlMode && (
        <p>
          Your selection — including a cross-page "select all" — is what <strong>Group Text</strong> and <strong>Tag Contacts</strong> act on.
        </p>
      )}
    </>
  );
}

function StandaloneGuide() {
  return (
    <div className="space-y-2">
      <Section icon={Users} title="1. Create Your Account">
        <p>
          Visit <strong>edgelocalist.app</strong> and click <strong>Start Free Trial</strong> or <strong>Log In</strong>. You can sign up with your email and a password, or use the <strong>Magic Link</strong> option to receive a one-click login link via email. Forgot your password? Use the reset link on the sign-in form and you'll get an email to set a new one.
        </p>
        <p>
          After signing in for the first time, you'll be asked for your <strong>full name</strong> and your <strong>8-digit Rep Number</strong> (your 8-digit representative ID). This connects your contacts to your account and is required before you can reach the dashboard. Your rep number can only be set once — after it's saved it's locked, so double-check it before saving.
        </p>
        <p>
          Tick <strong>Keep me signed in</strong> on the login screen to stay logged in. If you leave it unticked, you'll be signed out automatically after <strong>15 minutes of inactivity</strong> for security.
        </p>
      </Section>

      <Section icon={CreditCard} title="2. Plans & Free Trial">
        <p>
          Your trial requires a card on file. Until an active plan and a valid payment method are in place, the dashboard sends you to secure Stripe checkout instead of opening.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>AKL LocaList</strong> — $9 / month</li>
          <li><strong>AKL Snack Pack</strong> — $16 / month</li>
          <li><strong>EdgeDMS</strong> — $97 / month</li>
        </ul>
        <p>
          You can change plans, update your card, view invoices, or cancel at any time from <strong>Settings → Open Billing Portal</strong>. If a payment or upgrade doesn't show up right away, click <strong>Refresh Subscription Status</strong>.
        </p>
      </Section>

      <Section icon={Upload} title="3. Upload Your Contacts">
        <p>
          Navigate to the <strong>📋 Contacts</strong> tab on your dashboard. Click <strong>Choose File</strong> or drag and drop a <strong>.csv</strong> file containing your customer data.
        </p>
        <p><strong>Columns the uploader looks for:</strong> First Name, Last Name, Address 1, Address 2, City, State, Zip, Phone, Email, Customer #, Rep #</p>
        <p><strong>Also picked up when present:</strong> Business Name, Category, Lifetime Value, Last Order Date, Last Service Date, Gift Count, Order Count, Relationship, and the RLT / BIZ / CAT values.</p>
        <p>
          Common column-name variations are detected automatically (e.g., "First" or "FirstName" both work). Duplicate phone numbers are merged — the last row wins. PO Boxes are skipped, and Address 2 is stored but Address 1 is what gets mapped.
        </p>
        <p>
          After upload, addresses are processed in batches and you'll see a progress indicator. You can re-upload a newer file at any time, or use <strong>Delete All Contacts</strong> (with double confirmation) to clear everything.
        </p>
      </Section>

      <Section icon={Search} title="4. Search for Nearby Contacts">
        <SharedSearchDetails ghlMode={false} />
      </Section>

      <Section icon={MapPin} title="5. View Contact Details">
        <p>
          Click any contact in the results list or tap a pin on the map to open the <strong>Contact Detail</strong> card. It shows the full address and county, distance from your search center, lifetime value, last order date, last service date, and sales metrics including order count, gift count, and RLT / BIZ / CAT.
        </p>
      </Section>

      <Section icon={Phone} title="6. Quick Actions">
        <p>Each contact card includes one-tap action buttons:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>📞 Call</strong> — opens your phone dialer with the contact's number</li>
          <li><strong>💬 Text</strong> — opens your messaging app with a pre-filled introduction</li>
          <li><strong>🗺️ Directions</strong> — opens Google Maps with turn-by-turn directions</li>
          <li><strong>🗑️ Delete</strong> — removes a single contact from your list after confirmation</li>
        </ul>
      </Section>

      <Section icon={Download} title="7. Select & Export Results">
        <SelectAndExport ghlMode={false} />
      </Section>

      <Section icon={Settings} title="8. Account Settings">
        <p>
          Click <strong>Settings</strong> in the top navigation to update your display name, view your rep number and current plan with its renewal date, open the billing portal, and refresh your subscription status.
        </p>
      </Section>

      <Section icon={Shield} title="9. Data & Security">
        <p>
          Your contacts are stored securely with encryption at rest and in transit. Row-level security ensures only you can see your own data — no other representative has access to your contacts. You can delete individual contacts or all of them at any time from the Contacts tab.
        </p>
        <p>
          Need help? Email <strong>support@edgedms.com</strong>.
        </p>
      </Section>
    </div>
  );
}

function EdgeDmsGuide() {
  return (
    <div className="space-y-2">
      <Section icon={Users} title="1. Getting Started">
        <p>
          EdgeLocalist is installed inside your <strong>Edge DMS</strong> account and appears in your CRM's app menu. Open it and you're signed in automatically through a secure single sign-on connection — <strong>no separate account or password is needed</strong>, and you won't be asked to fill in a profile.
        </p>
      </Section>

      <Section icon={Plug} title="2. Connecting Your CRM">
        <p>
          The app can be installed <strong>once at the agency (company) level</strong> and then used across every sub-account, or installed into an individual sub-account. Agency installs are the recommended setup — one authorization covers all of your locations.
        </p>
        <p>
          If a location is open but not yet authorized, the control panel shows a <strong>CRM not authorized</strong> notice with an <strong>Install LocaList in GHL</strong> button. Clicking it opens the authorization screen in a <strong>small popup window</strong> (your CRM blocks it from loading inline). Approve the permissions, and the popup closes and the app reconnects on its own. If your browser blocks popups, allow them for your CRM and try again.
        </p>
        <p>
          Authorization is renewed automatically in the background, so a working connection stays working.
        </p>
      </Section>

      <Section icon={RefreshCw} title="3. Contact Sync">
        <p>
          When you first open EdgeLocalist it syncs all of your CRM contacts — fetching details, saving them securely, and mapping addresses so they're searchable by location. Large lists are pulled in chunks and can take several minutes.
        </p>
        <p>The <strong>sync progress dialog</strong> shows each step in real time:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Connecting to Edge DMS</li>
          <li>Fetching your contacts</li>
          <li>Saving to your account</li>
          <li>Processing addresses (including filling in county and sending coordinates back to your CRM)</li>
          <li>Preparing search results</li>
        </ol>
        <p>
          When it finishes you'll see a summary: total contacts, how many are searchable, and how many still need address processing. If a very large sync runs long, you may be asked to click <strong>Refresh GHL Contacts</strong> once more — your contacts keep saving in the background and the next run picks up where it left off.
        </p>
        <p>
          After the initial sync, changes made in your CRM flow through to LocaList automatically within a few seconds, and your contact count on the dashboard updates itself. You can start a full re-sync anytime with the <strong>Refresh GHL Contacts</strong> button on your control panel.
        </p>
      </Section>

      <Section icon={Search} title="4. Nearby Search">
        <SharedSearchDetails ghlMode={true} />
      </Section>

      <Section icon={Filter} title="5. Select, Export & Act on Results">
        <SelectAndExport ghlMode={true} />
      </Section>

      <Section icon={MapPin} title="6. Contact Details & Actions">
        <p>
          Click any contact to open their detail card. You'll see their full address and county, distance, lifetime value, last order and last service dates, and sales data including order count, gift count, and RLT / BIZ / CAT.
        </p>
        <p>Quick action buttons let you:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>📞 Call</strong> — dial the contact directly</li>
          <li><strong>💬 Text</strong> — send a pre-filled SMS</li>
          <li><strong>🗺️ Directions</strong> — get Google Maps directions</li>
          <li><strong>📱 LC Call</strong> — place the call through your Edge DMS calling system</li>
          <li><strong>🔗 View in CRM</strong> — jump straight to that contact's record in Edge DMS</li>
        </ul>
      </Section>

      <Section icon={MessageSquare} title="7. Group SMS">
        <p>
          After running a nearby search, select your contacts and click <strong>Group Text</strong> to send a personalized message to all of them at once.
        </p>
        <p>
          Pick a ready-made template from the snippet library — choose a category, a snippet, and a send timing (Immediate, Morning Gap, or In Advance) — or write your own message, up to 1,600 characters. <strong>Don't add "Hi [Name]"</strong> — your Edge DMS Workflow adds it automatically.
        </p>
        <p>When you click <strong>Save Message &amp; Apply Tag</strong>, two things happen behind the scenes:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Your message is saved as a Custom Value in Edge DMS</li>
          <li>A trigger tag (default <strong>localist-sms</strong>, editable) is applied to all selected contacts, in batches of 500</li>
        </ol>
        <p>Your Edge DMS Workflow then fires for each tagged contact, sending an SMS that looks like:</p>
        <p className="bg-muted/50 rounded-md p-3 text-sm italic">
          Hi [Contact's First Name],<br /><br />[Your Message]
        </p>
        <p>
          After sending, the Workflow removes the trigger tag so contacts can receive future messages. Only contacts with valid CRM IDs are included — contacts that came from a CSV are filtered out automatically. You'll see a confirmation with the number tagged and a sample of the message.
        </p>
      </Section>

      <Section icon={Tag} title="8. Tag Contacts">
        <p>
          Select contacts from your search results and click <strong>Tag Contacts</strong> to apply a custom tag. Tags sync to your Edge DMS CRM using bulk tagging, staying fast even for very large selections (up to 2,000 contacts per batch).
        </p>
        <p>
          Contacts without valid CRM IDs (for example, CSV-uploaded ones) are filtered out before tagging, and you'll see an accurate confirmation of how many were tagged.
        </p>
      </Section>

      <Section icon={MapIcon} title="9. What Syncs Back to Your CRM">
        <p>
          LocaList isn't one-way. During address processing it writes each contact's <strong>county</strong> and <strong>map coordinates</strong> back into Edge DMS, so you can build county-level segments and campaign audiences directly in your CRM. Tags you apply in LocaList appear on the contact record too.
        </p>
      </Section>

      <Section icon={Shield} title="10. Security & Privacy">
        <p>
          All data is encrypted at rest and in transit. Authorization tokens are managed server-side and refreshed automatically — they're never exposed to your browser. Row-level security policies ensure complete data isolation between representatives.
        </p>
        <p>
          Updates coming from your CRM are verified before processing, and SMS sending is rate-limited to prevent abuse.
        </p>
        <p>
          Need help? Email <strong>support@edgedms.com</strong>.
        </p>
      </Section>
    </div>
  );
}

export default function UserGuide() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <img src={localistLogo} alt="AKL LocaList" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <h1
          className="text-3xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "'Oswald', sans-serif" }}
        >
          User Guide
        </h1>
        <p className="text-muted-foreground mb-2">
          Everything you need to know to get the most out of AKL LocaList.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Looking for what changed recently? See the{" "}
          <Link to="/changelog" className="text-primary underline underline-offset-2">
            Changelog
          </Link>
          .
        </p>

        <Tabs defaultValue="standalone" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="standalone">Standalone</TabsTrigger>
            <TabsTrigger value="edgedms">Edge DMS Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="standalone">
            <StandaloneGuide />
          </TabsContent>

          <TabsContent value="edgedms">
            <EdgeDmsGuide />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
