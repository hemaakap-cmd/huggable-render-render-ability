/**
 * payments-reconcile
 *
 * Pulls Paddle transactions for a time window and diffs against revenue_events.
 * Writes results to payment_reconciliation_runs + payment_discrepancies +
 * payment_audit_log.
 *
 * Triggered by:
 *   - pg_cron every 30 min (short window)
 *   - pg_cron nightly (full day window)
 *   - super-admin manual button
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

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

async function fetchPaddleTransactions(env: PaddleEnv, from: Date, to: Date) {
  const results: any[] = [];
  let after: string | null = null;
  // Paddle accepts `billed_at[GT]` etc.; use updated_at for capture window.
  const baseQ = `updated_at[GTE]=${from.toISOString()}&updated_at[LT]=${to.toISOString()}&per_page=100&status=completed,paid,billed`;
  for (let i = 0; i < 20; i++) {
    const q = after ? `${baseQ}&after=${after}` : baseQ;
    const r = await gatewayFetch(env, `/transactions?${q}`);
    if (!r.ok) throw new Error(`Paddle ${r.status}: ${await r.text()}`);
    const j = await r.json();
    results.push(...(j.data ?? []));
    if (!j.meta?.pagination?.has_more) break;
    after = j.meta.pagination.next ?? null;
    if (!after) break;
  }
  return results;
}

async function runReconcile(env: PaddleEnv, hours: number, triggeredBy: string) {
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3600 * 1000);

  const { data: run, error: runErr } = await supabase
    .from("payment_reconciliation_runs")
    .insert({ environment: env, window_from: from.toISOString(), window_to: to.toISOString(), triggered_by: triggeredBy })
    .select()
    .single();
  if (runErr) throw runErr;
  const runId = run.id;

  try {
    const paddleTxns = await fetchPaddleTransactions(env, from, to);

    const { data: dbEvents } = await supabase
      .from("revenue_events")
      .select("paddle_transaction_id, amount_cents, currency")
      .eq("environment", env)
      .gte("occurred_at", from.toISOString())
      .lt("occurred_at", to.toISOString());

    const dbByTxn = new Map<string, { amount_cents: number }>();
    let dbTotal = 0;
    for (const e of dbEvents ?? []) {
      if (!e.paddle_transaction_id) continue;
      const prev = dbByTxn.get(e.paddle_transaction_id);
      const amt = Number(e.amount_cents ?? 0);
      dbByTxn.set(e.paddle_transaction_id, { amount_cents: (prev?.amount_cents ?? 0) + amt });
      dbTotal += amt;
    }

    let matched = 0, missingInDb = 0, amountMismatch = 0;
    let paddleTotal = 0;
    const discrepancies: any[] = [];

    for (const t of paddleTxns) {
      const tot = Number(t.details?.totals?.total ?? 0);
      paddleTotal += tot;
      const dbRow = dbByTxn.get(t.id);
      if (!dbRow) {
        missingInDb++;
        discrepancies.push({
          run_id: runId, environment: env, type: "missing_in_db",
          severity: "critical", paddle_id: t.id,
          expected: { amount_cents: tot, status: t.status, currency: t.currency_code },
          actual: null,
          description: `Paddle transaction ${t.id} (${(tot/100).toFixed(2)} ${t.currency_code}) not in revenue_events`,
        });
      } else if (dbRow.amount_cents !== tot) {
        amountMismatch++;
        discrepancies.push({
          run_id: runId, environment: env, type: "amount_mismatch",
          severity: "critical", paddle_id: t.id,
          expected: { amount_cents: tot }, actual: { amount_cents: dbRow.amount_cents },
          description: `Amount mismatch for ${t.id}: Paddle ${tot} vs DB ${dbRow.amount_cents}`,
        });
      } else {
        matched++;
      }
      dbByTxn.delete(t.id);
    }

    let missingInPaddle = 0;
    for (const [txnId, row] of dbByTxn) {
      missingInPaddle++;
      discrepancies.push({
        run_id: runId, environment: env, type: "missing_in_paddle",
        severity: "warn", db_id: txnId,
        expected: null, actual: { amount_cents: row.amount_cents },
        description: `DB has revenue event for ${txnId} but Paddle has no matching transaction in window`,
      });
    }

    if (discrepancies.length) {
      await supabase.from("payment_discrepancies").insert(discrepancies);
    }

    const drift = paddleTotal - dbTotal;
    const status = discrepancies.length === 0 && drift === 0 ? "ok" : "discrepancies";

    await supabase.from("payment_reconciliation_runs").update({
      finished_at: new Date().toISOString(),
      status,
      paddle_txn_count: paddleTxns.length,
      db_event_count: (dbEvents ?? []).length,
      matched_count: matched,
      missing_in_db_count: missingInDb,
      missing_in_paddle_count: missingInPaddle,
      amount_mismatch_count: amountMismatch,
      paddle_total_cents: paddleTotal,
      db_total_cents: dbTotal,
      drift_cents: drift,
      summary: { triggered_by: triggeredBy, hours },
    }).eq("id", runId);

    await supabase.from("payment_audit_log").insert({
      environment: env,
      event_type: status === "ok" ? "reconciliation.ok" : "reconciliation.discrepancies",
      actor: "reconciler", actor_id: triggeredBy,
      severity: status === "ok" ? "info" : (drift !== 0 || missingInDb > 0 ? "critical" : "warn"),
      notes: `Window ${from.toISOString()} → ${to.toISOString()}. Paddle ${paddleTxns.length} txns / DB ${dbEvents?.length ?? 0}. Drift ${drift} cents.`,
      after_state: { run_id: runId, paddle_total: paddleTotal, db_total: dbTotal, drift_cents: drift, discrepancies: discrepancies.length },
    });

    // Notify super-admins on any critical issue
    if (status !== "ok" && (drift !== 0 || missingInDb > 0)) {
      const { data: admins } = await supabase.from("ssra_profiles").select("id").eq("role", "super_admin");
      if (admins?.length) {
        await supabase.from("ssra_notifications").insert(admins.map(a => ({
          user_id: a.id,
          type: "payment_audit_alert",
          title: `Payment reconciliation found ${discrepancies.length} discrepancy(ies)`,
          body: `Env: ${env}. Drift: ${(drift/100).toFixed(2)} EUR. Review the Financial Audit page.`,
          link: "/ssra-admin/financial-audit",
        })));
      }
    }

    return { runId, status, paddleTotal, dbTotal, drift, discrepancies: discrepancies.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("payment_reconciliation_runs").update({
      finished_at: new Date().toISOString(), status: "failed", error: msg,
    }).eq("id", runId);
    await supabase.from("payment_audit_log").insert({
      environment: env, event_type: "reconciliation.failed",
      actor: "reconciler", severity: "critical", notes: msg, after_state: { run_id: runId },
    });
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const env: PaddleEnv = body.environment === "live" ? "live" : "sandbox";
    const hours = Number(body.hours) > 0 ? Number(body.hours) : 2;
    const triggeredBy = body.triggered_by ?? "manual";

    // Auth: service_role bearer (cron) or super_admin JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isService = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isService) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
      const { data: p } = await supabase.from("ssra_profiles").select("role").eq("id", user.id).single();
      if (p?.role !== "super_admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });
    }

    const out = await runReconcile(env, hours, triggeredBy);
    return new Response(JSON.stringify({ ok: true, ...out }), { headers: CORS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: CORS });
  }
});
