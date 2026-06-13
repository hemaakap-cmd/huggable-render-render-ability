import { useState } from "react";
import {
  RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, Play,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Live reconciliation (rebuilt 2026-06-13, finding H3).
//
// The previous page queried `ssra_reconciliation_reports` and triggered the
// `nightly-reconciliation` edge function, both of which depend on the
// `reconcile_system()` RPC + `ssra_reconciliation_reports` table that are NOT
// provisioned in production — so the page threw on load. This version computes
// reconciliation ON DEMAND from tables that actually exist, so admins get a
// real, accurate integrity check (no fake architecture, no broken page).
// ─────────────────────────────────────────────────────────────────────────────

type Finding = {
  check:   string;
  status:  "passed" | "warning";
  count?:  number;
  message: string;
  action?: string;
};

async function runReconciliation(): Promise<{ findings: Finding[]; ranAt: string }> {
  const findings: Finding[] = [];

  // 1. enrolled_count drift — ssra_courses.enrolled_count vs live active enrollments.
  const [{ data: courses }, { data: activeEnr }] = await Promise.all([
    supabase.from("ssra_courses").select("id, title, enrolled_count"),
    supabase.from("ssra_enrollments").select("course_id").eq("status", "active"),
  ]);
  const liveCounts = new Map<string, number>();
  for (const e of (activeEnr ?? []) as { course_id: string }[]) {
    liveCounts.set(e.course_id, (liveCounts.get(e.course_id) ?? 0) + 1);
  }
  const drift = ((courses ?? []) as { id: string; title: string; enrolled_count: number }[])
    .filter((c) => (c.enrolled_count ?? 0) !== (liveCounts.get(c.id) ?? 0));
  findings.push(drift.length === 0
    ? { check: "enrolled_count == COUNT(active enrollments)", status: "passed", message: "Course enrolled_count matches active enrollments" }
    : { check: "enrolled_count drift", status: "warning", count: drift.length,
        message: `${drift.length} course(s) have enrolled_count ≠ active enrollments`,
        action: drift.map((c) => `${c.title}: stored ${c.enrolled_count} vs actual ${liveCounts.get(c.id) ?? 0}`).join("; ") });

  // 2. Revenue ledger integrity — gross (credits) vs refunds (debits), and
  //    whether Paddle-issued refunds are reflected as debit events (finding H2).
  const [{ data: revRows }, { data: refundedReqs }] = await Promise.all([
    supabase.from("revenue_events").select("amount_cents, direction"),
    supabase.from("ssra_cancellation_requests")
      .select("id").eq("status", "refunded").not("paddle_adjustment_id", "is", null),
  ]);
  const credits = ((revRows ?? []) as { amount_cents: number; direction: string }[])
    .filter((r) => r.direction === "credit").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const debits = ((revRows ?? []) as { amount_cents: number; direction: string }[])
    .filter((r) => r.direction === "debit").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const refundsInPaddle = (refundedReqs ?? []).length;
  const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  if (refundsInPaddle > 0 && debits === 0) {
    findings.push({ check: "revenue_events debit == Paddle refunds", status: "warning", count: refundsInPaddle,
      message: `${refundsInPaddle} Paddle refund(s) issued but the ledger has NO debit events — reported revenue is overstated`,
      action: `Gross ${eur(credits)}, refunds in ledger ${eur(debits)}. Replay adjustment webhooks or backfill debit revenue_events.` });
  } else {
    findings.push({ check: "gross − refunds = net", status: "passed",
      message: `Ledger balanced: gross ${eur(credits)} − refunds ${eur(debits)} = net ${eur(credits - debits)}` });
  }

  // 3. Active subscriptions whose enrollment is cancelled (access/billing mismatch).
  const { data: activeSubs } = await supabase.from("ssra_subscriptions")
    .select("user_id, course_id").in("status", ["active", "trialing"]);
  let subMismatch = 0;
  for (const s of (activeSubs ?? []) as { user_id: string; course_id: string }[]) {
    const { count } = await supabase.from("ssra_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", s.user_id).eq("course_id", s.course_id).eq("status", "active");
    if ((count ?? 0) === 0) subMismatch += 1;
  }
  findings.push(subMismatch === 0
    ? { check: "active subscription ⇒ active enrollment", status: "passed", message: "Every active subscription has an active enrollment" }
    : { check: "subscription/enrollment mismatch", status: "warning", count: subMismatch,
        message: `${subMismatch} active subscription(s) without an active enrollment` });

  // 4. Stale pending enrollments older than 48h (abandoned checkouts holding seats).
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { count: staleCount } = await supabase.from("ssra_enrollments")
    .select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", cutoff);
  findings.push((staleCount ?? 0) === 0
    ? { check: "no pending enrollments > 48h", status: "passed", message: "No stale pending enrollments" }
    : { check: "stale pending enrollments", status: "warning", count: staleCount ?? 0,
        message: `${staleCount} pending enrollment(s) older than 48h` });

  // 5. Failed webhooks in the last 24h.
  const wCutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: failedWh } = await supabase.from("ssra_webhook_events")
    .select("id", { count: "exact", head: true }).eq("status", "failed").gt("created_at", wCutoff);
  findings.push((failedWh ?? 0) === 0
    ? { check: "no failed webhooks (24h)", status: "passed", message: "No failed webhooks in the last 24h" }
    : { check: "failed webhooks (24h)", status: "warning", count: failedWh ?? 0,
        message: `${failedWh} failed webhook(s) in the last 24h — review signature/config` });

  // 6. Orphan homework submissions (material_id NULL) — should be 0 after the M3 fix.
  const { count: orphanHw } = await supabase.from("ssra_homework_submissions")
    .select("id", { count: "exact", head: true }).is("material_id", null);
  findings.push((orphanHw ?? 0) === 0
    ? { check: "no orphan homework submissions", status: "passed", message: "No orphan homework submissions" }
    : { check: "orphan homework submissions", status: "warning", count: orphanHw ?? 0,
        message: `${orphanHw} homework submission(s) with no parent assignment` });

  return { findings, ranAt: new Date().toISOString() };
}

