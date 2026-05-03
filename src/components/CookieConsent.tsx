import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { trackVisit } from "@/lib/visit-tracking";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!document.cookie.split("; ").some((c) => c.startsWith("cookie_consent="))) {
      setVisible(true);
    } else {
      trackVisit();
    }
  }, []);

  const accept = () => {
    document.cookie = "cookie_consent=accepted; path=/; max-age=31536000; SameSite=Lax";
    trackVisit();
    setVisible(false);
  };

  const decline = () => {
    document.cookie = "cookie_consent=declined; path=/; max-age=31536000; SameSite=Lax";
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl border bg-background/95 backdrop-blur-md shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-sm text-muted-foreground flex-1">
            We use cookies to remember your preferences and improve your experience.{" "}
            <a href="/legal#privacy-policy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          </p>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={decline}>Decline</Button>
            <Button size="sm" onClick={accept}>Accept</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
