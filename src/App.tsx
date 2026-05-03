import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import GhlCallback from "./pages/GhlCallback";
import Faq from "./pages/Faq";
import UserGuide from "./pages/UserGuide";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import { supabaseConfigured } from "@/integrations/supabase/client";
import { MapPin, AlertTriangle } from "lucide-react";
import IframeApp from "./components/IframeApp";
import CookieConsent from "./components/CookieConsent";
import { isRunningInGhlIframe } from "@/lib/is-ghl-iframe";

// ─── Top-level iframe detection (runs before any React tree) ───
// Only treat as GHL iframe if actually embedded AND not in Lovable preview
const isIframe = isRunningInGhlIframe();

const queryClient = new QueryClient();

function MissingCredentials() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <MapPin className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
            AKL LocaList
          </span>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Supabase credentials missing</span>
          </div>
          <p className="text-sm text-muted-foreground">
            The app needs <code className="bg-muted px-1 rounded text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="bg-muted px-1 rounded text-xs">VITE_SUPABASE_ANON_KEY</code> to connect to the database.
          </p>
          <ol className="text-sm text-left text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open Project → Settings → Secrets</li>
            <li>Add <strong>VITE_SUPABASE_URL</strong> — your Supabase project URL</li>
            <li>Add <strong>VITE_SUPABASE_ANON_KEY</strong> — your Supabase anon/public key</li>
            <li>Reload the preview</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Find these values in your Supabase dashboard under{" "}
            <strong>Project Settings → API</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

const App = () => {
  // ─── AGGRESSIVE SHORT-CIRCUIT: iframe → skip all routing/auth ───
  if (isIframe) {
    return <IframeApp />;
  }

  if (!supabaseConfigured) {
    return <MissingCredentials />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="/legal" element={<Legal />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/guide" element={<UserGuide />} />
              <Route path="/ghl-callback" element={<GhlCallback />} />
              <Route path="/localist-setup" element={<GhlCallback />} />
              <Route path="/callback" element={<GhlCallback />} />
              <Route path="/leadconnector/oauth" element={<GhlCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
