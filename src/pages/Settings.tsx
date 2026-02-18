import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { LogOut, MapPin, ArrowLeft, ExternalLink, Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GHL_CLIENT_ID = (import.meta.env.VITE_GHL_CLIENT_ID ?? "") as string;
const REDIRECT_URI = `${window.location.origin}/ghl-callback`;

export default function Settings() {
  const { user, repProfile, signOut, isGhlMode, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnectGHL = () => {
    if (!GHL_CLIENT_ID) {
      toast({ title: "GHL Client ID not configured", variant: "destructive" });
      return;
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: GHL_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "contacts.readonly contacts.write locations.readonly conversations/message.write",
    });
    window.location.href = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?${params}`;
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Please sign in first", variant: "destructive" }); return; }
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast({ title: "Billing error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>
              EdgeLocalist
            </span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 pt-24 max-w-2xl space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Oswald', sans-serif" }}>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{repProfile?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="secondary" className="capitalize">
                {repProfile?.subscription_tier ?? "standalone"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant={isGhlMode ? "default" : "secondary"}>
                {isGhlMode ? "GHL Mode" : "CSV Mode"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Oswald', sans-serif" }}>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Manage your subscription, update payment method, or cancel anytime.
            </p>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={loading}
              className="w-full min-h-[44px]"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>

        {/* GHL connection */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Oswald', sans-serif" }}>GoHighLevel Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isGhlMode ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Location ID: <span className="font-mono">{repProfile?.ghl_location_id}</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => toast({ title: "To disconnect GHL, contact support@edgedms.com" })}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect GHL
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Connect your GoHighLevel account to automatically sync contacts and enable LC Calls.
                </p>
                <Button
                  onClick={handleConnectGHL}
                  disabled={connecting}
                  className="w-full min-h-[44px]"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {connecting ? "Connecting…" : "Connect GoHighLevel"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sign out */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full min-h-[44px] text-destructive hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
