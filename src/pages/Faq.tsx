import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import localistLogo from "@/assets/Localist-Final-Logo.png";
import Footer from "@/components/Footer";

const standaloneFaq = [
  {
    q: "What is AKL LocaList?",
    a: "AKL LocaList is a proximity-based contact search tool built for Cutco sales representatives. It lets you upload your customer list and instantly find contacts near any location — so you can plan efficient routes and maximize your door-knocking time.",
  },
  {
    q: "How do I get started?",
    a: "Create an account at the app, log in, and navigate to the Contacts tab on your dashboard. From there, upload a CSV file containing your customer data. AKL LocaList will automatically process the addresses and make them searchable.",
  },
  {
    q: "What format does my CSV need to be in?",
    a: "Your CSV should include columns for First Name, Last Name, Address, City, State, Zip, and Phone. Optional columns include Business Name, Category, Lifetime Value, Last Order Date, Gift Count, and Order Count. The system will auto-detect common column name variations.",
  },
  {
    q: "How does the nearby search work?",
    a: "Enter any address or location in the search bar, choose a radius (5, 10, 25, or 50 miles), and AKL LocaList will return all your contacts within that area, sorted by distance. You can view results on a map or as a list.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is stored securely in an encrypted database. Your contacts are only visible to your account — no other representative can see your data. We use row-level security policies to enforce strict data isolation.",
  },
  {
    q: "Can I re-upload my contacts?",
    a: "Absolutely. You can re-upload a new CSV at any time from the Contacts tab. The system will merge new data with existing records, matching by phone number to avoid duplicates.",
  },
  {
    q: "What is my Rep Number?",
    a: "Your Rep Number is your 8-digit Cutco representative ID. It's used to link your contacts to your account and is required during initial setup.",
  },
  {
    q: "How do I change my display name or account settings?",
    a: "Navigate to Settings from the top navigation bar or the Settings tab on your dashboard. From there you can update your display name and manage your account.",
  },
  {
    q: "Is there a limit to how many contacts I can upload?",
    a: "There is no hard limit on contacts. However, very large lists (10,000+) may take a few minutes to fully process. The system handles addresses in batches to ensure reliability.",
  },
  {
    q: "Can I use AKL LocaList on my phone?",
    a: "Yes! AKL LocaList is fully responsive and works great on mobile browsers. You can search for nearby contacts, view them on the map, and make calls or send texts directly from the contact detail cards.",
  },
  {
    q: "How do I delete all my contacts and start fresh?",
    a: "In the Contacts tab, scroll to the bottom and use the \"Delete All Contacts\" button. This will permanently remove all contacts from your account. You can then re-upload a new CSV.",
  },
];

const edgeDmsFaq = [
  {
    q: "What is AKL LocaList?",
    a: "AKL LocaList is a proximity-based contact search tool that integrates directly with your Edge DMS CRM. It syncs your CRM contacts and lets you instantly find customers near any location — perfect for planning routes and maximizing face-to-face time.",
  },
  {
    q: "How does AKL LocaList connect to Edge DMS?",
    a: "AKL LocaList is installed as an app inside your Edge DMS account. Once your administrator installs it, you'll find it in your CRM's navigation. It automatically syncs your contacts and keeps them up to date.",
  },
  {
    q: "Do I need to create a separate account?",
    a: "No. When you open AKL LocaList from within Edge DMS, it automatically provisions your account using a secure single sign-on handshake. You're logged in instantly with no extra passwords to remember.",
  },
  {
    q: "How does the contact sync work?",
    a: "When you first open AKL LocaList (or every 24 hours), it automatically pulls your contacts from Edge DMS and makes them available for nearby search. You can also trigger a manual sync using the Refresh button on your dashboard.",
  },
  {
    q: "What does the sync progress dialog show?",
    a: "During a sync, you'll see a step-by-step progress indicator: connecting to Edge DMS, fetching contacts, saving to your account, and preparing search results. Each step shows its status and any relevant counts.",
  },
  {
    q: "How does the nearby search work?",
    a: "Enter any address or location in the search bar, choose a radius (5, 10, 25, or 50 miles), and AKL LocaList will return all your contacts within that area, sorted by distance. You can view results on a map or as a list.",
  },
  {
    q: "Can I call or text contacts from AKL LocaList?",
    a: "Yes! Each contact card has quick-action buttons for calling, texting, and getting driving directions via Google Maps. In Edge DMS mode, you can also initiate LC calls directly from the contact detail view.",
  },
  {
    q: "What is the Group SMS feature?",
    a: "Group SMS lets you send a personalized text message to multiple nearby contacts at once. Choose from pre-built templates or write a custom message. Each message is personalized with the contact's first name and city. Only contacts with valid CRM IDs are included — CSV-only contacts without a CRM record are automatically filtered out so your send count is always accurate.",
  },
  {
    q: "Can I tag contacts from search results?",
    a: "Yes. After running a nearby search, you can select contacts and apply a tag that syncs back to your Edge DMS CRM using the bulk tagging API for fast processing. Contacts without valid CRM IDs (e.g., CSV-uploaded contacts) are automatically filtered out before tagging, so your success and failure counts are always accurate.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is stored securely with encryption at rest and in transit. Your contacts are isolated to your account using row-level security policies. The integration uses OAuth tokens that are refreshed automatically and never exposed to the browser.",
  },
  {
    q: "What if the sync fails?",
    a: "If a sync encounters an error, the progress dialog will show which step failed and display an error message. Common issues include expired CRM tokens (resolved automatically on retry) or network timeouts. Try clicking Refresh again — most issues resolve on the second attempt.",
  },
  {
    q: "Why are some contacts missing from search results?",
    a: "Contacts need a valid address to appear in nearby search results. If a contact has no address or an address that couldn't be processed, they won't appear on the map. Check the sync summary to see how many contacts are 'searchable' vs total.",
  },
  {
    q: "Can I use AKL LocaList on my phone?",
    a: "Yes! AKL LocaList is fully responsive. When accessed through Edge DMS on mobile, you get the same search, map, and quick-action features optimized for smaller screens.",
  },
  {
    q: "How do I get the LC Call feature?",
    a: "The LC Call button appears automatically when you're using AKL LocaList within Edge DMS. It initiates a call through your CRM's calling system directly from the contact detail card.",
  },
];

export default function Faq() {
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
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground mb-8">
          Find answers to common questions about AKL LocaList.
        </p>

        <Tabs defaultValue="standalone" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="standalone">Standalone</TabsTrigger>
            <TabsTrigger value="edgedms">Edge DMS Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="standalone">
            <Accordion type="single" collapsible className="w-full">
              {standaloneFaq.map((item, i) => (
                <AccordionItem key={i} value={`standalone-${i}`}>
                  <AccordionTrigger className="text-left text-sm sm:text-base font-medium">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="edgedms">
            <Accordion type="single" collapsible className="w-full">
              {edgeDmsFaq.map((item, i) => (
                <AccordionItem key={i} value={`edgedms-${i}`}>
                  <AccordionTrigger className="text-left text-sm sm:text-base font-medium">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
