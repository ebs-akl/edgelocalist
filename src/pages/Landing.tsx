import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { MapPin, Upload, Search, Menu, CheckCircle2, ArrowRight, Zap, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/stripe-tiers";
import { toast } from "@/hooks/use-toast";
import heroBg from "@/assets/hero-bg.gif";
import edgeBrandingLogo from "@/assets/Edge_Branding_Landscape.png";
import heroPhone from "@/assets/Localist_Hero_Phone.png";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
  })
};


const features = [
{
  icon: Upload,
  title: "CSV Upload",
  description:
  "Export contacts from VectorConnect, upload once, and we geocode every address automatically. Re-upload anytime to refresh."
},
{
  icon: MapPin,
  title: "Radius Search",
  description:
  "Type any address or tap GPS. Choose 10, 25, or 50 miles. Every customer in range appears instantly — sorted by distance."
},
{
  icon: Search,
  title: "One-Tap Actions",
  description:
  "Call, text, or get directions to any contact with a single tap. Pre-filled SMS messages save you time in the field."
}];


const pricingPlans: { name: string; tierKey: TierKey | null; price: string; period: string; features: string[]; cta: string; highlighted: boolean }[] = [
{
  name: "AKL LocaList",
  tierKey: "standalone",
  price: "$9",
  period: "/mo",
  features: [
    "CSV Upload from VectorConnect",
    "Radius Search (10/25/50 mi)",
    "Call & SMS one-tap actions",
    "Lifetime value tracking"],
  cta: "Get Started",
  highlighted: false
},
{
  name: "AKL Snack Pack",
  tierKey: "snack_pack",
  price: "$16",
  period: "/mo",
  features: [
    "Everything in Edge LocaList",
    "ALOMAR Order Catcher included",
    "Full email parsing & CRM sync",
    "Best value — save $2/mo"],
  cta: "Get the Bundle",
  highlighted: true
},
{
  name: "EdgeDMS",
  tierKey: null,
  price: "$97",
  period: "/mo",
  features: [
    "Everything in Snack Pack",
    "Auto-sync from GoHighLevel",
    "LC Call integration",
    "Full EdgeDMS suite"],
  cta: "Coming Soon",
  highlighted: false
}];


// Hexagon SVG pattern background component
function HexBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-10"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true">

      <defs>
        <pattern id="hex" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
          <polygon
            points="28,2 54,16 54,84 28,98 2,84 2,16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1" />

          <polygon
            points="56,52 82,66 82,134 56,148 30,134 30,66"
            fill="none"
            stroke="currentColor"
            strokeWidth="1" />

        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" className="text-primary-foreground" />
    </svg>);

}

export default function Landing() {
  const [contactCount] = useState(500000);
  const { isAuthenticated, loading, session, subscription } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleCheckout = async (tierKey: TierKey) => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    setCheckoutLoading(tierKey);
    try {
      const priceId = TIERS[tierKey].price_id;
      const { data, error } = await supabase.functions.invoke("localist-create-checkout", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast({ title: "Checkout error", description: msg, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <img alt="AKL LocaList" className="h-10 w-auto object-contain" src="/lovable-uploads/localist-final-logo-2.png" />
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
      <section className="relative pt-24 pb-0 sm:pt-36 overflow-hidden bg-primary">
        {/* GIF background */}
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
        <div className="container relative mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            {/* Phone image - left */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="flex justify-center md:justify-end items-end order-2 md:order-1">
              <img
                src={heroPhone}
                alt="AKL LocaList app on phone"
                className="w-[28rem] sm:w-[32rem] md:w-[36rem] lg:w-[42rem] object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Hero text - right */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center md:text-left order-1 md:order-2 flex flex-col justify-center py-8">

              <div className="inline-flex items-center gap-2 mb-5 rounded-full bg-primary-foreground/15 px-4 py-1.5 border border-primary-foreground/20 self-center md:self-start">
                <Zap className="h-4 w-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">Part of the Automated Knife Life Platform</span>
              </div>

              <h1
                className="mb-5 text-4xl text-primary-foreground sm:text-5xl lg:text-7xl uppercase leading-none"
                style={{ fontFamily: "'Anton', sans-serif", letterSpacing: "0.03em" }}>
                YOUR CUTCO CUSTOMERS.
                <br />
                <span className="text-primary-foreground/75">FOUND IN SECONDS.</span>
              </h1>

              <p className="mb-10 max-w-lg text-base sm:text-lg text-primary-foreground/70">
                AKL LocaList finds every customer within driving distance — automatically.
                No spreadsheets. No guessing.
              </p>

              <div className="flex flex-col items-center md:items-start gap-4">
                <Link to="/auth" className="w-full sm:w-64">
                  <Button
                    size="lg"
                    className="text-base px-8 min-h-[48px] w-full"
                    style={{ backgroundColor: "#34dfdf", color: "#0a1a1a" }}>
                    Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 hover:bg-primary-foreground/10 min-h-[48px] w-full sm:w-64 text-base px-8" style={{ color: "#485856" }}>
                  Watch Demo
                </Button>
              </div>
            </motion.div>
          </div>
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
            {features.map((f, i) =>
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}>

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
            )}
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
            custom={0}>

            <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <BarChart3 className="h-4 w-4" /> Part of the Automated Knife Life Platform
            </div>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Better Together with ALOMAR
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              AKL LocaList is the field tool. ALOMAR Order Catcher is the back-office engine. Together they form
              the complete Automated Knife Life stack — so your Cutco business runs itself, from the first
              customer visit to the final commission deposit.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Start with a free trial — no credit card required. Upgrade when you're ready.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div key={plan.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className={`h-full flex flex-col ${plan.highlighted ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border/60'}`}>
                  <CardContent className="p-6 flex flex-col flex-1">
                    {plan.highlighted && (
                      <span className="inline-block self-start mb-3 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Most Popular</span>
                    )}
                    <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.tierKey ? (
                      <Button
                        className={`w-full ${plan.highlighted ? 'bg-primary text-primary-foreground' : ''}`}
                        variant={plan.highlighted ? 'default' : 'outline'}
                        disabled={checkoutLoading === plan.tierKey || (subscription.subscribed && subscription.tier === plan.tierKey)}
                        onClick={() => handleCheckout(plan.tierKey!)}
                      >
                        {checkoutLoading === plan.tierKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {subscription.subscribed && subscription.tier === plan.tierKey ? "Your Plan" : plan.cta}
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        {plan.cta}
                      </Button>
                    )}
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
          <div className="flex items-center justify-center mb-4">
            <img src={edgeBrandingLogo} alt="Edge Branding Solutions" className="h-32 w-auto object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Edge Branding Solutions · Part of the EdgeDMS Platform
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Built for Cutco / Vector Marketing representatives
          </p>
          <p className="text-[11px] text-muted-foreground/70 max-w-xl mx-auto leading-relaxed mt-3">
            EdgeDMS is an independent digital services provider and is not affiliated with, associated,
            authorized, endorsed by, or in any way officially connected with Cutco Corporation, or any
            of its subsidiaries or its affiliates.
          </p>
        </div>
      </footer>
    </div>);

}