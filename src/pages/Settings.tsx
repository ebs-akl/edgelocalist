import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { LogOut, ArrowLeft, ExternalLink, Rocket, Pencil, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TIERS } from "@/lib/stripe-tiers";
import localistLogo from "@/assets/Localist-Final-Logo.png";
import Footer from "@/components/Footer";

const UPGRADE_URL = "#";

export default function Settings() {
  const { user, repProfile, signOut, isGhlMode, refreshProfile, subscription, loadingSubscription, refreshSubscription, session } = useAuth();

  const [editing, setEditing] = useState<"name" | null>(null);
  const [editName, setEditName] = useState(repProfile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    setEditName(repProfile?.full_name ?? "");
  }, [repProfile]);

  const handleSave = async () => {
    const value = editName.trim();
    if (!value) {
      toast({ title: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("localist_reps").update({ full_name: value }).eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(null);
      toast({ title: "Updated successfully" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditName(repProfile?.full_name ?? "");
    setEditing(null);
  };

  const handleManageBilling = async () => {
    if (!subscription.subscribed) {
      toast({ title: "No active subscription", description: "Subscribe to a plan first.", variant: "destructive" });
      return;
    }
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("localist-customer-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open billing portal";
      toast({ title: "Billing portal error", description: msg, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentTierName = subscription.tier
    ? TIERS[subscription.tier]?.name ?? subscription.tier
    : "None";

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center">
            <img src={localistLogo} alt="AKL LocaList" className="h-10 w-auto object-contain" />
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

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Oswald', sans-serif" }}>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Name */}
            <div className="flex items-center justify-between text-sm min-h-[36px]">
              <Label className="text-muted-foreground">Name</Label>
              {editing === "name" ? (
                <div className="flex items-center gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-48" maxLength={100} autoFocus />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} disabled={saving}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button onClick={() => setEditing("name")} className="inline-flex items-center gap-1.5 font-medium hover:text-primary transition-colors">
                  {repProfile?.full_name ?? "—"}
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Email */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>

            {/* Rep Number */}
            <div className="flex items-center justify-between text-sm min-h-[36px]">
              <Label className="text-muted-foreground">Rep Number (8-digit ID)</Label>
              <span className="font-medium font-mono tracking-wide">{repProfile?.rep_number ?? "—"}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              {loadingSubscription ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant={subscription.subscribed ? "default" : "secondary"} className="capitalize">
                  {subscription.subscribed ? currentTierName : "No Plan"}
                </Badge>
              )}
            </div>
            {subscription.subscribed && subscription.subscriptionEnd && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Renews</span>
                <span className="font-medium">{new Date(subscription.subscriptionEnd).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant={isGhlMode ? "default" : "secondary"}>{isGhlMode ? "GHL Mode" : "CSV Mode"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Oswald', sans-serif" }}>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Manage your subscription, update payment method, or cancel anytime.</p>
            <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading || !subscription.subscribed} className="w-full min-h-[44px]">
              {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Open Billing Portal
            </Button>
            {!subscription.subscribed && (
              <p className="text-xs text-muted-foreground text-center">Subscribe to a plan to access the billing portal.</p>
            )}
            <Button variant="ghost" size="sm" onClick={() => refreshSubscription()} className="w-full text-xs text-muted-foreground">
              Refresh Subscription Status
            </Button>
          </CardContent>
        </Card>

        {!isGhlMode && (
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: "'Oswald', sans-serif" }}>Upgrade To EdgeDMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Unlock automatic CRM syncing, LC Calls, and more by upgrading to EdgeDMS.</p>
              <Button asChild className="w-full min-h-[44px]">
                <a href={UPGRADE_URL}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Upgrade To EdgeDMS
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <Button variant="ghost" onClick={signOut} className="w-full min-h-[44px] text-destructive hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
