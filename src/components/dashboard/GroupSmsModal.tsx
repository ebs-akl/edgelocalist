import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, CheckCircle2, Tag, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { NearbyContact } from "@/lib/contacts";

interface GroupSmsModalProps {
  open: boolean;
  onClose: () => void;
  contacts: NearbyContact[];
  repName: string;
}

export default function GroupSmsModal({ open, onClose, contacts, repName }: GroupSmsModalProps) {
  const { ssoPayload } = useAuth();
  const [tag, setTag] = useState("localist-sms");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [taggedCount, setTaggedCount] = useState(0);

  const handleSend = async () => {
    const trimmed = tag.trim();
    if (!trimmed) {
      toast({ title: "Enter a tag name", variant: "destructive" });
      return;
    }

    const contactIds = contacts
      .filter((c) => c.contact_id)
      .map((c) => c.contact_id!.trim())
      .filter(Boolean);

    if (contactIds.length === 0) {
      toast({ title: "No valid CRM contact IDs found", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const BATCH_SIZE = 500;
      let totalTagged = 0;
      let totalFailed = 0;

      for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
        const batch = contactIds.slice(i, i + BATCH_SIZE);
        const payload: Record<string, unknown> = {
          tag: trimmed,
          contact_ids: batch,
        };
        if (ssoPayload) payload.sso_payload = ssoPayload;

        const { data, error } = await supabase.functions.invoke("localist-group-sms", {
          body: payload,
        });

        if (error) throw error;
        totalTagged += data?.tagged ?? 0;
        totalFailed += data?.failed ?? 0;
      }

      setTaggedCount(totalTagged);
      setDone(true);

      if (totalFailed > 0) {
        toast({ title: `Tagged ${totalTagged} contacts`, description: `${totalFailed} failed.`, variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tag operation failed";
      toast({ title: "Group SMS failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setTaggedCount(0);
    setTag("localist-sms");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
            <MessageSquare className="h-5 w-5 text-primary" />
            Group Text — {contacts.length} Contact{contacts.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Apply a tag to trigger your GoHighLevel SMS workflow.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {taggedCount} contact{taggedCount !== 1 ? "s" : ""} tagged!
            </p>
            <p className="text-sm text-muted-foreground">
              The tag <Badge variant="secondary" className="mx-1">{tag}</Badge> has been applied.
              Your GHL Workflow will now send SMS messages automatically.
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <>
            {/* How it works */}
            <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> How it works
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>A tag is applied to all selected contacts instantly via GHL's bulk API.</li>
                <li>Set up a <strong>GHL Workflow</strong> that triggers when this tag is added.</li>
                <li>The Workflow sends your SMS using GHL's native "Send SMS" action.</li>
              </ol>
            </div>

            {/* Tag input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Trigger Tag</label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. localist-sms, spring-blast"
                maxLength={100}
                style={{ fontSize: "16px" }}
                onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
              />
              <p className="text-xs text-muted-foreground">
                This tag will be added to each contact. Use the same tag as your Workflow trigger.
              </p>
            </div>

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !tag.trim()}
                className="flex-1 font-semibold"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tagging {contacts.length} contacts…
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Apply Tag & Trigger SMS
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