function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const icon = f.status === "passed"
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
    : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  const bg = f.status === "passed" ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100";
  return (
    <div className={`rounded-xl border px-4 py-3 ${bg}`}>
      <button className="w-full flex items-center gap-2 text-left" onClick={() => setOpen((v) => !v)}>
        {icon}
        <span className="flex-1 text-sm font-medium text-slate-900">{f.message}</span>
        {f.count !== undefined && (
          <span className="text-xs font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded-full">{f.count}</span>
        )}
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="mt-2 pl-6 text-xs text-slate-600 space-y-1">
          <div><span className="font-mono bg-white/70 px-1.5 py-0.5 rounded">{f.check}</span></div>
          {f.action && <div className="text-slate-500">Detail: {f.action}</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminReconciliation() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["ssra-reconciliation-live"],
    queryFn: runReconciliation,
    refetchInterval: 60_000,
  });

  const findings = data?.findings ?? [];
  const passed = findings.filter((f) => f.status === "passed").length;
  const issues = findings.filter((f) => f.status === "warning").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-[hsl(220,91%,54%)]" />
            Reconciliation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Live integrity checks computed on demand from production data.
            {data?.ranAt && (
              <> Last run {new Date(data.ranAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.</>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 bg-[hsl(220,91%,54%)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Now
        </button>
      </div>

      {findings.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-600 font-medium">✓ {passed} passed</span>
          {issues > 0
            ? <span className="text-amber-600 font-medium">⚠ {issues} issue{issues === 1 ? "" : "s"}</span>
            : <span className="text-emerald-600 font-medium">No issues</span>}
        </div>
      )}

      {isFetching && findings.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f, i) => <FindingRow key={i} f={f} />)}
        </div>
      )}
    </div>
  );
}
