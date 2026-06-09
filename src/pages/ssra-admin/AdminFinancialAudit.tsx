import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, AlertTriangle, RefreshCw, Play, CheckCircle2, XCircle, Clock } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Env = "live" | "sandbox";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; icon: any }> = {
    ok:            { c: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    discrepancies: { c: "bg-amber-100 text-amber-700",     icon: AlertTriangle },
    failed:        { c: "bg-red-100 text-red-700",         icon: XCircle },
    running:       { c: "bg-blue-100 text-blue-700",       icon: Clock },
  };
  const s = map[status] ?? map.running;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.c}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

export default function AdminFinancialAudit() {
  const { isSuperAdmin, loading } = useSsraAuth();
  const [env, setEnv] = useState<Env>("live");
  const [health, setHealth] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [disc, setDisc] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [integrity, setIntegrity] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: h }, { data: r }, { data: d }, { data: a }, { data: i }] = await Promise.all([
      supabase.rpc("get_audit_health", { _env: env }),
      supabase.from("payment_reconciliation_runs").select("*").eq("environment", env).order("started_at", { ascending: false }).limit(25),
      supabase.from("payment_discrepancies").select("*").eq("environment", env).is("resolved_at", null).order("created_at", { ascending: false }).limit(50),
      supabase.from("payment_audit_log").select("*").eq("environment", env).order("occurred_at", { ascending: false }).limit(50),
      supabase.from("data_integrity_checks").select("*").limit(50),
    ]);
    setHealth(h);
    setRuns(r ?? []);
    setDisc(d ?? []);
    setAudit(a ?? []);
    setIntegrity(i ?? []);
  }, [env]);

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin, load]);

  const runNow = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("payments-reconcile", {
        body: { environment: env, hours: 24, triggered_by: "manual-ui" },
      });
      if (error) throw error;
      toast.success(`Reconciliation done: ${data?.status ?? "ok"}`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Reconciliation failed");
    } finally { setBusy(false); }
  };

  const resolve = async (id: string) => {
    const notes = prompt("Resolution notes:") ?? "";
    const { error } = await supabase.rpc("mark_discrepancy_resolved", { _id: id, _notes: notes });
    if (error) toast.error(error.message); else { toast.success("Resolved"); load(); }
  };

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  const lastRun = health?.last_run;
  const headlineOk = lastRun?.status === "ok" && (health?.open_discrepancies ?? 0) === 0 && (health?.integrity_issues ?? 0) === 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" /> Financial Audit & Reconciliation
            </h1>
            <p className="text-sm text-slate-500">Compare Paddle (source of truth) against the database, continuously.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              {(["live","sandbox"] as Env[]).map(e => (
                <button key={e} onClick={() => setEnv(e)}
                  className={`px-3 py-1.5 text-sm font-medium ${env === e ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>
                  {e === "live" ? "Live" : "Test"}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={runNow} disabled={busy}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
              <Play className="w-4 h-4" /> {busy ? "Running…" : "Run reconciliation now"}
            </button>
          </div>
        </div>

        {/* Health banner */}
        <div className={`rounded-2xl p-5 border ${headlineOk ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start gap-3">
            {headlineOk ? <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" /> : <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />}
            <div className="flex-1">
              <div className="font-semibold text-slate-900">
                {headlineOk ? "All checks passing" : "Action required"}
              </div>
              <div className="text-sm text-slate-600 mt-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="font-mono">{lastRun?.status ?? "—"}</span> last run</div>
                <div><span className="font-mono">{health?.open_discrepancies ?? 0}</span> open discrepancies</div>
                <div><span className="font-mono">{health?.integrity_issues ?? 0}</span> integrity issues</div>
                <div><span className="font-mono">{((lastRun?.drift_cents ?? 0)/100).toFixed(2)}€</span> last drift</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reconciliation runs */}
        <section className="bg-white border border-slate-200 rounded-2xl">
          <div className="px-5 py-3 border-b border-slate-200 font-semibold">Recent reconciliation runs</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="text-left p-3">Started</th><th className="text-left p-3">Status</th><th className="text-right p-3">Paddle</th><th className="text-right p-3">DB</th><th className="text-right p-3">Drift</th><th className="text-right p-3">Issues</th><th className="text-left p-3">Triggered by</th></tr>
              </thead>
              <tbody>
                {runs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">No runs yet.</td></tr>}
                {runs.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-3">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="p-3"><StatusPill status={r.status} /></td>
                    <td className="p-3 text-right font-mono">{(r.paddle_total_cents/100).toFixed(2)}€ <span className="text-slate-400 text-xs">({r.paddle_txn_count})</span></td>
                    <td className="p-3 text-right font-mono">{(r.db_total_cents/100).toFixed(2)}€ <span className="text-slate-400 text-xs">({r.db_event_count})</span></td>
                    <td className={`p-3 text-right font-mono ${r.drift_cents !== 0 ? "text-red-600 font-bold" : ""}`}>{(r.drift_cents/100).toFixed(2)}€</td>
                    <td className="p-3 text-right">{(r.missing_in_db_count + r.missing_in_paddle_count + r.amount_mismatch_count) || "—"}</td>
                    <td className="p-3 text-slate-500">{r.triggered_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Open discrepancies */}
        <section className="bg-white border border-slate-200 rounded-2xl">
          <div className="px-5 py-3 border-b border-slate-200 font-semibold flex items-center justify-between">
            <span>Open discrepancies</span>
            <span className="text-xs text-slate-500">{disc.length} unresolved</span>
          </div>
          <div className="divide-y divide-slate-100">
            {disc.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Nothing to review.</div>}
            {disc.map(d => (
              <div key={d.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{d.severity}</span>
                    <span className="text-xs font-mono text-slate-600">{d.type}</span>
                    <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-700">{d.description}</div>
                  <div className="text-xs text-slate-500 mt-1 font-mono break-all">
                    {d.paddle_id && <>Paddle: {d.paddle_id} </>}
                    {d.db_id && <>DB: {d.db_id}</>}
                  </div>
                </div>
                <button onClick={() => resolve(d.id)} className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-700">Resolve</button>
              </div>
            ))}
          </div>
        </section>

        {/* Data integrity */}
        <section className="bg-white border border-slate-200 rounded-2xl">
          <div className="px-5 py-3 border-b border-slate-200 font-semibold">Data integrity checks</div>
          <div className="divide-y divide-slate-100">
            {integrity.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">All clean.</div>}
            {integrity.map((row, i) => (
              <div key={i} className="p-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">{row.check_type}</span>
                  <span className="text-xs text-slate-400">{row.detected_for && new Date(row.detected_for).toLocaleString()}</span>
                </div>
                <div className="text-xs font-mono text-slate-600 break-all">{row.resource_id}</div>
                <pre className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{JSON.stringify(row.details, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>

        {/* Audit log feed */}
        <section className="bg-white border border-slate-200 rounded-2xl">
          <div className="px-5 py-3 border-b border-slate-200 font-semibold">Audit log (latest 50)</div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {audit.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Empty.</div>}
            {audit.map(e => (
              <div key={e.id} className="p-3 text-sm flex items-start gap-3">
                <span className={`mt-0.5 w-2 h-2 rounded-full ${e.severity === "critical" ? "bg-red-500" : e.severity === "warn" ? "bg-amber-500" : "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{e.event_type}</span>
                    <span>·</span>
                    <span>{e.actor}</span>
                    <span>·</span>
                    <span>{new Date(e.occurred_at).toLocaleString()}</span>
                  </div>
                  {e.notes && <div className="text-slate-700 mt-0.5">{e.notes}</div>}
                  {e.amount_cents != null && <div className="text-xs text-slate-500 font-mono">{(e.amount_cents/100).toFixed(2)} {e.currency} ({e.direction})</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
