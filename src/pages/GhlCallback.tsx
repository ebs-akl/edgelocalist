import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import coffeebotGif from "@/assets/coffeebot.gif";

type Status = "loading" | "success" | "error";

export default function GhlCallback() {
  const [status, setStatus] = useState<Status>("loading");
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
        const redirectUri = "https://edgelocalist.app/callback";

        // Call edge function without auth — the function uses the code to identify the account
        const { data, error } = await supabase.functions.invoke("ghl-oauth-callback", {
          body: { code, redirect_uri: redirectUri },
        });

        if (error || !data?.success) {
          console.error("GHL OAuth failed:", {
            error: data?.error,
            error_description: data?.error_description,
            details: data?.details,
            raw: data,
          });
          throw new Error(
            data?.error_description || data?.error || "Could not connect to GoHighLevel. Please try again or contact support."
          );
        }

        setStatus("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6">
      {status === "loading" && (
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium text-foreground">
            Connecting to GoHighLevel… Please wait.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center space-y-4 max-w-md">
          <img
            src={coffeebotGif}
            alt="Success"
            className="w-40 h-40 mx-auto rounded-lg"
          />
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
          <h1
            className="text-2xl font-bold text-green-500"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Installation Complete!
          </h1>
          <p className="text-muted-foreground">
            Your account is successfully connected. You may now close this tab and return to your
            GoHighLevel dashboard.
          </p>
          <Button variant="outline" onClick={() => window.close()}>
            Close Tab
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1
            className="text-xl font-bold text-destructive"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            Connection Failed
          </h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Back to Home
          </Button>
        </div>
      )}
    </div>
  );
}
