/**
 * payments-audit-snapshot
 *
 * Daily snapshot of totals into payment_audit_log so we have a trail of
 * gross/refund/net values per day per environment.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function snapshot(env: "sandbox" | "live") {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 3600 * 1000);
  const { data, error } = await supabase.rpc("get_revenue_summary" as never, {
    _from: from.toISOString(), _to: to.toISOString(), _env: env,
  } as never);
  // get_revenue_summary requires admin, but we use service role which bypasses
  // — wrap in raw query fallback:
  let summary: any = data;
  if (error) {
    const { data: rows } = await supabase
      .from("revenue_events").select("amount_cents, net_cents, direction, event_type")
      .eq("environment", env).gte("occurred_at", from.toISOString()).lt("occurred_at", to.toISOString());
    let gross = 0, net = 0, refunds = 0;
    for (const r of rows ?? []) {
      const a = Number(r.amount_cents ?? 0), n = Number(r.net_cents ?? 0);
      if (r.direction === "credit") { gross += a; net += n; }
      if (r.event_type?.startsWith("adjustment.") && r.direction === "debit") refunds += a;
    }
    summary = [{ gross_cents: gross, refund_cents: refunds, net_cents: net, event_count: rows?.length ?? 0, currency: "EUR" }];
  }
  await supabase.from("payment_audit_log").insert({
    environment: env, event_type: "snapshot.daily", actor: "system", severity: "info",
    notes: `Daily snapshot ${from.toISOString().slice(0,10)}`,
    after_state: { window_from: from.toISOString(), window_to: to.toISOString(), summary },
  });
  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    // Require either the service-role bearer (cron) or a super_admin JWT.
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isService = !!serviceKey && token === serviceKey;
    if (!isService) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: { user }, error: ue } = await userClient.auth.getUser(token);
      if (ue || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
      }
      const { data: isSuper } = await supabase.rpc("is_ssra_super_admin", { _uid: user.id });
      if (!isSuper) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
      }
    }

    const live = await snapshot("live");
    const sandbox = await snapshot("sandbox");
    return new Response(JSON.stringify({ ok: true, live, sandbox }), { headers: CORS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("payments-audit-snapshot error:", msg);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), { status: 500, headers: CORS });
  }
});
