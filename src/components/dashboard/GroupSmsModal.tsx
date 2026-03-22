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
import { Loader2, MessageSquare, Tag, Info } from "lucide-react";
import successBot from "@/assets/SuccessBot.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { NearbyContact } from "@/lib/contacts";
import { SMS_SNIPPETS, type SnippetTiming } from "./sms-snippets";

interface GroupSmsModalProps {
  open: boolean;
  onClose: () => void;
  contacts: NearbyContact[];
  repName: string;
}

export default function GroupSmsModal({ open, onClose, contacts, repName }: GroupSmsModalProps) {
  const { ssoPayload } = useAuth();
  const [tag, setTag] = useState("localist-sms");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [taggedCount, setTaggedCount] = useState(0);
  const [step, setStep] = useState<"compose" | "tagging">("compose");

  // Snippet selector state
  const [snippetCat, setSnippetCat] = useState<string | null>(null);
  const [snippetIdx, setSnippetIdx] = useState<number | null>(null);
  const [snippetTiming, setSnippetTiming] = useState<SnippetTiming | null>(null);

  const GHL_ID_RE = /^[a-zA-Z0-9]{20}$/;
  const validContacts = contacts.filter((c) => c.contact_id && GHL_ID_RE.test(c.contact_id.trim()));

  const selectedCategory = SMS_SNIPPETS.find((c) => c.category === snippetCat);
  const selectedSnippet = selectedCategory && snippetIdx !== null ? selectedCategory.snippets[snippetIdx] : null;

  const handlePickTiming = (timing: SnippetTiming) => {
    setSnippetTiming(timing);
    const variant = selectedSnippet?.variants.find((v) => v.timing === timing);
    if (variant) setMessage(variant.body);
  };

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
      setStep("compose");
      const cvPayload: Record<string, unknown> = { message: trimmedMessage };
      if (ssoPayload) cvPayload.sso_payload = ssoPayload;

      const { error: cvError } = await supabase.functions.invoke("localist-set-custom-value", {
        body: cvPayload,
      });

      if (cvError) throw new Error(cvError.message || "Failed to save SMS message");

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
    setSnippetCat(null);
    setSnippetIdx(null);
    setSnippetTiming(null);
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
            Pick a snippet or write your own, then apply a tag to trigger your GHL Workflow.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <img src={successBot} alt="Success" className="h-28 w-auto" />
            <p className="text-lg font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {taggedCount} contact{taggedCount !== 1 ? "s" : ""} tagged!
            </p>
            <p className="text-sm text-muted-foreground">
              Your message has been saved and the tag <Badge variant="secondary" className="mx-1">{tag}</Badge> has been applied. Your Workflow will now send each contact the SMS.
            </p>
            <div className="rounded-lg bg-muted/50 border p-3 w-full text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Each contact will receive:</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              The Workflow sends the message and removes the tag automatically so contacts can be messaged again.
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
                <li>Your message is saved as a <strong>Custom Value</strong> in your CRM.</li>
                <li>A tag is applied to all selected contacts instantly.</li>
                <li>Your <strong>Workflow</strong> triggers on this tag and sends the SMS.</li>
                <li>The tag is removed so contacts can be messaged again next time.</li>
              </ol>
            </div>

            {/* Snippet Selector */}
            <div className="space-y-2.5">
              <label className="text-sm font-medium">Snippet Library</label>

              {/* Step 1: Category */}
              <div className="flex flex-wrap gap-1.5">
                {SMS_SNIPPETS.map((cat) => (
                  <Button
                    key={cat.category}
                    variant={snippetCat === cat.category ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setSnippetCat(cat.category);
                      setSnippetIdx(null);
                      setSnippetTiming(null);
                    }}
                  >
                    {cat.icon} {cat.categoryLabel}
                  </Button>
                ))}
              </div>

              {/* Step 2: Snippet */}
              {selectedCategory && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategory.snippets.map((snippet, idx) => (
                    <Button
                      key={snippet.name}
                      variant={snippetIdx === idx ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setSnippetIdx(idx);
                        setSnippetTiming(null);
                      }}
                    >
                      {snippet.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Step 3: Timing */}
              {selectedSnippet && (
                <div className="flex flex-wrap gap-1.5">
                  {(["Immediate", "Morning Gap", "In Advance"] as SnippetTiming[]).map((t) => (
                    <Button
                      key={t}
                      variant={snippetTiming === t ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handlePickTiming(t)}
                    >
                      {t === "Immediate" ? "⚡" : t === "Morning Gap" ? "☀️" : "📅"} {t}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Message textarea */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SMS Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Pick a snippet above or type your own message…"
                maxLength={1600}
                rows={4}
                style={{ fontSize: "16px" }}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/1600 chars · Snippets include greetings — your Workflow sends as-is.
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
