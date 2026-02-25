import { useState, useEffect, useRef } from "react";
import { useGhlSso } from "@/hooks/useGhlSso";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const iframeQueryClient = new QueryClient();

/**
 * Injects verified GHL IDs into AuthContext, then renders Dashboard
 * ONLY after context is confirmed set — preventing effects from firing
 * with a null ssoPayload and causing 401s.
 */
function GhlDashboardBridge({
  locationId,
  ssoPayload,
  Dashboard,
}: {
  locationId: string;
  ssoPayload: string;
  Dashboard: React.ComponentType;
}) {
  const { setGhlLocationId, setSsoPayload } = useAuth();
  const [contextReady, setContextReady] = useState(false);

  useEffect(() => {
    // Batch all three updates — React 18 batches them so Dashboard
    // renders with all values already in context.
    setGhlLocationId(locationId);
    setSsoPayload(ssoPayload);
    setContextReady(true);
  }, [locationId, ssoPayload, setGhlLocationId, setSsoPayload]);

  if (!contextReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Initializing GHL session...
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

/**
 * Completely isolated app shell for GHL iframe mode.
 * SSO handshake → verify payload server-side → Dashboard in GHL mode.
 */
export default function IframeApp() {
  const { ssoPayload, ssoReady, ssoError, retry } = useGhlSso();
  const [Dashboard, setDashboard] = useState<React.ComponentType | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedLocationId, setVerifiedLocationId] = useState<string | null>(null);
  const isVerifying = useRef(false);

  // Once we have a payload, verify it server-side — ONE TIME ONLY
  useEffect(() => {
    if (!ssoReady || !ssoPayload || ssoError || verifiedLocationId) return;
    if (isVerifying.current) return;
    isVerifying.current = true;
    setVerifying(true);

    console.log("🔐 Verifying SSO payload server-side (one-shot)...");

    supabase.functions
      .invoke("localist-sso-verify", { body: { payload: ssoPayload } })
      .then(async ({ data, error }) => {
        if (error) {
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
          setVerifyError(
            `${data.error}${data.rawData ? `\n\nRaw keys: ${Object.keys(data.rawData).join(", ")}` : ""}`
          );
        } else if (data?.success && data?.locationId) {
          console.log("✅ SSO verified, locationId:", data.locationId, "companyId:", data.companyId);

          // Establish a real Supabase auth session using the magic link token
          if (data.hashed_token) {
            console.log("🔑 Establishing Supabase auth session...");
            const { error: otpError } = await supabase.auth.verifyOtp({
              token_hash: data.hashed_token,
              type: "magiclink",
            });
            if (otpError) {
              console.warn("⚠️ verifyOtp failed, checking existing session:", otpError.message);
              // Token may have been used already — check for existing session
              const { data: { session: existingSession } } = await supabase.auth.getSession();
              if (!existingSession) {
                console.error("❌ No existing session and verifyOtp failed");
                setVerifyError("Session establishment failed: " + otpError.message);
                setVerifying(false);
                return;
              }
              console.log("✅ Found existing session, continuing...");
            } else {
              console.log("✅ Supabase auth session established");
            }
          }

          sessionStorage.setItem("ghl_location_id", data.locationId);
          sessionStorage.setItem("ghl_company_id", data.companyId ?? "");
          setVerifiedLocationId(data.locationId);
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
  }, [ssoReady, ssoPayload, ssoError, verifiedLocationId]);

  // Lazy-load Dashboard only after verified
  useEffect(() => {
    if (verifiedLocationId && ssoPayload && !ssoError) {
      import("@/pages/Dashboard").then((mod) => setDashboard(() => mod.default));
    }
  }, [verifiedLocationId, ssoPayload, ssoError]);

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

  // Verification failed — static error, no auto-retry
  if (verifyError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold text-sm">Verification Failed</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{verifyError}</p>
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
  if (!Dashboard || !verifiedLocationId || !ssoPayload) {
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

  // Success — render Dashboard with GHL context injected via bridge
  return (
    <QueryClientProvider client={iframeQueryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GhlDashboardBridge
              locationId={verifiedLocationId}
              ssoPayload={ssoPayload}
              Dashboard={Dashboard}
            />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
