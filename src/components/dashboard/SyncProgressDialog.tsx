import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MapPin, Download, Database, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import syncAnimation from "@/assets/sync-animation.gif";
import amberBot from "@/assets/blue_coffee_bot_cutout.png";

export interface SyncStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

interface SyncProgressDialogProps {
  open: boolean;
  onClose: () => void;
  steps: SyncStep[];
  summary?: {
    total: number;
    searchable: number;
    needsGeocoding: number;
  } | null;
  error?: string | null;
}

const stepIcons: Record<string, React.ReactNode> = {
  connect: <Download className="h-4 w-4" />,
  fetch: <Download className="h-4 w-4" />,
  save: <Database className="h-4 w-4" />,
  geocode: <MapPin className="h-4 w-4" />,
  done: <MapPin className="h-4 w-4" />,
};

export default function SyncProgressDialog({
  open,
  onClose,
  steps,
  summary,
  error,
}: SyncProgressDialogProps) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;
  const isFinished = summary !== null || error !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && isFinished && onClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !isFinished && e.preventDefault()}>
        <div className="space-y-5">
          {/* Animated GIF while syncing */}
          {!isFinished && (
            <div className="flex justify-center">
              <img
                src={syncAnimation}
                alt="Syncing contacts"
                className="h-28 w-auto object-contain rounded-lg"
                style={{ backgroundColor: "#ffffff" }}
              />
            </div>
          )}

          <div>
            <h3
              className="text-lg font-semibold"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {error ? "Sync Failed" : summary ? "Sync Complete! 🎉" : "Syncing Your Contacts"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error
                ? "Something went wrong during the sync."
                : summary
                  ? "Your CRM contacts are up to date."
                  : "Pulling contacts from GoHighLevel and preparing them for nearby search."}
            </p>
          </div>

          {!isFinished && <Progress value={progress} className="h-2" />}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {step.status === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : step.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : step.status === "error" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.status === "active"
                        ? "text-foreground"
                        : step.status === "done"
                          ? "text-muted-foreground"
                          : step.status === "error"
                            ? "text-destructive"
                            : "text-muted-foreground/50"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary card */}
          {summary && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total contacts</span>
                <span className="font-semibold">{summary.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Searchable (have coordinates)
                </span>
                <span className="font-semibold text-green-600">{summary.searchable.toLocaleString()}</span>
              </div>
              {summary.needsGeocoding > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Need geocoding</span>
                  <span className="font-medium text-amber-600">{summary.needsGeocoding.toLocaleString()}</span>
                </div>
              )}
              {summary.searchable > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  ✅ You can search for nearby contacts right now using the Search tab.
                </p>
              )}
              {summary.needsGeocoding > 0 && (
                <p className="text-xs text-muted-foreground">
                  📍 Contacts without coordinates won't appear in nearby searches yet.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex justify-center">
                <img src={amberBot} alt="Error" className="h-24 w-auto object-contain" />
              </div>
              <p className="text-sm text-destructive text-center">{error}</p>
              <p className="text-xs text-muted-foreground text-center">
                Need help?{" "}
                <a
                  href="mailto:support@automatedknifelife.com"
                  className="text-primary underline hover:text-primary/80"
                >
                  support@automatedknifelife.com
                </a>
              </p>
            </div>
          )}

          {isFinished && (
            <Button onClick={onClose} className="w-full">
              {summary ? "Got it!" : "Close"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
