import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find reps whose trial ends in 1-2 days and haven't received step 3 yet.
    const { data: reps, error } = await admin
      .from("localist_reps")
      .select("id, email, trial_ends_at")
      .not("trial_ends_at", "is", null)
      .gte("trial_ends_at", new Date(Date.now() + 24 * 3600 * 1000).toISOString())
      .lte("trial_ends_at", new Date(Date.now() + 48 * 3600 * 1000).toISOString());

    if (error) throw error;

    const results: Array<{ rep_id: string; status: string }> = [];
    for (const rep of reps ?? []) {
      const { data: already } = await admin
        .from("localist_trial_emails")
        .select("id")
        .eq("rep_id", rep.id)
        .eq("step", 3)
        .maybeSingle();
      if (already) {
        results.push({ rep_id: rep.id, status: "skipped" });
        continue;
      }
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/localist-send-trial-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rep_id: rep.id, step: 3 }),
      });
      results.push({ rep_id: rep.id, status: resp.ok ? "sent" : "failed" });
    }

    console.log(`Trial cron: processed ${results.length} reps`, results);
    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("localist-trial-email-cron error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
