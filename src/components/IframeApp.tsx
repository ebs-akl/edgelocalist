import { useState, useEffect, useRef } from "react";
import { useGhlSso } from "@/hooks/useGhlSso";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const iframeQueryClient = new QueryClient();

/**
 * Completely isolated app shell for GHL iframe mode.
 * SSO handshake → verify payload server-side → Dashboard.
 */
export default function IframeApp() {
  const { ssoPayload, ssoReady, ssoError, retry } = useGhlSso();
  const [Dashboard, setDashboard] = useState<React.ComponentType | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [ghlLocationId, setGhlLocationId] = useState<string | null>(null);
  const [ghlCompanyId, setGhlCompanyId] = useState<string | null>(null);
  const isVerifying = useRef(false);

  // Once we have a payload, verify it server-side — ONE TIME ONLY
  useEffect(() => {
    if (!ssoReady || !ssoPayload || ssoError || verified) return;
    if (isVerifying.current) return; // Already in-flight, do not duplicate
    isVerifying.current = true;
    setVerifying(true);

    console.log("🔐 Verifying SSO payload server-side (one-shot)...");

    supabase.functions
      .invoke("ghl-sso-verify", { body: { payload: ssoPayload } })
      .then(async ({ data, error }) => {
        if (error) {
          // Try to extract the actual error body from the edge function
          let detail = error.message;
          try {
            if ((error as any).context) {
              const body = await (error as any).context.json();
              detail = body?.error || JSON.stringify(body);
              if (body?.rawData) {
                console.error("🔍 RAW GHL PAYLOAD:", JSON.stringify(body.rawData, null, 2));
              }
            }
          } catch {}
          console.error("❌ SSO verify error:", detail);
          setVerifyError(`Decryption Failed: ${detail}`);
        } else if (data?.error) {
          console.error("❌ SSO verify returned error:", data.error);
          if (data?.rawData) {
            console.error("🔍 RAW GHL PAYLOAD:", JSON.stringify(data.rawData, null, 2));
          }
          setVerifyError(`${data.error}${data.rawData ? `\n\nRaw keys: ${Object.keys(data.rawData).join(", ")}` : ""}`);
        } else if (data?.success) {
          console.log("✅ SSO verified, locationId:", data.locationId, "companyId:", data.companyId);
          // Store IDs in sessionStorage so Dashboard and other components can access them
          sessionStorage.setItem("ghl_location_id", data.locationId ?? "");
          sessionStorage.setItem("ghl_company_id", data.companyId ?? "");
          setGhlLocationId(data.locationId ?? null);
          setGhlCompanyId(data.companyId ?? null);
          setVerified(true);
        } else {
          console.error("❌ Unexpected verify response:", data);
          setVerifyError("Unexpected response from SSO verification");
        }
        setVerifying(false);
      })
      .catch((err) => {
        console.error("❌ SSO verify network error:", err);
        setVerifyError(`Network error: ${err.message}`);
        setVerifying(false);
      });
  }, [ssoReady, ssoPayload, ssoError, verified]);

  // Lazy-load Dashboard only after verified
  useEffect(() => {
    if (verified && ssoPayload && !ssoError) {
      import("@/pages/Dashboard").then((mod) => setDashboard(() => mod.default));
    }
  }, [verified, ssoPayload, ssoError]);

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

  // Verifying payload server-side
  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  // Verification failed
  if (verifyError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold text-sm">Verification Failed</span>
            </div>
            <p className="text-sm text-muted-foreground">{verifyError}</p>
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

  // Success — render Dashboard inside minimal providers
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
