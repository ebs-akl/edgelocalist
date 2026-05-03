import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/stripe-tiers";
import { Button } from "@/components/ui/button";

interface CheckoutRedirectProps {
  tier?: TierKey;
}

/**
 * Auto-invokes Stripe checkout for the given tier (default LOCALIST)
 * and redirects the browser to the hosted checkout page.
 * Shown when an authenticated user has no active subscription / payment method.
 */
export default function CheckoutRedirect({ tier = "LOCALIST" }: CheckoutRedirectProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const priceId = TIERS[tier].price_id;
        const { data, error } = await supabase.functions.invoke("localist-create-checkout", {
          body: { priceId },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to start checkout");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">Couldn't start checkout</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>Try again</Button>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Redirecting you to secure checkout…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
