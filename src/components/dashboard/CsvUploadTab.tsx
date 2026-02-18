import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, RefreshCw, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhone, stripAptFromAddress, isPOBox } from "@/lib/contacts";
import Papa from "papaparse";

interface UploadStats {
  total: number;
  geocoded: number;
  failed: number;
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
}

function normalize(row: CsvRow, keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find((h) => h.toLowerCase().replace(/[\s_]/g, "") === k.toLowerCase().replace(/[\s_]/g, ""));
    if (found && row[found]) return row[found].trim();
  }
  return "";
}

export default function CsvUploadTab({ onUploaded, contactCount, lastSync }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

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
          const address = normalize(row, ["address", "street", "streetaddress"]);
          return {
            id: `row-${i}`,
            first_name: normalize(row, ["firstname", "first_name", "first"]),
            last_name: normalize(row, ["lastname", "last_name", "last"]),
            phone: formatPhone(normalize(row, ["phone", "phonenumber", "phone_number"])),
            address,
            street_clean: stripAptFromAddress(address),
            city: normalize(row, ["city"]),
            state: normalize(row, ["state"]),
            zip: normalize(row, ["zip", "zipcode", "zip_code", "postalcode"]),
            poBox: isPOBox(address),
          };
        }).filter((c) => c.first_name || c.last_name || c.phone);

        const validContacts = contacts.filter((c) => !c.poBox && c.street_clean && c.city && c.state);
        const poBoxCount = contacts.filter((c) => c.poBox).length;

        const BATCH_SIZE = 500;
        const batches = [];
        for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
          batches.push(validContacts.slice(i, i + BATCH_SIZE));
        }

        let totalGeocoded = 0;
        let totalFailed = poBoxCount;

        const geocodeResults: Record<string, { lat: number | null; lng: number | null }> = {};

        for (let b = 0; b < batches.length; b++) {
          const batch = batches[b];
          const startIdx = b * BATCH_SIZE;
          setProgressLabel(`Geocoding ${startIdx + 1}–${startIdx + batch.length} of ${validContacts.length}...`);
          setProgress(Math.round((b / batches.length) * 70));

          try {
            const { data, error } = await supabase.functions.invoke("geocode-contacts", {
              body: {
                contacts: batch.map((c) => ({
                  id: c.id,
                  street: c.street_clean,
                  city: c.city,
                  state: c.state,
                  zip: c.zip,
                })),
              },
            });

            if (error) throw error;

            for (const r of data?.results ?? []) {
              geocodeResults[r.id] = { lat: r.lat, lng: r.lng };
              if (r.lat != null) totalGeocoded++;
              else totalFailed++;
            }
          } catch (err) {
            console.error("Geocode batch error:", err);
            // Mark all in batch as failed
            for (const c of batch) {
              geocodeResults[c.id] = { lat: null, lng: null };
              totalFailed++;
            }
          }
        }

        setProgressLabel("Saving contacts...");
        setProgress(80);

        // Upsert all contacts
        const upsertRows = contacts.map((c) => ({
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
          source: "csv" as const,
          updated_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from("localist_contacts")
          .upsert(upsertRows, { onConflict: "rep_id,contact_id" });

        if (upsertError) {
          toast({ title: "Save failed", description: upsertError.message, variant: "destructive" });
        } else {
          setStats({
            total: contacts.length,
            geocoded: totalGeocoded,
            failed: totalFailed,
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Re-upload
          </Button>
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
        onClick={() => !uploading && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium mb-1">
          {uploading ? progressLabel : "Drop your VectorConnect CSV here"}
        </p>
        <p className="text-sm text-muted-foreground">
          {uploading ? "" : "or click to browse — CSV files only"}
        </p>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progressLabel}</p>
        </div>
      )}

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
        </div>
      )}

      {/* Expected columns */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Expected CSV columns</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["First Name", "Last Name", "Phone", "Address", "City", "State", "ZIP"].map((col) => (
            <Badge key={col} variant="secondary" className="font-mono text-xs">
              {col}
            </Badge>
          ))}
        </div>
        <div className="flex items-start gap-2 mt-3">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            PO Boxes are detected and skipped. Apartment numbers are stripped before geocoding but kept in your records.
          </p>
        </div>
      </div>
    </div>
  );
}
