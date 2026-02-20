import { useState, useEffect } from "react";
import { useGhlSso } from "@/hooks/useGhlSso";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const iframeQueryClient = new QueryClient();

/**
 * Completely isolated app shell for GHL iframe mode.
 * No standard routing or ProtectedRoute — just SSO handshake → Dashboard.
 */
export default function IframeApp() {
  const { ssoPayload, ssoReady, ssoError, retry } = useGhlSso();
  const [Dashboard, setDashboard] = useState<React.ComponentType | null>(null);

  // Lazy-load Dashboard only after handshake succeeds
  useEffect(() => {
    if (ssoReady && ssoPayload && !ssoError) {
      import("@/pages/Dashboard").then((mod) => setDashboard(() => mod.default));
    }
  }, [ssoReady, ssoPayload, ssoError]);

  // Still waiting for handshake
  if (!ssoReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Securing connection to HighLevel...
          </p>
        </div>
      </div>
    );
  }

  // Handshake failed
  if (ssoError || !ssoPayload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold text-sm">Connection Failed</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {ssoError || "Could not establish a secure connection to HighLevel. Please try again."}
            </p>
          </div>
          <Button onClick={retry} className="min-h-[44px] gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // Dashboard not yet loaded
  if (!Dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Success — render Dashboard inside minimal providers (no ProtectedRoute)
  return (
    <QueryClientProvider client={iframeQueryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
