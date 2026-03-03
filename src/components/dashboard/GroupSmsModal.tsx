import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { toTitleCase } from "@/lib/contacts";
import type { NearbyContact } from "@/lib/contacts";


interface GroupSmsModalProps {
  open: boolean;
  onClose: () => void;
  contacts: NearbyContact[];
  repName: string;
}

interface Template {
  label: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    label: "Sharpening Check-in",
    body: "Hey {{first_name}}, it's {{rep_name}} here. I'm in your area and haven't seen you in a while. I have a little time in my schedule — could any of your Cutco use some sharpening?",
  },
  {
    label: "Area Visit",
    body: "Hey {{first_name}}, it's {{rep_name}} from Cutco. I'm in {{city}} and just wanted to reach out. How is everything?",
  },
  {
    label: "Limited Time Nearby",
    body: "Hey {{first_name}}, it's {{rep_name}} from Cutco! I don't make it to {{city}} very often — I'm in the area for a short time and didn't want to miss the chance to connect. Are you around?",
  },
];

function preview(template: string, repName: string): string {
  return template
    .replace(/\{\{first_name\}\}/g, "Jane")
    .replace(/\{\{city\}\}/g, "Springfield")
    .replace(/\{\{rep_name\}\}/g, repName);
}

export default function GroupSmsModal({ open, onClose, contacts, repName }: GroupSmsModalProps) {
  const { ssoPayload } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<number | "custom">(0);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const activeBody =
    selectedTemplate === "custom"
      ? customMessage
      : TEMPLATES[selectedTemplate as number]?.body ?? "";

  const handleSend = async () => {
    if (!activeBody.trim()) {
      toast({ title: "Message is empty", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const payload = contacts.map((c) => ({
        contact_id: c.id as string,
        first_name: toTitleCase(c.first_name),
        city: toTitleCase(c.city),
        phone: c.phone,
      }));

      const body: Record<string, unknown> = { contacts: payload, message_template: activeBody };
      if (ssoPayload) body.sso_payload = ssoPayload;
      const { data, error } = await supabase.functions.invoke("localist-group-sms", {
        body,
      });

      if (error) throw error;
      setSentCount(data?.sent ?? contacts.length);
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Send failed";
      toast({ title: "Group SMS failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setSentCount(0);
    setSelectedTemplate(0);
    setCustomMessage("");
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
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-semibold" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {sentCount} message{sentCount !== 1 ? "s" : ""} sent!
            </p>
            <p className="text-sm text-muted-foreground">
              Messages were throttled to protect your sender reputation.
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <>
            {/* Template picker */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a template</p>
              <div className="grid gap-2">
                {TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTemplate(i)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      selectedTemplate === i
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{t.label}</span>
                      {selectedTemplate === i && (
                        <Badge variant="default" className="text-[10px] h-4 px-1.5">Selected</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{t.body}</p>
                  </button>
                ))}

                {/* Write your own */}
                <button
                  onClick={() => setSelectedTemplate("custom")}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    selectedTemplate === "custom"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">✏️ Write your own</span>
                    {selectedTemplate === "custom" && (
                      <Badge variant="default" className="text-[10px] h-4 px-1.5">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>,{" "}
                    <code className="bg-muted px-1 rounded">{"{{city}}"}</code>,{" "}
                    <code className="bg-muted px-1 rounded">{"{{rep_name}}"}</code>
                  </p>
                </button>
              </div>
            </div>

            {/* Custom textarea */}
            {selectedTemplate === "custom" && (
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message... Use {{first_name}}, {{city}}, {{rep_name}}"
                className="min-h-[100px] text-sm"
              />
            )}

            {/* Live preview */}
            {activeBody && (
              <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preview (Jane · Springfield)</p>
                <p className="text-sm leading-relaxed">{preview(activeBody, repName)}</p>
              </div>
            )}

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !activeBody.trim()}
                className="flex-1 font-semibold"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending ({contacts.length})...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send to {contacts.length} Contact{contacts.length !== 1 ? "s" : ""}
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
