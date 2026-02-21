import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Phone, MessageSquare, Map, ExternalLink, ChevronUp, ChevronDown, Filter, Trash2, Send, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneDisplay, formatCurrency } from "@/lib/contacts";
import type { NearbyContact } from "@/lib/contacts";
import ContactDetailModal from "./ContactDetailModal";
import GroupSmsModal from "./GroupSmsModal";
import stopBotImg from "@/assets/stopbot.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";
const RADIUS_OPTIONS = [10, 25, 50] as const;

interface SearchTabProps {
  repName: string;
  recentSearches: string[];
  onSearch: (address: string) => void;
  contactCount: number;
  isGhlMode: boolean;
  ghlRepId?: string | null;
}

type SortKey = "distance_miles" | "lifetime_value" | "last_order_date" | "last_service_date" | "order_count";

export default function SearchTab({ repName, recentSearches, onSearch, contactCount, isGhlMode, ghlRepId }: SearchTabProps) {
  const { user, ssoPayload } = useAuth();
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState<10 | 25 | 50>(25);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NearbyContact[]>([]);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("distance_miles");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedContact, setSelectedContact] = useState<NearbyContact | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [contactToDelete, setContactToDelete] = useState<NearbyContact | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Group SMS state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupSmsOpen, setGroupSmsOpen] = useState(false);

  const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
    if (!MAPBOX_TOKEN) {
      console.error("[SearchTab] MAPBOX_TOKEN is empty/missing");
      toast({ title: "Mapbox token missing", variant: "destructive" });
      return null;
    }
    const encoded = encodeURIComponent(addr);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
    console.log("[SearchTab] Geocoding URL:", url.replace(MAPBOX_TOKEN, "***"));
    try {
      const res = await fetch(url);
      console.log("[SearchTab] Mapbox response status:", res.status);
      const data = await res.json();
      console.log("[SearchTab] Mapbox features count:", data?.features?.length ?? 0);
      const [lng, lat] = data?.features?.[0]?.center ?? [];
      if (!lat || !lng) {
        console.warn("[SearchTab] No coordinates found in Mapbox response");
        return null;
      }
      console.log("[SearchTab] Geocoded to:", { lat, lng });
      return { lat, lng };
    } catch (err) {
      console.error("[SearchTab] Geocoding fetch error:", err);
      return null;
    }
  };

  const COORD_REGEX = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;

  const parseCoords = (input: string): { lat: number; lng: number } | null => {
    const match = input.trim().match(COORD_REGEX);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    return null;
  };

  const effectiveRepId = user?.id ?? ghlRepId ?? null;

  const runRadiusQuery = useCallback(async (center: { lat: number; lng: number }, label: string) => {
    if (!effectiveRepId) return;
    if (contactCount === 0) {
      toast({ title: "No contacts loaded yet — let's fix that.", description: "Upload a CSV in the Contacts tab first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(false);
    setSelectedIds(new Set());
    try {
      setSearchCenter(center);
      onSearch(label);

      if (isGhlMode && ssoPayload) {
        // GHL mode: use edge function
        const { data: fnData, error: fnError } = await supabase.functions.invoke("nearby-search", {
          body: {
            sso_payload: ssoPayload,
            center_lat: center.lat,
            center_lng: center.lng,
            radius_miles: radius,
          },
        });
        if (fnError) throw fnError;
        setResults((fnData?.contacts as NearbyContact[]) ?? []);
      } else {
        // Standalone mode: direct RPC call
        const { data, error } = await supabase.rpc("nearby_contacts", {
          rep: effectiveRepId,
          center_lat: center.lat,
          center_lng: center.lng,
          radius_miles: radius,
        });
        if (error) throw error;
        setResults((data as NearbyContact[]) ?? []);
      }

      setSearched(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed.";
      toast({ title: "Search error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [effectiveRepId, contactCount, radius, onSearch, isGhlMode, ssoPayload]);

  // GHL mode: server-side geocoding + search in one call
  const runServerSearch = useCallback(async (addr: string) => {
    if (!effectiveRepId || !ssoPayload) return;
    if (contactCount === 0) {
      toast({ title: "No contacts loaded yet — let's fix that.", description: "Upload a CSV in the Contacts tab first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(false);
    setSelectedIds(new Set());
    try {
      onSearch(addr);
      const { data: fnData, error: fnError } = await supabase.functions.invoke("nearby-search", {
        body: {
          sso_payload: ssoPayload,
          address: addr,
          radius_miles: radius,
        },
      });
      if (fnError) throw fnError;
      if (fnData?.error === "address_not_found") {
        toast({ title: "Could not find that exact address.", description: "Try adding the city or ZIP code.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (fnData?.error) throw new Error(fnData.error);
      setResults((fnData?.contacts as NearbyContact[]) ?? []);
      setSearched(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed.";
      toast({ title: "Search error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [effectiveRepId, ssoPayload, contactCount, radius, onSearch]);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not supported on this device", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setAddress("Current Location");
        runRadiusQuery({ lat: latitude, lng: longitude }, "Current Location");
      },
      () => {
        toast({ title: "Could not get location", description: "Check your browser permissions.", variant: "destructive" });
      }
    );
  };

  const handleSearch = useCallback(async () => {
    if (!address.trim() && !searchCenter) {
      toast({ title: "Enter an address first", variant: "destructive" });
      return;
    }
    if (!effectiveRepId) return;

    // 1. If searchCenter already set (e.g. from GPS), use it directly
    if (searchCenter) {
      await runRadiusQuery(searchCenter, address.trim() || "Current Location");
      return;
    }

    // 2. Strict coordinate regex bypass
    const parsed = parseCoords(address.trim());
    if (parsed) {
      await runRadiusQuery(parsed, address.trim());
      return;
    }

    // 3. GHL mode: geocode server-side (client Mapbox token may not be available)
    if (isGhlMode && ssoPayload) {
      await runServerSearch(address.trim());
      return;
    }

    // 4. Standalone: Mapbox fuzzy geocoding client-side
    setLoading(true);
    setSearched(false);
    setSelectedIds(new Set());
    try {
      const center = await geocodeAddress(address.trim());
      if (!center) {
        toast({ title: "Could not find that exact address.", description: "Try adding the city or ZIP code.", variant: "destructive" });
        setLoading(false);
        return;
      }
      await runRadiusQuery(center, address.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed.";
      toast({ title: "Search error", description: message, variant: "destructive" });
      setLoading(false);
    }
  }, [address, searchCenter, effectiveRepId, runRadiusQuery, isGhlMode, ssoPayload, runServerSearch]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete || !effectiveRepId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("localist_contacts")
        .delete()
        .eq("rep_id", effectiveRepId)
        .eq("id", contactToDelete.id);
      if (error) throw error;
      setResults((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      toast({ title: `${contactToDelete.first_name} ${contactToDelete.last_name} deleted.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setContactToDelete(null);
    }
  };

  const filtered = results
    .filter((c) => {
      const q = filter.toLowerCase();
      return !q || `${c.first_name} ${c.last_name} ${c.city}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let av: number;
      let bv: number;
      if (sortKey === "lifetime_value") {
        av = a.lifetime_value ?? 0;
        bv = b.lifetime_value ?? 0;
      } else if (sortKey === "order_count") {
        av = a.order_count ?? 0;
        bv = b.order_count ?? 0;
      } else if (sortKey === "last_order_date") {
        av = a.last_order_date ? new Date(a.last_order_date).getTime() : 0;
        bv = b.last_order_date ? new Date(b.last_order_date).getTime() : 0;
      } else if (sortKey === "last_service_date") {
        av = a.last_service_date ? new Date(a.last_service_date).getTime() : 0;
        bv = b.last_service_date ? new Date(b.last_service_date).getTime() : 0;
      } else {
        av = a.distance_miles;
        bv = b.distance_miles;
      }
      return sortAsc ? av - bv : bv - av;
    });

  // Selection helpers
  const filteredIds = filtered.map((c) => c.id as string).filter(Boolean);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...filteredIds]));
    }
  };

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedContacts = filtered.filter((c) => c.id && selectedIds.has(c.id as string));

  return (
    <div className="space-y-4">
      {/* Address input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={address}
            onChange={(e) => { setAddress(e.target.value); setSearchCenter(null); }}
            placeholder="Address, city, or ZIP code..."
            style={{ fontSize: "16px" }}
            className="pr-10"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleGPS}
          title="Use my location"
          className="min-h-[44px] min-w-[44px] shrink-0"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recentSearches.slice(0, 5).map((s) => (
            <button
              key={s}
              onClick={() => { setAddress(s); setSearchCenter(null); }}
              className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Radius selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">Radius:</span>
        <div className="flex rounded-lg border overflow-hidden">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                radius === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted text-foreground"
              }`}
            >
              {r} mi
            </button>
          ))}
        </div>
      </div>

      {/* Search button */}
      <Button
        onClick={handleSearch}
        disabled={loading}
        className="w-full min-h-[48px] text-base font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finding your nearest customers...
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-4 w-4" />
            Find Nearby Contacts
          </>
        )}
      </Button>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {results.length === 0
                ? "No contacts found in that area — try a wider radius."
                : `${results.length} contact${results.length !== 1 ? "s" : ""} within ${radius} miles`}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Group SMS button — GHL mode only, shown when contacts are selected */}
              {isGhlMode && selectedContacts.length > 0 && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  onClick={() => setGroupSmsOpen(true)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Group Text ({selectedContacts.length})
                </Button>
              )}
              {results.length > 0 && (
                <>
                  <Select
                    value={`${sortKey}_${sortAsc ? "asc" : "desc"}`}
                    onValueChange={(val) => {
                      const parts = val.split("_");
                      const dir = parts.pop() as "asc" | "desc";
                      const key = parts.join("_") as SortKey;
                      setSortKey(key);
                      setSortAsc(dir === "asc");
                    }}
                  >
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance_miles_asc">Distance ↑</SelectItem>
                      <SelectItem value="distance_miles_desc">Distance ↓</SelectItem>
                      <SelectItem value="lifetime_value_desc">Lifetime $ ↓</SelectItem>
                      <SelectItem value="lifetime_value_asc">Lifetime $ ↑</SelectItem>
                      <SelectItem value="order_count_desc">Orders ↓</SelectItem>
                      <SelectItem value="order_count_asc">Orders ↑</SelectItem>
                      <SelectItem value="last_service_date_desc">Last Service ↓</SelectItem>
                      <SelectItem value="last_service_date_asc">Last Service ↑</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter by name..."
                      className="pl-8 h-8 text-sm w-40"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              {/* Table header */}
              <div className={`hidden sm:grid gap-2 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide items-center ${isGhlMode ? "grid-cols-[24px_1fr_80px_80px_80px_85px_160px]" : "grid-cols-[1fr_80px_80px_80px_85px_160px]"}`}>
                {isGhlMode && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="border-muted-foreground"
                    aria-label="Select all"
                    data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                  />
                )}
                <span>Name / City</span>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("distance_miles")}>
                  Dist
                  {sortKey === "distance_miles" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("lifetime_value")}>
                  LTV $
                  {sortKey === "lifetime_value" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("last_order_date")}>
                  Last Ord
                  {sortKey === "last_order_date" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("last_service_date")}>
                  Last Svc
                  {sortKey === "last_service_date" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
                <span>Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {filtered.map((contact) => {
                  const cid = contact.id as string;
                  const isChecked = isGhlMode && selectedIds.has(cid);
                  return (
                    <div
                      key={contact.id}
                      className={`grid gap-2 px-4 py-3 hover:bg-muted/30 transition-colors items-center ${isGhlMode ? "sm:grid-cols-[24px_1fr_80px_80px_80px_85px_160px]" : "sm:grid-cols-[1fr_80px_80px_80px_85px_160px]"} ${isChecked ? "bg-primary/5" : ""}`}
                    >
                      {/* Checkbox (GHL only) */}
                      {isGhlMode && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleContact(cid)}
                            aria-label={`Select ${contact.first_name}`}
                          />
                        </div>
                      )}

                      {/* Name + city — click to open modal */}
                      <div
                        className="min-w-0 cursor-pointer"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <p className="font-medium text-sm truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{contact.city}, {contact.state}</p>
                      </div>

                      {/* Distance */}
                      <div className="hidden sm:block">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {contact.distance_miles.toFixed(1)} mi
                        </Badge>
                      </div>

                      {/* Lifetime value */}
                      <div className="hidden sm:block text-sm">{formatCurrency(contact.lifetime_value)}</div>

                      {/* Last order */}
                      <div className="hidden sm:block text-xs text-muted-foreground">
                        {contact.last_order_date ? new Date(contact.last_order_date).toLocaleDateString() : "—"}
                      </div>

                      {/* Last service */}
                      <div className="hidden sm:block text-xs text-muted-foreground">
                        {contact.last_service_date ? new Date(contact.last_service_date).toLocaleDateString() : "—"}
                      </div>

                      {/* Mobile distance badge */}
                      <div className="sm:hidden">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {contact.distance_miles.toFixed(1)} mi
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${contact.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={`sms:${contact.phone}?body=Hi ${encodeURIComponent(contact.first_name)}, this is ${encodeURIComponent(repName)} from Cutco — I'm in your area and wanted to reach out!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          title="SMS"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          title="Directions"
                        >
                          <Map className="h-4 w-4" />
                        </a>
                        {isGhlMode && (
                          <div
                            className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                            title="View in GHL"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        )}
                        <button
                          className="flex items-center justify-center h-9 w-9 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                          title="Delete contact"
                          onClick={() => setContactToDelete(contact)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delete individual contact confirmation */}
          <AlertDialog open={!!contactToDelete} onOpenChange={(open) => { if (!open) setContactToDelete(null); }}>
            <AlertDialogContent className="max-w-sm text-center">
              <AlertDialogHeader>
                <div className="flex justify-center mb-2">
                  <img src={stopBotImg} alt="Stop" className="w-36 h-36 object-contain" />
                </div>
                <AlertDialogTitle className="text-2xl font-black tracking-wide text-destructive" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  STOP!
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-foreground">
                  Are you sure you want to delete <strong>{contactToDelete?.first_name} {contactToDelete?.last_name}</strong>? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-center gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteContact}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Contact detail modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          repName={repName}
          isGhlMode={isGhlMode}
          onClose={() => setSelectedContact(null)}
        />
      )}

      {/* Group SMS modal */}
      {isGhlMode && (
        <GroupSmsModal
          open={groupSmsOpen}
          onClose={() => setGroupSmsOpen(false)}
          contacts={selectedContacts}
          repName={repName}
        />
      )}
    </div>
  );
}
