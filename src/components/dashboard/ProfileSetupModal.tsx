import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Forces the user to fill in full_name and rep_number before using the dashboard.
 * Triggered when repProfile is loaded but missing either field.
 * rep_number is locked once set (per project rules).
 */
export default function ProfileSetupModal() {
  const { user, repProfile, loadingProfile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [repNumber, setRepNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const needsName = !repProfile?.full_name?.trim();
  const needsRepNumber = !repProfile?.rep_number;
  // Inside the CRM iframe the rep identity comes from the verified SSO session
  // (location + auto-provisioned account), so don't block the dashboard on this.
  const open =
    !isRunningInGhlIframe() &&
    !!user &&
    !loadingProfile &&
    !!repProfile &&
    (needsName || needsRepNumber);

  useEffect(() => {
    if (repProfile?.full_name) setFullName(repProfile.full_name);
  }, [repProfile?.full_name]);

  const handleSave = async () => {
    const nameValue = fullName.trim();
    const repValue = repNumber.trim();

    if (needsName && !nameValue) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (needsRepNumber && !/^\d{8}$/.test(repValue)) {
      toast({ title: "Invalid Rep Number", description: "Must be exactly 8 digits.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: { id: string; email: string; full_name?: string; rep_number?: string } = {
        id: user!.id,
        email: user!.email ?? "",
      };
      if (needsName) payload.full_name = nameValue;
      if (needsRepNumber) payload.rep_number = repValue;

      const { error } = await supabase
        .from("localist_reps")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;

      await refreshProfile();
      toast({ title: "Profile saved", description: "You're all set." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Oswald', sans-serif" }}>
            Finish Setting Up Your Account
          </DialogTitle>
          <DialogDescription>
            We need a couple more details before you can use AKL LocaList. This is a one-time setup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {needsName && (
            <div className="space-y-1.5">
              <Label htmlFor="setup-name">Full Name</Label>
              <Input
                id="setup-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                maxLength={100}
                autoFocus
              />
            </div>
          )}

          {needsRepNumber && (
            <div className="space-y-1.5">
              <Label htmlFor="setup-rep">Rep Number (8-digit ID)</Label>
              <Input
                id="setup-rep"
                value={repNumber}
                onChange={(e) => setRepNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="12345678"
                maxLength={8}
                inputMode="numeric"
                className="font-mono tracking-wide"
                autoFocus={!needsName}
              />
              <p className="text-xs text-muted-foreground">
                Once saved, your rep number cannot be changed. Double-check before saving.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="w-full min-h-[44px]">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
