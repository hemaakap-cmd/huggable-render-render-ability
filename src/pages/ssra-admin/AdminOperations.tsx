import { useState } from "react";
import { AlertTriangle, RefreshCw, Search, Mail, Zap, Clock } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useFailedEmails, useStaleEnrollments, useWebhookEvents } from "@/hooks/useSsraData";
import { Input } from "@/components/ui/input";

type Tab = "emails" | "enrollments" | "webhooks";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    failed:    "bg-red-100 text-red-700 border-red-200",
    bounced:   "bg-orange-100 text-orange-700 border-orange-200",
    dlq:       "bg-red-200 text-red-800 border-red-300",
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    processed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    skipped:   "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={99} className="text-center py-10 text-slate-400 text-sm">{message}</td>
    </tr>
  );
}

/* ── Failed Emails tab ──────────────────────────────────────────── */
function FailedEmailsTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, refetch, isFetching } = useFailedEmails(200);

  const filtered = data.filter(r =>
    !search ||
    r.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
    (r.template_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.subject ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search recipient, template, subject…" className="pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {["Recipient", "Template", "Status", "Retries", "Error", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0
                ? <EmptyRow message="No failed emails — great!" />
                : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.recipient_email}</td>
                    <td className="px-4 py-3 text-slate-600">{r.template_name}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{r.retry_count}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={r.error_message ?? ""}>{r.error_message ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Stale Enrollments tab ──────────────────────────────────────── */
function StaleEnrollmentsTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, refetch, isFetching } = useStaleEnrollments(2, 200);

  const filtered = data.filter(r =>
    !search ||
    (r.student_name_snapshot ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.student_email_snapshot ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.course_title_snapshot ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search student, email, course…" className="pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        These enrollments are &gt; 2 hours in "pending" status, which usually indicates a missed Paddle webhook.
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {["Student", "Email", "Course", "Amount", "Paddle Txn", "Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0
                ? <EmptyRow message="No stale enrollments — payment webhooks are healthy!" />
                : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.student_name_snapshot ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.student_email_snapshot ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.course_title_snapshot ?? r.course_id}</td>
                    <td className="px-4 py-3 text-slate-600">€{r.amount_eur ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.stripe_payment_intent ?? "none"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Webhook Events tab ─────────────────────────────────────────── */
function WebhookEventsTab() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "failed" | "skipped">("all");
  const { data = [], isLoading, refetch, isFetching } = useWebhookEvents(300);

  const filtered = data.filter(r => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch = !search ||
      r.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (r.event_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.environment.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const failCount = data.filter(r => r.status === "failed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search event type, ID, env…" className="pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {(["all", "processed", "failed", "skipped"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterStatus === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      {failCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {failCount} failed webhook{failCount > 1 ? "s" : ""} — check for missed enrollment activations
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-slate-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {["Event Type", "Status", "Env", "Paddle Event ID", "Error", "Processed At"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0
                ? <EmptyRow message="No webhook events match the current filter." />
                : filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.status === "failed" ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.event_type}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        r.environment === "live" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>{r.environment}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono truncate max-w-xs">{r.event_id ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate" title={r.error_message ?? ""}>{r.error_message ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(r.processed_at).toLocaleString()}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function AdminOperations() {
  const [tab, setTab] = useState<Tab>("emails");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "emails",      label: "Failed Emails",       icon: <Mail className="w-4 h-4" /> },
    { id: "enrollments", label: "Stale Enrollments",   icon: <Clock className="w-4 h-4" /> },
    { id: "webhooks",    label: "Webhook Events",       icon: <Webhook className="w-4 h-4" /> },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Failed Operations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track and diagnose failed emails, stale pending enrollments, and webhook processing errors. Super Admin only.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "emails"      && <FailedEmailsTab />}
        {tab === "enrollments" && <StaleEnrollmentsTab />}
        {tab === "webhooks"    && <WebhookEventsTab />}
      </div>
    </AdminLayout>
  );
}
