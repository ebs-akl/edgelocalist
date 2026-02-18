import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { MapPin, Upload, Search, Menu, CheckCircle2, ArrowRight, Zap, BarChart3 } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const stats = [
  { label: "Contacts Searchable", value: "500K+" },
  { label: "Reps Active", value: "85+" },
  { label: "Searches / Day", value: "1,200+" },
  { label: "Accuracy Rate", value: "99.1%" },
];

const features = [
  {
    icon: Upload,
    title: "CSV Upload",
    description:
      "Export contacts from VectorConnect, upload once, and we geocode every address automatically. Re-upload anytime to refresh.",
  },
  {
    icon: MapPin,
    title: "Radius Search",
    description:
      "Type any address or tap GPS. Choose 10, 25, or 50 miles. Every customer in range appears instantly — sorted by distance.",
  },
  {
    icon: Search,
    title: "One-Tap Actions",
    description:
      "Call, text, or get directions to any contact with a single tap. Pre-filled SMS messages save you time in the field.",
  },
];

const pricingPlans = [
  {
    name: "Standalone",
    price: "$9",
    period: "/mo",
    description: "Perfect for reps who want radius search without a full CRM.",
    features: [
      "CSV Upload from VectorConnect",
      "Radius Search (10/25/50 mi)",
      "Call & SMS one-tap actions",
      "Lifetime value tracking",
      "Unlimited searches",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "EdgeDMS",
    price: "$97",
    period: "/mo",
    description: "Included in the full EdgeDMS platform with GHL sync.",
    features: [
      "Everything in Standalone",
      "Auto-sync from GoHighLevel",
      "LC Call integration",
      "24-hour contact refresh",
      "Full EdgeDMS suite",
    ],
    cta: "Get EdgeDMS",
    highlighted: true,
  },
];

// Hexagon SVG pattern background component
function HexBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-10"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="hex" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
          <polygon
            points="28,2 54,16 54,84 28,98 2,84 2,16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <polygon
            points="56,52 82,66 82,134 56,148 30,134 30,66"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" className="text-primary-foreground" />
    </svg>
  );
}

export default function Landing() {
  const [contactCount] = useState(500000);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>
              EdgeLocalist
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Start Free Trial
              </Button>
            </Link>
          </div>

          {/* Mobile nav */}
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <Link to="/auth" className="w-full">
                    <SheetClose asChild>
                      <Button variant="ghost" className="w-full justify-start">Login</Button>
                    </SheetClose>
                  </Link>
                  <Link to="/auth" className="w-full">
                    <SheetClose asChild>
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                        Start Free Trial
                      </Button>
                    </SheetClose>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-16 sm:pt-36 sm:pb-24 overflow-hidden bg-primary">
        <HexBackground />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-5 rounded-full bg-primary-foreground/15 px-4 py-1.5 border border-primary-foreground/20">
              <Zap className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">Part of the EdgeDMS Platform</span>
            </div>

            <h1
              className="mb-5 text-4xl text-primary-foreground sm:text-5xl lg:text-7xl uppercase leading-none"
              style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.03em" }}
            >
              YOUR CUTCO CUSTOMERS.
              <br />
              <span className="text-primary-foreground/75">FOUND IN SECONDS.</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-base sm:text-lg text-primary-foreground/70">
              EdgeLocalist finds every customer within driving distance — automatically.
              No spreadsheets. No guessing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="text-base px-8 min-h-[48px]"
                  style={{ backgroundColor: "#34dfdf", color: "#0a1a1a" }}
                >
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 min-h-[48px]"
              >
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-primary-foreground/10 p-4 backdrop-blur-sm border border-primary-foreground/20"
              >
                <div
                  className="text-2xl font-bold text-primary-foreground"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Everything You Need. Nothing You Don't.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Three powerful features built for Cutco reps in the field.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
              >
                <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EdgeDMS Platform mention */}
      <section className="py-12 sm:py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <BarChart3 className="h-4 w-4" /> Part of the EdgeDMS Platform
            </div>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Better Together with ALOMAR
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              EdgeLocalist is the field tool. ALOMAR Order Catcher is the back-office engine. Together they form
              the complete Automated Knife Life stack — so your Cutco business runs itself, from the first
              customer visit to the final commission deposit.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Simple Pricing. No Guessing.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card
                  className={`h-full ${
                    plan.highlighted
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border/60"
                  }`}
                >
                  <CardContent className="p-6">
                    {plan.highlighted && (
                      <div className="mb-3 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-4xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth">
                      <Button
                        className="w-full min-h-[44px]"
                        variant={plan.highlighted ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
              EdgeLocalist
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Edge Branding Solutions · Part of the EdgeDMS Platform
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Built for Cutco / Vector Marketing representatives
          </p>
        </div>
      </footer>
    </div>
  );
}
