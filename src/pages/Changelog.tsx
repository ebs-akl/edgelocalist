import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Shield, Bug } from "lucide-react";
import localistLogo from "@/assets/Localist-Final-Logo.png";
import Footer from "@/components/Footer";

type Entry = {
  date: string;
  category: "feature" | "security" | "fix";
  title: string;
  description: string;
};

const entries: Entry[] = [
  {
    date: "July 13, 2026",
    category: "feature",
    title: "Select All Across All Pages",
    description:
      "The results header checkbox now surfaces a banner to select every matching contact across every page. Group Text, Tag, and Export CSV all operate on the full cross-page selection. Fixed the banner visibility condition and header checkbox indeterminate state.",
  },
  {
    date: "July 13, 2026",
    category: "security",
    title: "Public Schema Policy Cleanup",
    description:
      "Removed public read exposure on the recipe cache (authenticated-only now), consolidated duplicate product directory policies, and enabled RLS on the PostGIS spatial_ref_sys reference table. Set the post_images storage bucket to private so files are gated by storage.objects RLS.",
  },
  {
    date: "July 12, 2026",
    category: "feature",
    title: "CSV Export from Search Results",
    description:
      "Added an Export CSV button that iterates all pages of a search and exports name, phone, address, distance, LTV, order and gift counts, dates, RLT/BIZ/CAT metrics, and county.",
  },
  {
    date: "July 12, 2026",
    category: "security",
    title: "Bulk Security Hardening",
    description:
      "Ten findings resolved in one sweep, including price ID validation on checkout, OAuth CSRF state validation, cron endpoint authentication, RPC rep-parameter bypass, and removal of SSO key fingerprints from logs.",
  },
  {
    date: "July 10, 2026",
    category: "security",
    title: "Dependency Audit",
    description:
      "Patched 19 transitive vulnerabilities via package.json overrides — minimatch, glob, ws, fast-uri, serialize-javascript, and others.",
  },
  {
    date: "July 7, 2026",
    category: "feature",
    title: "Agency-Level (Company) Installation",
    description:
      "Converted the GHL Marketplace app to support Company installs. Updated the OAuth callback to handle user_type and agency-scoped tokens so agencies can install once and use across sub-accounts.",
  },
  {
    date: "June 2026",
    category: "security",
    title: "Cron and OAuth Hardening",
    description:
      "Added INTERNAL_CRON_SECRET authentication to the trial email cron and enforced OAuth state parameter validation. Sanitized error responses in the webhook update function.",
  },
  {
    date: "Ongoing",
    category: "fix",
    title: "GHL Iframe and SSO Reliability",
    description:
      "Various tuning to SSO handshake, iframe detection, and Marketplace embed behavior for more reliable GHL integration.",
  },
];

const iconFor = (c: Entry["category"]) => {
  if (c === "feature") return <Sparkles className="h-4 w-4" />;
  if (c === "security") return <Shield className="h-4 w-4" />;
  return <Bug className="h-4 w-4" />;
};

const labelFor = (c: Entry["category"]) =>
  c === "feature" ? "New" : c === "security" ? "Security" : "Fix";

const badgeClass = (c: Entry["category"]) =>
  c === "feature"
    ? "bg-primary/10 text-primary border-primary/20"
    : c === "security"
    ? "bg-secondary/10 text-secondary border-secondary/20"
    : "bg-muted text-muted-foreground border-border";

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={localistLogo} alt="AKL LocaList" className="h-8" />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
        <div className="mb-10">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Changelog
          </h1>
          <p className="text-muted-foreground">
            What&apos;s new in AKL LocaList — updates from the last 30 days.
          </p>
        </div>

        <ol className="relative border-l border-border ml-3 space-y-8">
          {entries.map((e, i) => (
            <li key={i} className="pl-6">
              <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{e.date}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${badgeClass(
                    e.category
                  )}`}
                >
                  {iconFor(e.category)} {labelFor(e.category)}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{e.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {e.description}
              </p>
            </li>
          ))}
        </ol>
      </main>

      <Footer />
    </div>
  );
}
