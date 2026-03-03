import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, CheckCircle2, Tag, Info, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { NearbyContact } from "@/lib/contacts";

interface GroupSmsModalProps {
  open: boolean;
  onClose: () => void;
  contacts: NearbyContact[];
  repName: string;
}

const SMS_TEMPLATES = [
  {
    label: "Appointment Follow-Up",
    body: `Hi {{contact.first_name}}, it's {{user.first_name}} with Cutco! I was in your area and wanted to check in. Would you have a few minutes this week for a quick visit? Let me know what works!`,
  },
  {
    label: "Service Reminder",
    body: `Hey {{contact.first_name}}! It's {{user.first_name}} from Cutco. It's been a while since your last sharpening — I'd love to stop by and take care of your knives. Want to set something up?`,
  },
  {
    label: "Holiday / Seasonal",
    body: `Happy holidays, {{contact.first_name}}! 🎁 It's {{user.first_name}} with Cutco. If you're thinking about gifts this season, I have some great options. Let me know if you'd like to chat!`,
  },
  {
    label: "New Customer Intro",
    body: `Hi {{contact.first_name}}, this is {{user.first_name}} with Cutco! I'm your local rep in the {{contact.city}} area. If you ever need anything — sharpening, replacements, or new pieces — don't hesitate to reach out!`,
  },
];

export default function GroupSmsModal({ open, onClose, contacts, repName }: GroupSmsModalProps) {
  const { ssoPayload } = useAuth();
  const [tag, setTag] = useState("localist-sms");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [taggedCount, setTaggedCount] = useState(0);
  const [step, setStep] = useState<"compose" | "tagging">("compose");

  const GHL_ID_RE = /^[a-zA-Z0-9]{20}$/;
  const validContacts = contacts.filter((c) => c.contact_id && GHL_ID_RE.test(c.contact_id.trim()));

  const handleSend = async () => {
    const trimmedTag = tag.trim();
    const trimmedMessage = message.trim();

    if (!trimmedTag) {
      toast({ title: "Enter a tag name", variant: "destructive" });
      return;
    }
    if (!trimmedMessage) {
      toast({ title: "Enter an SMS message", variant: "destructive" });
      return;
    }

    const contactIds = validContacts.map((c) => c.contact_id!.trim());

    if (contactIds.length === 0) {
      toast({ title: "No valid CRM contact IDs found", description: "Selected contacts don't have valid GoHighLevel IDs.", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      // Step 1: Save message as GHL Custom Value
      setStep("compose");
      const cvPayload: Record<string, unknown> = { message: trimmedMessage };
      if (ssoPayload) cvPayload.sso_payload = ssoPayload;

      const { error: cvError } = await supabase.functions.invoke("localist-set-custom-value", {
        body: cvPayload,
      });

      if (cvError) throw new Error(cvError.message || "Failed to save SMS message");

      // Step 2: Apply tags in batches
      setStep("tagging");
      const BATCH_SIZE = 500;
      let totalTagged = 0;
      let totalFailed = 0;

      for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
        const batch = contactIds.slice(i, i + BATCH_SIZE);
        const payload: Record<string, unknown> = {
          tag: trimmedTag,
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
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast({ title: "Group SMS failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setTaggedCount(0);
    setTag("localist-sms");
    setMessage("");
    setStep("compose");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
            <MessageSquare className="h-5 w-5 text-primary" />
            Group Text — {validContacts.length} Contact{validContacts.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            Compose your message, then apply a tag to trigger your GHL Workflow.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {taggedCount} contact{taggedCount !== 1 ? "s" : ""} tagged!
            </p>
            <p className="text-sm text-muted-foreground">
              Your message has been saved as a Custom Value and the tag <Badge variant="secondary" className="mx-1">{tag}</Badge> has been applied.
            </p>
            <div className="rounded-lg bg-muted/50 border p-3 w-full text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your Workflow will send:</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded text-xs">{"{{custom_values.localist_sms_message}}"}</code> in your GHL Workflow's SMS action.
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
                <li>Your message is saved as a <strong>Custom Value</strong> in GoHighLevel.</li>
                <li>A tag is applied to all selected contacts instantly.</li>
                <li>Your <strong>GHL Workflow</strong> triggers on this tag and sends the SMS using the saved message.</li>
              </ol>
            </div>

            {/* Templates */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Templates
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SMS_TEMPLATES.map((tpl) => (
                  <Button
                    key={tpl.label}
                    variant={message === tpl.body ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setMessage(tpl.body)}
                  >
                    {tpl.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMS Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here or pick a template above…"
                maxLength={1000}
                rows={4}
                style={{ fontSize: "16px" }}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/1000 chars · Use GHL merge fields like {"{{contact.first_name}}"} for personalization.
              </p>
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
              />
              <p className="text-xs text-muted-foreground">
                This tag will be added to each contact. Use the same tag as your Workflow trigger.
              </p>
            </div>

            {contacts.length !== validContacts.length && (
              <p className="text-xs text-destructive">
                {contacts.length - validContacts.length} contact{contacts.length - validContacts.length !== 1 ? "s" : ""} without valid CRM IDs will be skipped.
              </p>
            )}

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !tag.trim() || !message.trim()}
                className="flex-1 font-semibold"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === "compose" ? "Saving message…" : `Tagging ${validContacts.length} contacts…`}
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Save Message & Apply Tag
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
