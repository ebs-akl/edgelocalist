import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGhlSso } from "@/hooks/useGhlSso";
import { toast } from "@/hooks/use-toast";
import { LogOut, Menu, Settings, Loader2 } from "lucide-react";
import localistLogo from "@/assets/Localist_Logo-2.png";
import SearchTab from "@/components/dashboard/SearchTab";
import CsvUploadTab from "@/components/dashboard/CsvUploadTab";
import LocalistControlPanel from "@/components/dashboard/LocalistControlPanel";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";

interface StatCard {
  label: string;
  value: string | number;
}

export default function Dashboard() {
  const { user, repProfile, signOut, isGhlMode, ghlLocationId, ghlRepNum, ssoPayload, setSsoPayload } = useAuth();
  // Only run internal SSO hook when NOT already in GHL mode via IframeApp bridge
  const { ssoPayload: hookPayload, ssoReady, ssoError, isInIframe, retry } = useGhlSso();
  const [contactCount, setContactCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchesToday, setSearchesToday] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Store SSO payload from hook into context only when NOT already set by IframeApp bridge
  useEffect(() => {
    if (hookPayload && !ssoPayload) {
      setSsoPayload(hookPayload);
    }
  }, [hookPayload, ssoPayload, setSsoPayload]);

  const userId = user?.id ?? ghlLocationId ?? "unknown";
  const repName = repProfile?.full_name ?? user?.email ?? "Rep";

  const fetchContactStats = async () => {
    if (!user && !ghlLocationId) return;
    setLoadingStats(true);
    try {
      if (isGhlMode && ghlLocationId) {
        // GHL mode: fetch stats via edge function proxy with SSO payload
        if (!ssoPayload) {
          // Can't call without SSO payload — skip silently
          setLoadingStats(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke("ghl-sync-contacts", {
          body: { stats_only: true, sso_payload: ssoPayload },
        });
        if (!error && data) {
          setContactCount(data.count ?? 0);
          setLastSync(data.last_sync ?? null);
        }
      } else if (user) {
        // Standalone mode: query Supabase directly
        const { count, data } = await supabase
          .from("localist_contacts")
          .select("updated_at", { count: "exact", head: false })
          .eq("rep_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        setContactCount(count ?? 0);
        if (data && data.length > 0) {
          setLastSync(data[0].updated_at);
        }
      }
    } catch (err) {
      console.error("Failed to load contact stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGhlSync = async () => {
    if (!ghlLocationId || !ssoPayload) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-sync-contacts", {
        body: { sso_payload: ssoPayload },
      });
      if (error) {
        // Try to extract JSON error body from the response
        let detail = error.message;
        try {
          if ((error as any).context && typeof (error as any).context.json === "function") {
            const body = await (error as any).context.json();
            detail = body?.error ?? detail;
          }
        } catch { /* fallback */ }
        throw new Error(detail);
      }
      toast({ title: "GHL sync complete", description: `${data?.synced ?? 0} contacts synced.` });
      await fetchContactStats();
    } catch (err: unknown) {
      let msg = "Sync failed";
      if (err && typeof err === "object" && "context" in err) {
        // supabase.functions.invoke wraps non-2xx in FunctionsHttpError with context
        try {
          const ctx = (err as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            msg = body?.error ?? msg;
          }
        } catch { /* fallback */ }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      console.error("GHL sync error detail:", msg);
      toast({ title: "GHL sync failed", description: msg, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  // ── Account Merge Handshake (server-side) ──
  // If both location_id and rep_num are present, call edge function to claim orphaned contacts
  useEffect(() => {
    if (!ghlLocationId || !ghlRepNum || !ssoPayload) return;
    const mergeKey = `merge_done_${ghlLocationId}_${ghlRepNum}`;
    if (localStorage.getItem(mergeKey)) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ghl-merge-contacts", {
          body: { sso_payload: ssoPayload, rep_number: ghlRepNum.trim() },
        });

        if (!error && data?.merged > 0) {
          toast({ title: "Contacts linked!", description: `${data.merged} existing contacts were connected to your CRM.` });
        }
        localStorage.setItem(mergeKey, Date.now().toString());
      } catch {
        // Merge failed silently – not critical
      }
    })();
  }, [ghlLocationId, ghlRepNum, ssoPayload]);

  useEffect(() => {
    fetchContactStats();
    const stored = localStorage.getItem(`localist_searches_${userId}`);
    if (stored) {
      try { setRecentSearches(JSON.parse(stored)); } catch { /* ignore */ }
    }
    // Auto-sync GHL on load if connected and payload ready
    if (isGhlMode && ghlLocationId && ssoPayload) {
      const lastSyncKey = `ghl_last_sync_${ghlLocationId}`;
      const lastSyncTime = localStorage.getItem(lastSyncKey);
      const hoursSince = lastSyncTime
        ? (Date.now() - parseInt(lastSyncTime)) / 3600000
        : Infinity;
      if (hoursSince > 24) {
        handleGhlSync().then(() => {
          localStorage.setItem(lastSyncKey, Date.now().toString());
        });
      }
    }
  }, [userId, isGhlMode, ssoPayload]);

  const handleSearch = (address: string) => {
    setSearchesToday((n) => n + 1);
    setRecentSearches((prev) => {
      const next = [address, ...prev.filter((s) => s !== address)].slice(0, 10);
      localStorage.setItem(`localist_searches_${userId}`, JSON.stringify(next));
      return next;
    });
  };

  const statCards: StatCard[] = [
    { label: "CONTACTS LOADED", value: loadingStats ? "—" : contactCount.toLocaleString() },
    { label: "LAST SYNCED", value: lastSync ? new Date(lastSync).toLocaleDateString() : "Never" },
    { label: "SEARCHES TODAY", value: searchesToday },
    { label: "MODE", value: isGhlMode ? "GHL Mode" : "CSV Mode" },
  ];

  // SSO handshake gate — skip if already in GHL mode via IframeApp bridge
  if (isInIframe && !ghlLocationId && !ssoReady) {
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

  if (isInIframe && !ghlLocationId && ssoError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <p className="text-sm font-semibold text-destructive">Connection Failed</p>
            <p className="text-sm text-muted-foreground">{ssoError}</p>
          </div>
          <Button onClick={retry} className="min-h-[44px]">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center">
            <img src={localistLogo} alt="EdgeLocalist" className="h-10 w-auto object-contain" />
          </Link>

          {!isGhlMode && (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/settings">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </div>

              {/* Mobile nav */}
              <div className="sm:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <div className="flex flex-col gap-4 mt-8">
                      <Link to="/settings" className="w-full">
                        <SheetClose asChild>
                          <Button variant="ghost" className="w-full justify-start">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                        </SheetClose>
                      </Link>
                      <SheetClose asChild>
                        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 pt-24 space-y-6">
        {/* Stats row */}
        <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-3 sm:p-4">
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </span>
                <div
                  className="text-base sm:text-xl font-bold mt-1"
                  style={{ fontFamily: "'Oswald', sans-serif" }}
                >
                  {loadingStats && card.label === "CONTACTS LOADED" ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    card.value
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Control panel on mobile */}
        <div className="block lg:hidden">
          <LocalistControlPanel
            contactCount={contactCount}
            lastSync={lastSync}
            isGhlMode={isGhlMode}
            ghlLocationId={ghlLocationId}
            subscriptionTier={repProfile?.subscription_tier ?? null}
            onRefresh={isGhlMode ? handleGhlSync : undefined}
            refreshing={refreshing}
          />
        </div>

        {/* Main content + sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Tabs defaultValue="search" className="space-y-4 min-w-0">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="search" className="text-xs sm:text-sm">
                🔍 Search
              </TabsTrigger>
              {!isGhlMode && (
                <TabsTrigger value="contacts" className="text-xs sm:text-sm">
                  📋 Contacts
                </TabsTrigger>
              )}
              {!isGhlMode && (
                <TabsTrigger value="settings-tab" className="text-xs sm:text-sm">
                  ⚙️ Settings
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="search">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <SearchTab
                    repName={repName}
                    recentSearches={recentSearches}
                    onSearch={handleSearch}
                    contactCount={contactCount}
                    isGhlMode={isGhlMode}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {!isGhlMode && (
              <TabsContent value="contacts">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <CsvUploadTab
                      onUploaded={fetchContactStats}
                      contactCount={contactCount}
                      lastSync={lastSync}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {!isGhlMode && (
              <TabsContent value="settings-tab">
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <h3 className="font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                      Quick Settings
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your account, subscription, and preferences.
                    </p>
                    <Link to="/settings">
                      <Button className="w-full min-h-[44px]">
                        Open Full Settings
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>

          {/* Control panel sidebar (desktop) */}
          <div className="hidden lg:block">
            <LocalistControlPanel
              contactCount={contactCount}
              lastSync={lastSync}
              isGhlMode={isGhlMode}
              ghlLocationId={ghlLocationId}
              subscriptionTier={repProfile?.subscription_tier ?? null}
              onRefresh={isGhlMode ? handleGhlSync : undefined}
              refreshing={refreshing}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
