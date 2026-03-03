import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, Search, MapPin, Phone, MessageSquare, RefreshCw, Tag, Users, Settings, Shield } from "lucide-react";
import localistLogo from "@/assets/Localist-Final-Logo.png";
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

function StandaloneGuide() {
  return (
    <div className="space-y-2">
      <Section icon={Users} title="1. Create Your Account">
        <p>
          Visit <strong>edgelocalist.app</strong> and click <strong>Start Free Trial</strong> or <strong>Log In</strong>. You can sign up with your email and a password, or use the <strong>Magic Link</strong> option to receive a one-click login link via email.
        </p>
        <p>
          After signing in for the first time, you'll be asked to enter your <strong>8-digit Rep Number</strong> (your Cutco representative ID). This connects your contacts to your account and is required before you can access the dashboard.
        </p>
      </Section>

      <Section icon={Upload} title="2. Upload Your Contacts">
        <p>
          Navigate to the <strong>📋 Contacts</strong> tab on your dashboard. Click <strong>Choose File</strong> or drag and drop a CSV file containing your customer data.
        </p>
        <p><strong>Required columns:</strong> First Name, Last Name, Address, City, State, Zip, Phone</p>
        <p><strong>Optional columns:</strong> Business Name, Category, Lifetime Value, Last Order Date, Gift Count, Order Count, Relationship</p>
        <p>
          The system automatically detects common column name variations (e.g., "First" or "FirstName" both work). After upload, addresses are geocoded in batches — you'll see a progress indicator showing how many contacts have been processed.
        </p>
      </Section>

      <Section icon={Search} title="3. Search for Nearby Contacts">
        <p>
          Go to the <strong>🔍 Search</strong> tab. Type any address, city, or ZIP code into the search bar. Select your search radius — <strong>5, 10, 25, or 50 miles</strong> — and click <strong>Search</strong>.
        </p>
        <p>
          Results appear as a scrollable list sorted by distance, and as color-coded pins on an interactive map. Pin colors indicate lifetime value: green for higher-value customers, yellow for mid-range, and red for lower-value.
        </p>
      </Section>

      <Section icon={MapPin} title="4. View Contact Details">
        <p>
          Click any contact in the results list or tap a pin on the map to open the <strong>Contact Detail</strong> card. This shows the contact's full address, distance from your search center, lifetime value, last order date, and Cutco-specific metrics like gift count and order count.
        </p>
      </Section>

      <Section icon={Phone} title="5. Quick Actions">
        <p>
          Each contact card includes one-tap action buttons:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>📞 Call</strong> — opens your phone dialer with the contact's number</li>
          <li><strong>💬 Text</strong> — opens your messaging app with a pre-filled introduction</li>
          <li><strong>🗺️ Directions</strong> — opens Google Maps with turn-by-turn directions to the contact's address</li>
        </ul>
      </Section>

      <Section icon={Settings} title="6. Account Settings">
        <p>
          Click <strong>Settings</strong> in the top navigation to manage your account. You can update your display name, view your rep number and subscription plan, and access billing management.
        </p>
      </Section>

      <Section icon={Shield} title="7. Data & Security">
        <p>
          Your contacts are stored securely with encryption at rest and in transit. Row-level security ensures that only you can see your own data — no other representative has access to your contacts. You can delete all your contacts at any time from the Contacts tab.
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
          EdgeLocalist is installed directly inside your <strong>Edge DMS</strong> account by your administrator. Once installed, you'll find it in your CRM's app menu. Simply click to open — <strong>no separate account or password is needed</strong>. The system automatically provisions your account using a secure single sign-on connection.
        </p>
      </Section>

      <Section icon={RefreshCw} title="2. Contact Sync">
        <p>
          When you first open EdgeLocalist, it automatically syncs all your CRM contacts. This includes fetching contact details, saving them securely, and geocoding addresses so they're searchable by location.
        </p>
        <p>
          The <strong>sync progress dialog</strong> shows each step in real-time:
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Connecting to Edge DMS</li>
          <li>Fetching your contacts</li>
          <li>Saving to your account</li>
          <li>Geocoding addresses</li>
          <li>Preparing search results</li>
        </ol>
        <p>
          After the initial sync, contacts refresh automatically every 24 hours. Real-time webhook updates keep individual contact changes in sync instantly. You can also trigger a manual sync anytime with the <strong>Refresh</strong> button on your control panel.
        </p>
      </Section>

      <Section icon={Search} title="3. Nearby Search">
        <p>
          Enter any address, city, or ZIP code into the search bar on the <strong>🔍 Search</strong> tab. Choose your radius — <strong>5, 10, 25, or 50 miles</strong> — and hit <strong>Search</strong>.
        </p>
        <p>
          Results are displayed as a sortable list and as color-coded pins on an interactive map. Use the map legend to understand pin colors, which reflect each contact's lifetime value.
        </p>
      </Section>

      <Section icon={MapPin} title="4. Contact Details & Actions">
        <p>
          Click any contact to open their detail card. You'll see their full address, distance, revenue metrics, last order date, and Cutco-specific data.
        </p>
        <p>Quick action buttons let you:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>📞 Call</strong> — dial the contact directly</li>
          <li><strong>💬 Text</strong> — send a pre-filled SMS</li>
          <li><strong>🗺️ Directions</strong> — get Google Maps directions</li>
          <li><strong>📱 LC Call</strong> — initiate a call through your Edge DMS calling system (appears automatically in Edge DMS mode)</li>
        </ul>
      </Section>

      <Section icon={MessageSquare} title="5. Group SMS">
        <p>
          After running a nearby search, click <strong>Group SMS</strong> to send a personalized text message to multiple contacts at once.
        </p>
        <p>
          Choose from <strong>pre-built templates</strong> (appointment scheduling, follow-ups, holiday greetings) or write your own custom message. Messages are personalized with each contact's first name and city using smart merge fields.
        </p>
        <p>
          A live preview shows exactly what your contacts will receive before you send. Only contacts with valid CRM IDs are included — CSV-only contacts are automatically filtered out so your send count is always accurate.
        </p>
      </Section>

      <Section icon={Tag} title="6. Tag Contacts">
        <p>
          Select contacts from your search results and click <strong>Tag Contacts</strong> to apply a custom tag. Tags are synced to your Edge DMS CRM using the bulk tagging API, making the process fast even for large selections (up to 2,000 contacts per batch).
        </p>
        <p>
          Contacts without valid CRM IDs (e.g., CSV-uploaded contacts) are automatically filtered out before tagging. You'll see an accurate confirmation showing how many contacts were successfully tagged.
        </p>
      </Section>

      <Section icon={Shield} title="7. Security & Privacy">
        <p>
          All data is encrypted at rest and in transit. OAuth tokens are managed server-side and automatically refreshed — they're never exposed to your browser. Row-level security policies ensure complete data isolation between representatives.
        </p>
        <p>
          Webhook updates from your CRM are verified before processing. SMS sending is rate-limited to prevent abuse.
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
        <p className="text-muted-foreground mb-8">
          Everything you need to know to get the most out of AKL LocaList.
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
