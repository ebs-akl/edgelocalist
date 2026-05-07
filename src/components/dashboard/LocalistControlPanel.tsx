import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface ControlPanelProps {
  contactCount: number;
  lastSync: string | null;
  isGhlMode: boolean;
  ghlLocationId?: string | null;
  subscriptionTier: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  crmTokenMissing?: boolean;
  onInstallGhl?: () => void;
  installingGhl?: boolean;
}

function formatRelativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ControlPanel({
  contactCount,
  lastSync,
  isGhlMode,
  ghlLocationId,
  subscriptionTier,
  onRefresh,
  refreshing,
}: ControlPanelProps) {
  const hasContacts = contactCount > 0;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
          {isGhlMode ? "🔗 CRM Connection" : "🔌 Control Panel"}
        </h3>

        {/* Status */}
        <div className="flex items-center justify-between mb-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                isGhlMode ? "bg-success animate-pulse" : hasContacts ? "bg-success animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <div>
              <p className="text-sm font-medium">
                {isGhlMode
                  ? "Connected to GoHighLevel"
                  : hasContacts
                    ? "Contacts Active"
                    : "No contacts loaded"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isGhlMode
                  ? hasContacts
                    ? lastSync
                      ? `Last sync: ${formatRelativeTime(lastSync)}`
                      : `${contactCount.toLocaleString()} contacts synced`
                    : "Syncing contacts from CRM…"
                  : hasContacts
                    ? lastSync
                      ? `Last sync: ${formatRelativeTime(lastSync)}`
                      : `${contactCount.toLocaleString()} contacts`
                    : "Upload a CSV to get started"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contacts</span>
            <span className="font-medium">{contactCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mode</span>
            <Badge className="text-xs" variant={isGhlMode ? "default" : "secondary"}>
              {isGhlMode ? "GHL Mode" : "CSV Mode"}
            </Badge>
          </div>
          {isGhlMode && ghlLocationId && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-xs font-mono truncate max-w-[140px]" title={ghlLocationId}>
                {ghlLocationId}
              </span>
            </div>
          )}
          {subscriptionTier && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">{subscriptionTier}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {isGhlMode && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Syncing GHL..." : "Refresh GHL Contacts"}
            </Button>
          )}
          {!isGhlMode && (
            <Link to="/settings">
              <Button variant="outline" size="sm" className="justify-start w-full">
                <Settings className="mr-2 h-3.5 w-3.5" /> Settings
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
