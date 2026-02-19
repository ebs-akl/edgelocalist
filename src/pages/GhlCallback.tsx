import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { MapPin, Loader2 } from "lucide-react";

export default function GhlCallback() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setErrorMsg("No authorization code received from GoHighLevel.");
        setStatus("error");
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setErrorMsg("You must be signed in to connect GoHighLevel.");
          setStatus("error");
          return;
        }

        const redirectUri = "https://edgelocalist.app/leadconnector/oauth";

        const { data, error } = await supabase.functions.invoke("ghl-oauth-callback", {
          body: { code, redirect_uri: redirectUri },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error || !data?.success) {
          const detail = data?.details ? ` | GHL says: ${data.details}` : "";
          const clientId = data?.client_id_used ? ` | client_id: ${data.client_id_used}` : "";
          const redirectUri = data?.redirect_uri_used ? ` | redirect_uri: ${data.redirect_uri_used}` : "";
          throw new Error((data?.error ?? error?.message ?? "Unknown error") + detail + clientId + redirectUri);
        }

        await refreshProfile();
        toast({ title: "GoHighLevel connected!", description: "Your contacts will sync automatically." });
        navigate("/settings", { replace: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    run();
  }, [navigate, refreshProfile]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <MapPin className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
          GHL Connection Failed
        </h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{errorMsg}</p>
        <button
          onClick={() => navigate("/settings")}
          className="text-sm text-primary underline"
        >
          Back to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Connecting GoHighLevel…</p>
    </div>
  );
}
