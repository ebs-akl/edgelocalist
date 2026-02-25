import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, RefreshCw, FileText, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhone, stripAptFromAddress, isPOBox, toTitleCase } from "@/lib/contacts";
import Papa from "papaparse";
import coffeeBotImg from "@/assets/upload-bot.gif";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";

async function geocodeAddress(street: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
  if (!MAPBOX_TOKEN) {
    console.warn("[Geocode] VITE_MAPBOX_ACCESS_TOKEN is not set — skipping geocoding");
    return null;
  }
  if (!street && !city) return null;
  try {
    const parts = [street, city, state, zip].filter(Boolean).join(" ");
    const query = encodeURIComponent(parts);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`
    );
    if (!res.ok) {
      console.warn(`[Geocode] Mapbox returned ${res.status} for "${parts}"`);
      return null;
    }
    const data = await res.json();
    const [lng, lat] = data?.features?.[0]?.center ?? [];
    if (lat && lng) return { lat, lng };
    return null;
  } catch (err) {
    console.warn("[Geocode] Error:", err);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UploadStats {
  total: number;
  geocoded: number;
  failed: number;
  duplicatesRemoved: number;
  lastUpload: string | null;
}

interface Props {
  onUploaded: () => void;
  contactCount: number;
  lastSync: string | null;
}

interface CsvRow {
  [key: string]: string;
}

interface ParsedContact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  street_clean: string;
  city: string;
  state: string;
  zip: string;
  poBox: boolean;
  last_order_date: string;
  last_service_date: string;
  rlt: string;
  biz: string;
  cat: string;
  lifetime_value: number | null;
  order_count: number | null;
  gift_count: number | null;
  rep_number: string;
}

function normalize(row: CsvRow, keys: string[]): string {
  const strip = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const k of keys) {
    const found = Object.keys(row).find((h) => strip(h) === strip(k));
    if (found && row[found]) return row[found].trim();
  }
  return "";
}

export default function CsvUploadTab({ onUploaded, contactCount, lastSync }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  const handleDeleteAll = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("localist_contacts")
        .delete()
        .eq("rep_id", user.id);
      if (error) throw error;
      toast({ title: "All contacts deleted." });
      setStats(null);
      onUploaded();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    setProgress(0);
    setStats(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const contacts: ParsedContact[] = rows.map((row, i) => {
          // "Address 1" → normalizes to "address1"; "Address 2" is the apt/unit line
          const address1 = normalize(row, ["address1", "address", "street", "streetaddress"]);
          const address2 = normalize(row, ["address2"]);
          // Full address stored in DB combines both lines
          const address = address2 ? `${address1}, ${address2}` : address1;
          const rawLifetime = normalize(row, ["lifetime$", "ltv$", "ltv", "lifetime", "lifetimevalue"]);
          const rawOrders = normalize(row, ["#orders", "orders", "numberoforders", "numorders"]);
          const rawGifts = normalize(row, ["#gifts", "gifts", "numberofgifts", "numgifts"]);
          const repNumber = normalize(row, ["repnumber", "rep#", "repnum", "rep_number", "rep_num", "repno"]);
          return {
            id: `row-${i}`,
            first_name: toTitleCase(normalize(row, ["firstname", "first_name", "first"])),
            last_name: toTitleCase(normalize(row, ["lastname", "last_name", "last"])),
            phone: formatPhone(normalize(row, ["phone", "phonenumber", "phone_number"])),
            address,
            // Geocode only off Address 1 (already without the apt unit)
            street_clean: stripAptFromAddress(address1),
            city: normalize(row, ["city"]),
            state: normalize(row, ["state"]),
            zip: normalize(row, ["zip", "zipcode", "zip_code", "postalcode"]),
            poBox: isPOBox(address1),
            last_order_date: normalize(row, ["lastorderdate", "lastorder", "lastord", "lastorderdt"]),
            last_service_date: normalize(row, ["lastservicedate", "lastservice", "servicedate"]),
            rlt: normalize(row, ["rlt"]),
            biz: normalize(row, ["biz"]),
            cat: normalize(row, ["cat"]),
            lifetime_value: rawLifetime ? parseFloat(rawLifetime.replace(/[$,]/g, "")) || null : null,
            order_count: rawOrders ? parseInt(rawOrders, 10) || null : null,
            gift_count: rawGifts ? parseInt(rawGifts, 10) || null : null,
            rep_number: repNumber,
          };
        }).filter((c) => c.first_name || c.last_name || c.phone);

        // Deduplicate by phone (keep last occurrence)
        const phoneMap = new Map<string, ParsedContact>();
        for (const c of contacts) {
          if (c.phone) {
            phoneMap.set(c.phone, c);
          } else {
            phoneMap.set(`no-phone-${Math.random()}`, c);
          }
        }
        const deduped = Array.from(phoneMap.values());
        const duplicatesRemoved = contacts.length - deduped.length;

        const validContacts = deduped.filter((c) => !c.poBox && c.street_clean && c.city && c.state);
        const poBoxCount = deduped.filter((c) => c.poBox).length;

        let totalGeocoded = 0;
        let totalFailed = poBoxCount;
        const geocodeResults: Record<string, { lat: number | null; lng: number | null }> = {};

        // Try client-side geocoding if Mapbox token is available
        if (MAPBOX_TOKEN) {
          const CONCURRENCY = 5;
          const DELAY_MS = 250;

          for (let i = 0; i < validContacts.length; i += CONCURRENCY) {
            const chunk = validContacts.slice(i, i + CONCURRENCY);
            setProgressLabel(`Geocoding ${i + 1}–${Math.min(i + CONCURRENCY, validContacts.length)} of ${validContacts.length}...`);
            setProgress(Math.round((i / validContacts.length) * 70));

            await Promise.all(chunk.map(async (c) => {
              const result = await geocodeAddress(c.street_clean, c.city, c.state, c.zip);
              geocodeResults[c.id] = { lat: result?.lat ?? null, lng: result?.lng ?? null };
              if (result) totalGeocoded++;
              else totalFailed++;
            }));

            if (i + CONCURRENCY < validContacts.length) {
              await sleep(DELAY_MS);
            }
          }
        } else {
          // No client-side token — we'll use server-side geocoding after upsert
          setProgressLabel("Preparing contacts for server-side geocoding...");
          setProgress(50);
          // Mark all valid contacts as not geocoded yet (they'll get null coords)
          for (const c of validContacts) {
            geocodeResults[c.id] = { lat: null, lng: null };
          }
        }

        setProgressLabel("Saving contacts...");
        setProgress(80);

        // Upsert all contacts
        const upsertRows = deduped.map((c) => ({
          rep_id: user.id,
          contact_id: c.phone || `${c.first_name}-${c.last_name}-${Math.random()}`,
          first_name: c.first_name,
          last_name: c.last_name,
          phone: c.phone,
          address: c.address,
          city: c.city,
          state: c.state,
          zip: c.zip,
          latitude: c.poBox ? null : (geocodeResults[c.id]?.lat ?? null),
          longitude: c.poBox ? null : (geocodeResults[c.id]?.lng ?? null),
          last_order_date: c.last_order_date || null,
          last_service_date: c.last_service_date || null,
          rlt: c.rlt || null,
          biz: c.biz || null,
          cat: c.cat || null,
          lifetime_value: c.lifetime_value,
          order_count: c.order_count,
          gift_count: c.gift_count,
          rep_number: c.rep_number || null,
          source: "csv" as const,
          updated_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from("localist_contacts")
          .upsert(upsertRows, { onConflict: "rep_id,contact_id" });

        if (upsertError) {
          toast({ title: "Save failed", description: upsertError.message, variant: "destructive" });
        } else {
          // If client-side geocoding wasn't available, use server-side geocoding
          if (!MAPBOX_TOKEN && validContacts.length > 0) {
            setProgressLabel("Geocoding addresses server-side...");
            setProgress(75);
            let remaining = 1;
            let rounds = 0;
            const MAX_ROUNDS = 20;

            while (remaining > 0 && rounds < MAX_ROUNDS) {
              const { data: geoData, error: geoErr } = await supabase.functions.invoke("localist-geocode-contacts", {
                body: { limit: 500 },
              });
              if (geoErr || !geoData) break;

              totalGeocoded += geoData.geocoded ?? 0;
              remaining = geoData.remaining ?? 0;
              rounds++;

              if (totalGeocoded > 0) {
                setProgressLabel(`${totalGeocoded.toLocaleString()} addresses geocoded${remaining > 0 ? `, ${remaining.toLocaleString()} remaining...` : ""}`);
                setProgress(75 + Math.round((1 - remaining / (remaining + totalGeocoded)) * 20));
              }
              if (geoData.geocoded === 0) break;
            }
            totalFailed = deduped.length - totalGeocoded - poBoxCount;
            if (totalFailed < 0) totalFailed = 0;
          }

          setStats({
            total: deduped.length,
            geocoded: totalGeocoded,
            failed: totalFailed,
            duplicatesRemoved,
            lastUpload: new Date().toISOString(),
          });
          setProgress(100);
          setProgressLabel("Done!");
          toast({
            title: `✓ ${totalGeocoded} contacts ready.`,
            description: totalFailed > 0 ? `${totalFailed} addresses could not be geocoded.` : "All addresses geocoded!",
          });
          onUploaded();
        }

        setUploading(false);
      },
      error: (err) => {
        toast({ title: "CSV parse error", description: err.message, variant: "destructive" });
        setUploading(false);
      },
    });
  }, [user, onUploaded]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Full-screen coffee bot loading state
  if (uploading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-6">
        <img
          src={coffeeBotImg}
          alt="Coffee Bot mascot"
          className="w-40 h-40 object-contain drop-shadow-lg"
        />
        <div className="space-y-2 max-w-sm">
          <p className="font-semibold text-base leading-snug">
            This could take a minute or two depending on your list size.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Coffee is for closers — go grab a cup and we'll have your contacts ready when you get back.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2">
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground">{progressLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Current status */}
      {contactCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-sm">{contactCount.toLocaleString()} contacts loaded</p>
              {lastSync && (
                <p className="text-xs text-muted-foreground">
                  Last upload: {new Date(lastSync).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || deleting}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Re-upload
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading || deleting}
                  className="text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-sm text-center">
                <AlertDialogHeader>
                  <div className="flex justify-center mb-2">
                    <img src={stopBotImg} alt="Stop" className="w-36 h-36 object-contain" />
                  </div>
                  <AlertDialogTitle className="text-2xl font-black tracking-wide text-destructive" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    STOP!
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-foreground">
                    This cannot be undone. Are you sure you want to delete <strong>all</strong> of your contacts?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Yes, delete all"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">Drop your VectorConnect CSV here</p>
        <p className="text-sm text-muted-foreground">or click to browse — CSV files only</p>
      </div>

      {/* Upload results */}
      {stats && !uploading && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">
              ✓ {stats.geocoded} contacts ready.{" "}
              {stats.failed > 0 && `${stats.failed} addresses could not be geocoded.`}
            </span>
          </div>
          {stats.duplicatesRemoved > 0 && (
            <div className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                {stats.duplicatesRemoved} duplicate phone number
                {stats.duplicatesRemoved === 1 ? " was" : "s were"} removed from your CSV.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expected columns */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Expected CSV columns</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["First Name", "Last Name", "Address 1", "Address 2", "City", "State", "Zip", "Phone", "Email", "Customer #", "Rep #"].map((col) => (
            <Badge key={col} variant="secondary" className="font-mono text-xs">
              {col}
            </Badge>
          ))}
        </div>
        <div className="flex items-start gap-2 mt-3">
          <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Matches standard Cutco VectorConnect export headers. PO Boxes are skipped; Address 2 is stored but Address 1 is used for geocoding.
          </p>
        </div>
      </div>
    </div>
  );
}
