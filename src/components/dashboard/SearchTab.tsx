import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Phone, MessageSquare, Map, ExternalLink, ChevronUp, ChevronDown, Filter, Trash2, Send, ArrowUpDown, Tag, List, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneDisplay, formatCurrency, toTitleCase } from "@/lib/contacts";
import type { NearbyContact, MapMarker } from "@/lib/contacts";
import ContactDetailModal from "./ContactDetailModal";
import GroupSmsModal from "./GroupSmsModal";
import TagContactsModal from "./TagContactsModal";
import ContactMapView from "./ContactMapView";
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

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
const PAGE_SIZE = 50;

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
  const { user, ghlLocationId, repProfile } = useAuth();
  const fallbackLocationId = typeof window !== "undefined" ? sessionStorage.getItem("ghl_location_id") : null;
  const effectiveGhlLocationId = ghlLocationId ?? repProfile?.ghl_location_id ?? fallbackLocationId;
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState<5 | 10 | 25 | 50>(25);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupSmsOpen, setGroupSmsOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [categoryFilters, setCategoryFilters] = useState<Set<"RLT" | "BIZ" | "REG">>(new Set());
  const watchIdRef = useRef<number | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);

  // Store the last search params for re-fetching on page change
  const lastSearchRef = useRef<{ center: { lat: number; lng: number }; label: string; address?: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const toggleCategory = (cat: "RLT" | "BIZ" | "REG") => {
    setCategoryFilters(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
    setSelectedIds(new Set());
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

  const runRadiusQuery = useCallback(async (center: { lat: number; lng: number }, label: string, pageNum: number = 1) => {
    if (!effectiveRepId) return;
    if (contactCount === 0) {
      toast({ title: "No contacts loaded yet — let's fix that.", description: "Upload a CSV in the Contacts tab first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    if (pageNum === 1) {
      setSearched(false);
      setSelectedIds(new Set());
      setCategoryFilters(new Set());
    }
    try {
      setSearchCenter(center);
      if (pageNum === 1) onSearch(label);
      lastSearchRef.current = { center, label };

      if (isGhlMode) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("localist-nearby-search", {
          body: {
            center_lat: center.lat,
            center_lng: center.lng,
            radius_miles: radius,
            page: pageNum,
            limit: PAGE_SIZE,
          },
        });
        if (fnError) throw fnError;
        setResults((fnData?.paginatedContacts as NearbyContact[]) ?? []);
        setTotalCount(fnData?.totalCount ?? 0);
        setMapMarkers((fnData?.mapMarkers as MapMarker[]) ?? []);
      } else {
        // Standalone mode: call both RPCs in parallel
        const [pageResult, markersResult] = await Promise.all([
          supabase.rpc("nearby_contacts_page_auth" as any, {
            rep: effectiveRepId,
            center_lat: center.lat,
            center_lng: center.lng,
            radius_miles: radius,
            p_limit: PAGE_SIZE,
            p_offset: (pageNum - 1) * PAGE_SIZE,
          }),
          supabase.rpc("nearby_map_markers_auth" as any, {
            rep: effectiveRepId,
            center_lat: center.lat,
            center_lng: center.lng,
            radius_miles: radius,
          }),
        ]);
        if (pageResult.error) throw pageResult.error;
        const contacts = (pageResult.data as any[]) ?? [];
        setResults(contacts as NearbyContact[]);
        setTotalCount(contacts.length > 0 ? Number(contacts[0].total_count) : 0);
        setMapMarkers((markersResult.data as MapMarker[]) ?? []);
      }

      setPage(pageNum);
      setSearched(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed.";
      toast({ title: "Search error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [effectiveRepId, contactCount, radius, onSearch, isGhlMode]);

  const runServerSearch = useCallback(async (addr: string, pageNum: number = 1) => {
    if (!effectiveRepId) return;
    if (contactCount === 0) {
      toast({ title: "No contacts loaded yet — let's fix that.", description: "Upload a CSV in the Contacts tab first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    if (pageNum === 1) {
      setSearched(false);
      setSelectedIds(new Set());
    }
    try {
      if (pageNum === 1) onSearch(addr);
      const { data: fnData, error: fnError } = await supabase.functions.invoke("localist-nearby-search", {
        body: {
          address: addr,
          radius_miles: radius,
          page: pageNum,
          limit: PAGE_SIZE,
        },
      });
      if (fnError) throw fnError;
      if (fnData?.error === "address_not_found") {
        toast({ title: "Could not find that exact address.", description: "Try adding the city or ZIP code.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (fnData?.error) throw new Error(fnData.error);
      if (typeof fnData?.center_lat === "number" && typeof fnData?.center_lng === "number") {
        setSearchCenter({ lat: fnData.center_lat, lng: fnData.center_lng });
        lastSearchRef.current = { center: { lat: fnData.center_lat, lng: fnData.center_lng }, label: addr, address: addr };
      }
      setResults((fnData?.paginatedContacts as NearbyContact[]) ?? []);
      setTotalCount(fnData?.totalCount ?? 0);
      setMapMarkers((fnData?.mapMarkers as MapMarker[]) ?? []);
      setPage(pageNum);
      setSearched(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed.";
      toast({ title: "Search error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [effectiveRepId, contactCount, radius, onSearch]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || !lastSearchRef.current) return;
    const { center, label, address: lastAddr } = lastSearchRef.current as any;
    if (lastAddr && !center) {
      runServerSearch(lastAddr, newPage);
    } else {
      runRadiusQuery(center, label, newPage);
    }
  }, [totalPages, page, runRadiusQuery, runServerSearch]);

  const fallbackToApproximateLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (!res.ok) throw new Error("IP lookup failed");

      const geo = await res.json();
      const lat = Number(geo?.latitude);
      const lng = Number(geo?.longitude);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const city = typeof geo?.city === "string" && geo.city.trim() ? geo.city.trim() : "your area";
        setAddress(`Near ${city} (approx.)`);
        toast({
          title: "Using approximate location",
          description: `GPS is unavailable here, so we used city-level accuracy near ${city}.`,
        });
        runRadiusQuery({ lat, lng }, `Near ${city}`);
        return true;
      }

      throw new Error("No coordinates returned");
    } catch {
      toast({
        title: "Could not determine location",
        description: "Type an address or ZIP code instead.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleGPS = async () => {
    if (isGhlMode) {
      setLocating(true);
      await fallbackToApproximateLocation();
      setLocating(false);
      return;
    }

    if (!navigator.geolocation) {
      toast({ title: "GPS not supported on this device", variant: "destructive" });
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLocating(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        setLocating(false);
        setAddress("Current Location");
        runRadiusQuery({ lat: latitude, lng: longitude }, "Current Location");
      },
      async (err) => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }

        setLocating(false);

        const detail =
          err.code === 1
            ? "Location permission denied. Please allow location access in your browser settings."
            : err.code === 2
              ? "Location unavailable. Try again."
              : "Location request timed out.";

        toast({ title: "Could not get location", description: detail, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const handleSearch = useCallback(async () => {
    if (!address.trim() && !searchCenter) {
      toast({ title: "Enter an address first", variant: "destructive" });
      return;
    }
    if (!effectiveRepId) return;

    if (searchCenter) {
      await runRadiusQuery(searchCenter, address.trim() || "Current Location");
      return;
    }

    const parsed = parseCoords(address.trim());
    if (parsed) {
      await runRadiusQuery(parsed, address.trim());
      return;
    }

    await runServerSearch(address.trim());
  }, [address, searchCenter, effectiveRepId, runRadiusQuery, runServerSearch]);

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
      setTotalCount((prev) => Math.max(0, prev - 1));
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
    .filter((c) => {
      if (categoryFilters.size === 0) return true;
      const isRlt = c.rlt?.toUpperCase() === "Y";
      const isBiz = c.biz?.toUpperCase() === "Y";
      const isReg = !isRlt && !isBiz;
      return (categoryFilters.has("RLT") && isRlt) ||
             (categoryFilters.has("BIZ") && isBiz) ||
             (categoryFilters.has("REG") && isReg);
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

  // Pagination helpers
  const renderPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

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
          disabled={locating}
          title={isGhlMode ? "Use approximate location" : "Use my location"}
          className="min-h-[44px] min-w-[44px] shrink-0"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
        {locating && (
          <span className="text-xs text-muted-foreground animate-pulse">Locating…</span>
        )}
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
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {totalCount === 0
                  ? "No contacts found in that area — try a wider radius."
                  : totalCount <= PAGE_SIZE
                    ? `${filtered.length} of ${totalCount} contact${totalCount !== 1 ? "s" : ""} within ${radius} miles`
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} contacts within ${radius} miles`}
              </p>
              {/* Category filters */}
              {totalCount > 0 && (
                <div className="flex rounded-lg border overflow-hidden">
                  {(["RLT", "BIZ", "REG"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        categoryFilters.has(cat)
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {/* List / Map toggle */}
              {totalCount > 0 && (
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === "map"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" />
                    Map
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isGhlMode && selectedContacts.length > 0 && (
                <>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    onClick={() => setGroupSmsOpen(true)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Group Text ({selectedContacts.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    onClick={() => setTagModalOpen(true)}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Tag ({selectedContacts.length})
                  </Button>
                </>
              )}
              {totalCount > 0 && viewMode === "list" && (
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

          {/* Map View */}
          {viewMode === "map" && totalCount > 0 && (
            <ContactMapView
              contacts={filtered}
              mapMarkers={mapMarkers}
              center={searchCenter}
              repName={repName}
              isGhlMode={isGhlMode}
              ghlLocationId={effectiveGhlLocationId}
              onSelectContact={(c) => setSelectedContact(c)}
            />
          )}

          {/* List View */}
          {viewMode === "list" && filtered.length > 0 && (
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
                      {isGhlMode && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleContact(cid)}
                            aria-label={`Select ${contact.first_name}`}
                          />
                        </div>
                      )}

                      <div
                        className="min-w-0 cursor-pointer"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <p className="font-medium text-sm truncate">
                          {toTitleCase(contact.first_name)} {toTitleCase(contact.last_name)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{toTitleCase(contact.city)}, {contact.state?.toUpperCase()}</p>
                      </div>

                      <div className="hidden sm:block">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {contact.distance_miles.toFixed(1)} mi
                        </Badge>
                      </div>

                      <div className="hidden sm:block text-sm">{formatCurrency(contact.lifetime_value)}</div>

                      <div className="hidden sm:block text-xs text-muted-foreground">
                        {contact.last_order_date ? new Date(contact.last_order_date).toLocaleDateString() : "—"}
                      </div>

                      <div className="hidden sm:block text-xs text-muted-foreground">
                        {contact.last_service_date ? new Date(contact.last_service_date).toLocaleDateString() : "—"}
                      </div>

                      <div className="sm:hidden">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {contact.distance_miles.toFixed(1)} mi
                        </Badge>
                      </div>

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
                          href={`sms:${contact.phone}?body=Hi ${encodeURIComponent(toTitleCase(contact.first_name))}, this is ${encodeURIComponent(repName)} from Cutco — I'm in your area and wanted to reach out!`}
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
                        {isGhlMode && contact.contact_id && effectiveGhlLocationId && (
                          <button
                            onClick={() => {
                              const url = `https://app.gohighlevel.com/v2/location/${effectiveGhlLocationId}/contacts/detail/${contact.contact_id}`;
                              try {
                                window.open(url, "_top");
                              } catch {
                                try {
                                  if (window.top && window.top !== window.self) {
                                    window.top.location.href = url;
                                  } else {
                                    window.location.href = url;
                                  }
                                } catch {
                                  window.open(url, "_blank", "noopener,noreferrer");
                                }
                              }
                            }}
                            className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                            title="View in GoHighLevel"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
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

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 px-4 py-3 border-t bg-muted/20">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  {renderPageNumbers().map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p as number)}
                        disabled={loading}
                        className={`min-w-[32px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          page === p
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
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
                  Are you sure you want to delete <strong>{toTitleCase(contactToDelete?.first_name)} {toTitleCase(contactToDelete?.last_name)}</strong>? This cannot be undone.
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

      {/* Tag contacts modal */}
      {isGhlMode && (
        <TagContactsModal
          open={tagModalOpen}
          onClose={() => setTagModalOpen(false)}
          contacts={selectedContacts}
        />
      )}
    </div>
  );
}
