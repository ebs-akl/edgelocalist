import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { NearbyContact } from "@/lib/contacts";

interface TagContactsModalProps {
  open: boolean;
  onClose: () => void;
  contacts: NearbyContact[];
}

export default function TagContactsModal({ open, onClose, contacts }: TagContactsModalProps) {
  const { ssoPayload } = useAuth();
  const [tag, setTag] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [taggedCount, setTaggedCount] = useState(0);

  const handleApply = async () => {
    const trimmed = tag.trim();
    if (!trimmed) {
      toast({ title: "Enter a tag name", variant: "destructive" });
      return;
    }

    const contactIds = contacts
      .filter((c) => c.contact_id)
      .map((c) => c.contact_id!);

    if (contactIds.length === 0) {
      toast({ title: "No GHL contacts selected", description: "Selected contacts don't have GHL IDs.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        tag: trimmed,
        contact_ids: contactIds,
      };
      if (ssoPayload) payload.sso_payload = ssoPayload;

      const { data, error } = await supabase.functions.invoke("ghl-tag-contacts", {
        body: payload,
      });

      if (error) throw error;

      setTaggedCount(data?.tagged ?? 0);
      setDone(true);

      if (data?.failed > 0) {
        toast({ title: `Tagged ${data.tagged} contacts`, description: `${data.failed} failed.`, variant: "destructive" });
      }
    } catch (err: unknown) {
      console.error("Tag error:", err);
      toast({ title: "Failed to apply tag", description: String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTag("");
    setDone(false);
    setTaggedCount(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {done ? "Tags Applied!" : "Apply Tag to Contacts"}
          </DialogTitle>
          <DialogDescription>
            {done
              ? `Successfully tagged ${taggedCount} of ${contacts.length} contacts.`
              : `Apply a tag to ${contacts.length} selected contact${contacts.length !== 1 ? "s" : ""} in GoHighLevel.`}
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tag Name</label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. Spring Campaign, Hot Lead, Follow Up"
                maxLength={100}
                style={{ fontSize: "16px" }}
                onKeyDown={(e) => e.key === "Enter" && !sending && handleApply()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This tag will be added to each contact's existing tags in GoHighLevel.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {done ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={sending || !tag.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tagging {contacts.length} contacts…
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Apply Tag
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
