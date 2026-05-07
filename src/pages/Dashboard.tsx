import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGhlSso } from "@/hooks/useGhlSso";
import { toast } from "@/hooks/use-toast";
import { LogOut, Menu, Settings, Loader2, BookOpen } from "lucide-react";
import localistLogo from "@/assets/Localist-Final-Logo.png";
import SearchTab from "@/components/dashboard/SearchTab";
import CsvUploadTab from "@/components/dashboard/CsvUploadTab";
import LocalistControlPanel from "@/components/dashboard/LocalistControlPanel";
import SyncProgressDialog, { SyncStep } from "@/components/dashboard/SyncProgressDialog";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import { TIERS, type TierKey } from "@/lib/stripe-tiers";

interface StatCard {
  label: string;
  value: string | number;
}

export default function Dashboard() {
  const { user, session, repProfile, signOut, isGhlMode, ghlLocationId, ghlRepNum, ssoPayload } = useAuth();
  // Only run internal SSO hook when NOT already in GHL mode via IframeApp bridge
  const { ssoReady, ssoError, isInIframe, retry } = useGhlSso();
  const [contactCount, setContactCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchesToday, setSearchesToday] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ghlRepId, setGhlRepId] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([]);
  const [syncSummary, setSyncSummary] = useState<{ total: number; searchable: number; needsGeocoding: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [crmTokenMissing, setCrmTokenMissing] = useState(false);
  const [installingGhl, setInstallingGhl] = useState(false);

  const handleInstallGhl = async () => {
    setInstallingGhl(true);
    try {
      const redirectUri = `${window.location.origin}/callback`;
      const { data, error } = await supabase.functions.invoke("localist-get-auth-url", {
        body: { redirect_uri: redirectUri },
      });
      if (error || !data?.url) throw new Error(error?.message || "Failed to get install URL");
      window.location.href = data.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start install";
      toast({ title: "Install error", description: msg, variant: "destructive" });
      setInstallingGhl(false);
    }
  };

  // SSO payload sync no longer needed — auth session handles everything

  const userId = user?.id ?? ghlLocationId ?? "unknown";
  const repName = repProfile?.full_name ?? user?.email ?? "Rep";

  const initialLoadDone = useRef(false);

  const fetchContactStats = async (background = false) => {
    if (!user) return;
    if (!background) setLoadingStats(true);
    try {
      if (isGhlMode) {
        // GHL mode: fetch stats via edge function (Bearer auth auto-included)
        const { data, error } = await supabase.functions.invoke("localist-sync-contacts", {
          body: { stats_only: true },
        });
        if (error) {
          // Detect missing CRM token (location not yet OAuth-installed)
          let detail = "";
          try {
            if ((error as any).context && typeof (error as any).context.json === "function") {
              const body = await (error as any).context.json();
              detail = body?.error ?? "";
            }
          } catch { /* ignore */ }
          if (/No CRM/i.test(detail) || /reconnect/i.test(detail)) {
            setCrmTokenMissing(true);
          }
        } else if (data) {
          setCrmTokenMissing(false);
          setContactCount(data.count ?? 0);
          setLastSync(data.last_sync ?? null);
          if (data.rep_id) setGhlRepId(data.rep_id);
        }
      } else {
        // Standalone mode: query Supabase directly (RLS filters by rep_id = auth.uid())
        const { count, data } = await supabase
          .from("localist_contacts")
          .select("updated_at", { count: "exact", head: false })
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
    if (!isGhlMode) return;
    setRefreshing(true);
    setSyncError(null);
    setSyncSummary(null);

    const initialSteps: SyncStep[] = [
      { id: "connect", label: "Connecting to GoHighLevel", status: "active" },
      { id: "fetch", label: "Fetching your contacts", status: "pending" },
      { id: "save", label: "Saving to your account", status: "pending" },
      { id: "geocode", label: "Geocoding addresses", status: "pending" },
      { id: "done", label: "Preparing search results", status: "pending" },
    ];
    setSyncSteps(initialSteps);
    setSyncDialogOpen(true);

    const updateStep = (id: string, updates: Partial<SyncStep>) => {
      setSyncSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    };

    try {
      // Step 1 → 2: connection established, now fetching
      await new Promise((r) => setTimeout(r, 600));
      updateStep("connect", { status: "done", detail: "Secure connection established" });
      updateStep("fetch", { status: "active", label: "Fetching your contacts from CRM..." });

const { data, error } = await supabase.functions.invoke("localist-sync-contacts", {
        body: {},
      });

      if (error) {
        let detail = error.message;
        try {
          if ((error as any).context && typeof (error as any).context.json === "function") {
            const body = await (error as any).context.json();
            detail = body?.error ?? detail;
          }
        } catch { /* fallback */ }
        throw new Error(detail);
      }

      const synced = data?.synced ?? 0;
      updateStep("fetch", { status: "done", detail: `${synced.toLocaleString()} contacts received` });

      // Step 3: saving
      updateStep("save", { status: "active" });
      await new Promise((r) => setTimeout(r, 400));
      updateStep("save", { status: "done", detail: "Contacts merged and updated" });

      // Step 4: Geocode contacts without coordinates
      updateStep("geocode", { status: "active", detail: "Finding coordinates for your contacts..." });

      let totalGeocoded = 0;
      let remaining = 1; // Start with 1 to enter loop
      let geocodeRounds = 0;
      const MAX_ROUNDS = 60; // Supports up to ~6,000 contacts per step

      while (remaining > 0 && geocodeRounds < MAX_ROUNDS) {
        const { data: geoData, error: geoErr } = await supabase.functions.invoke("localist-geocode-contacts", {
          body: { limit: 50 },
        });

        if (geoErr || !geoData) break;

        totalGeocoded += geoData.geocoded ?? 0;
        remaining = geoData.remaining ?? 0;
        geocodeRounds++;

        if (totalGeocoded > 0) {
          updateStep("geocode", {
            status: "active",
            detail: `${totalGeocoded.toLocaleString()} addresses geocoded${remaining > 0 ? `, ${remaining.toLocaleString()} remaining...` : ""}`,
          });
        }

        if (geoData.geocoded === 0) break; // No progress, stop
      }

      updateStep("geocode", {
        status: "done",
        detail: totalGeocoded > 0
          ? `${totalGeocoded.toLocaleString()} addresses geocoded`
          : "No new addresses to geocode",
      });

      // Step 4b: Backfill county for contacts that have coords but no county
      let countyBackfilled = 0;
      let countyRemaining = 1;
      let countyRounds = 0;

      while (countyRemaining > 0 && countyRounds < MAX_ROUNDS) {
        const { data: countyData, error: countyErr } = await supabase.functions.invoke("localist-geocode-contacts", {
          body: { backfill_county: true, limit: 50 },
        });

        if (countyErr || !countyData) break;

        countyBackfilled += countyData.geocoded ?? 0;
        countyRemaining = countyData.remaining ?? 0;
        countyRounds++;

        if (countyBackfilled > 0) {
          updateStep("geocode", {
            status: "active",
            detail: `Populating county data... ${countyBackfilled.toLocaleString()} updated${countyRemaining > 0 ? `, ${countyRemaining.toLocaleString()} remaining` : ""}`,
          });
        }

        if (countyData.geocoded === 0) break;
      }

      if (countyBackfilled > 0) {
        updateStep("geocode", {
          status: "done",
          detail: `${totalGeocoded.toLocaleString()} geocoded, ${countyBackfilled.toLocaleString()} counties populated`,
        });
      }

      // Step 4c: Push county data to EdgeDMS/GHL
      let countyPushed = 0;
      let pushRemaining = 1;
      let pushRounds = 0;

      while (pushRemaining > 0 && pushRounds < MAX_ROUNDS) {
        const { data: pushData, error: pushErr } = await supabase.functions.invoke("localist-push-counties", {
          body: { limit: 100 },
        });

        if (pushErr || !pushData) {
          // Try to extract a meaningful error message
          let pushMsg = "County sync failed";
          try {
            if (pushErr && typeof pushErr === "object" && "context" in pushErr) {
              const ctx = (pushErr as any).context;
              if (ctx && typeof ctx.json === "function") {
                const body = await ctx.json();
                pushMsg = body?.error ?? pushMsg;
              }
            } else if (pushErr instanceof Error) {
              pushMsg = pushErr.message;
            }
          } catch { /* fallback */ }
          console.error("[push-counties] error:", pushMsg);
          updateStep("geocode", { status: "error", detail: pushMsg });
          break;
        }

        countyPushed += pushData.pushed ?? 0;
        pushRemaining = pushData.remaining ?? 0;
        pushRounds++;

        if (countyPushed > 0) {
          updateStep("geocode", {
            status: "active",
            detail: `Syncing county data to EdgeDMS... ${countyPushed.toLocaleString()} pushed${pushRemaining > 0 ? `, ${pushRemaining.toLocaleString()} remaining` : ""}`,
          });
        }

        if (pushData.pushed === 0 && pushRemaining <= 5) break;
      }

      if (countyPushed > 0) {
        updateStep("geocode", {
          status: "done",
          detail: `${totalGeocoded.toLocaleString()} geocoded, ${countyBackfilled.toLocaleString()} counties populated, ${countyPushed.toLocaleString()} synced to EdgeDMS`,
        });
      }

      // Step 5: get final stats
      updateStep("done", { status: "active" });

      const { data: statsData } = await supabase.functions.invoke("localist-sync-contacts", {
        body: { stats_only: true },
      });
      const totalCount = statsData?.count ?? synced;

      // Count contacts with coordinates
      let searchable = 0;
      if (isGhlMode) {
        const { data: finalStats } = await supabase.functions.invoke("localist-sync-contacts", {
          body: { stats_only: true },
        });
        searchable = finalStats?.searchable ?? 0;
      } else if (user) {
        const { count } = await supabase
          .from("localist_contacts")
          .select("id", { count: "exact", head: true })
          .not("latitude", "is", null);
        searchable = count ?? 0;
      }

      updateStep("done", { status: "done", detail: `${searchable.toLocaleString()} contacts ready for nearby search` });

      setSyncSummary({
        total: totalCount,
        searchable,
        needsGeocoding: totalCount - searchable,
      });

      await fetchContactStats();
    } catch (err: unknown) {
      let msg = "Sync failed";
      if (err && typeof err === "object" && "context" in err) {
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

      // Mark current active step as error
      setSyncSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error", detail: msg } : s))
      );
      setSyncError(msg);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Account Merge Handshake (server-side) ──
  // If both location_id and rep_num are present, call edge function to claim orphaned contacts
  useEffect(() => {
    if (!ghlLocationId || !ghlRepNum) return;
    const mergeKey = `merge_done_${ghlLocationId}_${ghlRepNum}`;
    if (localStorage.getItem(mergeKey)) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("localist-merge-contacts", {
          body: { rep_number: ghlRepNum.trim() },
        });

        if (!error && data?.merged > 0) {
          toast({ title: "Contacts linked!", description: `${data.merged} existing contacts were connected to your CRM.` });
        }
        localStorage.setItem(mergeKey, Date.now().toString());
      } catch {
        // Merge failed silently – not critical
      }
    })();
  }, [ghlLocationId, ghlRepNum]);

  useEffect(() => {
    fetchContactStats();
    const stored = localStorage.getItem(`localist_searches_${userId}`);
    if (stored) {
      try { setRecentSearches(JSON.parse(stored)); } catch { /* ignore */ }
    }
    // Auto-sync removed — reps should manually sync via the Refresh button
    // to avoid "Too Many Requests" errors from rapid API calls on load.
  }, [userId, isGhlMode]);

  // ── Realtime subscription for webhook-driven contact updates (debounced) ──
  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel("contact-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "localist_contacts",
          filter: `rep_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[Dashboard] Realtime contact event:", payload.eventType);
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => fetchContactStats(true), 5000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Auto-trigger pending checkout from pricing page ──
  useEffect(() => {
    const pendingTier = localStorage.getItem("pending_checkout_tier") as TierKey | null;
    if (!pendingTier || !session?.access_token || !TIERS[pendingTier]) return;
    localStorage.removeItem("pending_checkout_tier");

    (async () => {
      try {
        const priceId = TIERS[pendingTier].price_id;
        const { data, error } = await supabase.functions.invoke("localist-create-checkout", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { priceId },
        });
        if (error) throw error;
        if (data?.url) window.open(data.url, "_blank");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Checkout failed";
        toast({ title: "Checkout error", description: msg, variant: "destructive" });
      }
    })();
  }, [session?.access_token]);

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
            <img src={localistLogo} alt="AKL LocaList" className="h-10 w-auto object-contain" />
          </Link>

          {!isGhlMode && (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/guide">
                  <Button variant="ghost" size="sm">
                    <BookOpen className="h-4 w-4 mr-1" />
                    User Guide
                  </Button>
                </Link>
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
                      <Link to="/guide" className="w-full">
                        <SheetClose asChild>
                          <Button variant="ghost" className="w-full justify-start">
                            <BookOpen className="h-4 w-4 mr-2" />
                            User Guide
                          </Button>
                        </SheetClose>
                      </Link>
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
            crmTokenMissing={crmTokenMissing}
            onInstallGhl={handleInstallGhl}
            installingGhl={installingGhl}
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
                    ghlRepId={ghlRepId}
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
              crmTokenMissing={crmTokenMissing}
              onInstallGhl={handleInstallGhl}
              installingGhl={installingGhl}
            />
          </div>
        </div>
      </main>
      <Footer />

      <SyncProgressDialog
        open={syncDialogOpen}
        onClose={() => {
          setSyncDialogOpen(false);
          setSyncSummary(null);
          setSyncError(null);
        }}
        steps={syncSteps}
        summary={syncSummary}
        error={syncError}
      />
    </div>
  );
}
