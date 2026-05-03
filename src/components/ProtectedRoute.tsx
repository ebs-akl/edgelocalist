import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useRef, type ReactNode } from "react";
import CheckoutRedirect from "./CheckoutRedirect";

const VALID_TIERS = new Set(["LOCALIST", "SNACK PACK", "EDGE BASIC"]);

interface ProtectedRouteProps {
  children: ReactNode;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
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
    if (isInIframe()) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Establishing Secure Connection to HighLevel...
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

  // Strict iframe guard: never redirect to /auth when in an iframe
  if (!isAuthenticated) {
    if (isInIframe()) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Establishing Secure Connection to HighLevel...
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/auth" replace />;
  }

  // Subscription gate: if no valid tier OR no payment method on file, send to Stripe checkout
  if (!loadingSubscription && !isInIframe()) {
    const hasValidTier = subscription.tier && VALID_TIERS.has(subscription.tier);
    if (!hasValidTier || !subscription.paymentMethodOnFile) {
      return <CheckoutRedirect />;
    }
  }

  return <>{children}</>;
}
