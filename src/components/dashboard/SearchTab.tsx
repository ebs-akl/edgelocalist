import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2, Phone, MessageSquare, Map, ExternalLink, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneDisplay, formatCurrency } from "@/lib/contacts";
import type { NearbyContact } from "@/lib/contacts";
import ContactDetailModal from "./ContactDetailModal";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWRnZWRtcyIsImEiOiJjbWxvZ25kNjIwOHhpM2dxNjdlcHY3MDFlIn0.vAChp9IlzeKSlI5kxjWPcA";
const RADIUS_OPTIONS = [10, 25, 50] as const;

interface SearchTabProps {
  repName: string;
  recentSearches: string[];
  onSearch: (address: string) => void;
  contactCount: number;
  isGhlMode: boolean;
}

type SortKey = "distance_miles" | "lifetime_value";

export default function SearchTab({ repName, recentSearches, onSearch, contactCount, isGhlMode }: SearchTabProps) {
  const { user } = useAuth();
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

  const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
    if (!MAPBOX_TOKEN) {
      toast({ title: "Mapbox token missing", variant: "destructive" });
      return null;
    }
    const encoded = encodeURIComponent(addr);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`
    );
    const data = await res.json();
    const [lng, lat] = data?.features?.[0]?.center ?? [];
    if (!lat || !lng) return null;
    return { lat, lng };
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not supported on this device", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode for display
        if (MAPBOX_TOKEN) {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`
          );
          const data = await res.json();
          const place = data?.features?.[0]?.place_name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setAddress(place);
        }
        setSearchCenter({ lat: latitude, lng: longitude });
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
    if (!user) return;
    if (contactCount === 0) {
      toast({ title: "No contacts loaded yet — let's fix that.", description: "Upload a CSV in the Contacts tab first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSearched(false);

    try {
      let center = searchCenter;
      if (!center) {
        center = await geocodeAddress(address.trim());
        if (!center) {
          toast({ title: "Address not found", description: "Try a more specific address or ZIP code.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }
      setSearchCenter(center);
      onSearch(address.trim() || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);

      const { data, error } = await supabase.rpc("nearby_contacts", {
        rep: user.id,
        center_lat: center.lat,
        center_lng: center.lng,
        radius_miles: radius,
      });

      if (error) throw error;
      setResults((data as NearbyContact[]) ?? []);
      setSearched(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed.";
      toast({ title: "Search error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [address, radius, user, contactCount, searchCenter, onSearch]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = results
    .filter((c) => {
      const q = filter.toLowerCase();
      return !q || `${c.first_name} ${c.last_name} ${c.city}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = sortKey === "lifetime_value" ? (a.lifetime_value ?? 0) : a.distance_miles;
      const bv = sortKey === "lifetime_value" ? (b.lifetime_value ?? 0) : b.distance_miles;
      return sortAsc ? av - bv : bv - av;
    });

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
            {results.length > 0 && (
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
            )}
          </div>

          {filtered.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_100px_100px_90px_auto] gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Name / City</span>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => handleSort("distance_miles")}
                >
                  Distance
                  {sortKey === "distance_miles" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
                <button
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => handleSort("lifetime_value")}
                >
                  Lifetime $
                  {sortKey === "lifetime_value" && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
                <span>Last Order</span>
                <span>Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {filtered.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid sm:grid-cols-[1fr_100px_100px_90px_auto] gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer items-center"
                    onClick={() => setSelectedContact(contact)}
                  >
                    {/* Name + city */}
                    <div className="min-w-0">
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
                      {contact.last_order_date
                        ? new Date(contact.last_order_date).toLocaleDateString()
                        : "—"}
                    </div>

                    {/* Mobile distance badge */}
                    <div className="sm:hidden">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {contact.distance_miles.toFixed(1)} mi
                      </Badge>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
    </div>
  );
}
