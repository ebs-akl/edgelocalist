import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useRef, type ReactNode } from "react";
import CheckoutRedirect from "./CheckoutRedirect";
import { isRunningInGhlIframe } from "@/lib/is-ghl-iframe";

const VALID_TIERS = new Set(["LOCALIST", "SNACK PACK", "EDGE BASIC"]);

interface ProtectedRouteProps {
  children: ReactNode;
}

// Only bypass the subscription/auth gate when we're inside a legitimate
// GHL-hosted iframe (non-preview host). A generic `window.self !== window.top`
// check let ANY page embed the app in an iframe and skip billing enforcement.
function isTrustedGhlEmbed(): boolean {
  return isRunningInGhlIframe();
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, subscription, loadingSubscription } = useAuth();
  const verifiedOnce = useRef(false);

  // Once subscription has been verified, remember it so background checks don't unmount children
  if (isAuthenticated && !loadingSubscription && subscription.tier) {
    verifiedOnce.current = true;
  }

  // Only gate on loading during initial page load, not background refreshes
  if (loading || (isAuthenticated && loadingSubscription && !verifiedOnce.current)) {
    if (isTrustedGhlEmbed()) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Establishing Secure Connection…
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isTrustedGhlEmbed()) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Establishing Secure Connection…
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/auth" replace />;
  }

  // Subscription gate: enforce for everyone except legitimate GHL-embedded sessions.
  // Any authenticated user loading the app outside a real GHL iframe must have a
  // valid tier + payment method on file.
  if (!loadingSubscription && !isTrustedGhlEmbed()) {
    const hasValidTier = subscription.tier && VALID_TIERS.has(subscription.tier);
    if (!hasValidTier || !subscription.paymentMethodOnFile) {
      return <CheckoutRedirect />;
    }
  }

  return <>{children}</>;
}
