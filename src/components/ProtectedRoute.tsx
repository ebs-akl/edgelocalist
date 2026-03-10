import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

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

  if (loading) {
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

  // Wait for subscription check to complete before gating
  if (loadingSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Verifying subscription...
          </p>
        </div>
      </div>
    );
  }

  // Subscription gate: redirect to pricing if no valid tier
  if (!subscription.tier || !VALID_TIERS.has(subscription.tier)) {
    // Don't gate iframe/GHL users
    if (!isInIframe()) {
      return <Navigate to="/#pricing" replace />;
    }
  }

  return <>{children}</>;
}
