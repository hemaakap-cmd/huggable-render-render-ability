import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw,
  Users, BookOpen, Bell, ShieldAlert, Database, Mail, CreditCard,
  Wifi, Server,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useSystemHealth, useServiceHealth } from "@/hooks/useSsraData";

/* ── Score ring ─────────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${c}`} strokeDashoffset={`${offset}`} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display text-slate-900">{score}</span>
        <span className="text-xs text-slate-400 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ── Service status badge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === "ok")
    return <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold"><CheckCircle2 className="w-4 h-4" />OK</span>;
  if (status === "degraded")
    return <span className="flex items-center gap-1 text-amber-600 text-sm font-semibold"><AlertTriangle className="w-4 h-4" />Degraded</span>;
  return <span className="flex items-center gap-1 text-red-600 text-sm font-semibold"><XCircle className="w-4 h-4" />Down</span>;
}

/* ── Service card ───────────────────────────────────────────────── */
interface ServiceCardProps {
  icon: React.ReactNode;
  label: string;
  status: string;
  latencyMs?: number;
  detail?: string;
}
function ServiceCard({ icon, label, status, latencyMs, detail }: ServiceCardProps) {
  const border = status === "ok" ? "border-slate-200" : status === "degraded" ? "border-amber-200" : "border-red-200";
  const bg     = status === "ok" ? "bg-white" : status === "degraded" ? "bg-amber-50" : "bg-red-50";
  return (
    <div className={`border ${border} ${bg} rounded-2xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          {icon}
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <StatusBadge status={status} />
      </div>
      {latencyMs !== undefined && (
        <div className="text-xs text-slate-500">{latencyMs} ms response time</div>
      )}
      {detail && <div className="text-xs text-slate-500 truncate" title={detail}>{detail}</div>}
    </div>
  );
}

/* ── Metric card ────────────────────────────────────────────────── */
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "ok" | "warn" | "danger";
}
function MetricCard({ icon, label, value, sub, status = "ok" }: MetricCardProps) {
  const bg   = status === "danger" ? "bg-red-50 border-red-100" : status === "warn" ? "bg-amber-50 border-amber-100" : "bg-white border-slate-200";
  const text = status === "danger" ? "text-red-700" : status === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className={`border rounded-2xl p-5 ${bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`${text} opacity-70`}>{icon}</div>
        <div className={`text-xs font-semibold uppercase tracking-wide ${text} opacity-70`}>{label}</div>
      </div>
      <div className={`text-3xl font-bold font-display ${text}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${text} opacity-60`}>{sub}</div>}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function AdminSystemHealth() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth, isFetching: healthFetching } = useSystemHealth();
  const { data: svc,    isLoading: svcLoading,    refetch: refetchSvc,   isFetching: svcFetching }     = useServiceHealth();

  const isFetching = healthFetching || svcFetching;
  const refetch    = () => { refetchHealth(); refetchSvc(); };

  const score         = (health as any)?.healthScore         ?? 0;
  const enrollments   = (health as any)?.enrollments24h      ?? 0;
  const openFraud     = (health as any)?.openFraudFlags      ?? 0;
  const criticalFraud = (health as any)?.criticalFraud       ?? 0;
  const highFraud     = (health as any)?.highFraud           ?? 0;
  const pendingHw     = (health as any)?.pendingHomework     ?? 0;
  const notifications = (health as any)?.unreadNotifications ?? 0;
  const waitlist      = (health as any)?.studentsOnWaitlist  ?? 0;

  const systemStatus = score >= 80 ? "Healthy" : score >= 60 ? "Degraded" : "Critical";
  const statusColor  = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

  const overallSvc = svc?.status ?? "unknown";
  const services   = svc?.services ?? {};
  const metrics    = svc?.metrics;

  // Build a simple 24h trend from the single data point we have
  // (in production this would be a time-series query; here we show the current snapshot)
  const trendData = metrics ? [
    { name: "Now", failed: metrics.failedEmails24h + metrics.dlqEmails24h, webhookFail: metrics.webhookFailed24h },
  ] : [];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-[hsl(220,91%,54%)]" />
              System Health
            </h1>
            <p className="text-slate-500 text-sm mt-1">Real-time platform status and operational metrics. Super Admin only.</p>
          </div>
          <button onClick={refetch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Overall service status banner */}
        {!svcLoading && (
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold border ${
            overallSvc === "ok"       ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            overallSvc === "degraded" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                        "bg-red-50 border-red-200 text-red-700"
          }`}>
            {overallSvc === "ok" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            All services {overallSvc === "ok" ? "operational" : overallSvc === "degraded" ? "partially degraded" : "one or more services down"}
            {svc?.responseTimeMs !== undefined && (
              <span className="ml-auto font-normal opacity-70">Health check: {svc.responseTimeMs} ms</span>
            )}
          </div>
        )}

        {/* Service status grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ServiceCard icon={<Database className="w-4 h-4" />} label="Database"
            status={(services as any).database?.status ?? "unknown"}
            latencyMs={(services as any).database?.latencyMs}
            detail={(services as any).database?.detail} />
          <ServiceCard icon={<Wifi className="w-4 h-4" />} label="Auth"
            status={(services as any).auth?.status ?? "unknown"}
            latencyMs={(services as any).auth?.latencyMs}
            detail={(services as any).auth?.detail} />
          <ServiceCard icon={<Mail className="w-4 h-4" />} label="Email Queue"
            status={(services as any).email?.status ?? "unknown"}
            detail={(services as any).email?.detail} />
          <ServiceCard icon={<CreditCard className="w-4 h-4" />} label="Payments"
            status={(services as any).payments?.status ?? "unknown"}
            detail={(services as any).payments?.detail} />
        </div>

        {/* Health score + status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-8">
          <ScoreRing score={score} />
          <div>
            <div className={`text-2xl font-bold font-display ${statusColor}`}>{systemStatus}</div>
            <div className="text-slate-500 text-sm mt-1">Overall platform health score</div>
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-slate-600">≥ 80 Healthy</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500 rounded-full" /><span className="text-slate-600">60–79 Degraded</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-slate-600">&lt; 60 Critical</span></span>
            </div>
          </div>
        </div>

        {healthLoading ? (
          <div className="text-center py-10 text-slate-400">Loading metrics…</div>
        ) : (
          <>
            {/* Alerts */}
            {criticalFraud > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700 text-sm font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {criticalFraud} critical fraud flag{criticalFraud > 1 ? "s" : ""} — immediate action required
              </div>
            )}
            {pendingHw > 20 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {pendingHw} homework submissions waiting for grading
              </div>
            )}
            {metrics && (metrics.failedEmails24h + metrics.dlqEmails24h) > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {metrics.failedEmails24h + metrics.dlqEmails24h} failed / DLQ emails in the last 24 h
              </div>
            )}
            {metrics && metrics.webhookFailed24h > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {metrics.webhookFailed24h} failed Paddle webhook{metrics.webhookFailed24h > 1 ? "s" : ""} in the last 24 h
              </div>
            )}

            {/* Metric grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard icon={<Users className="w-5 h-5" />} label="Enrollments (24h)" value={enrollments} sub="New today"
                status={enrollments > 50 ? "warn" : "ok"} />
              <MetricCard icon={<ShieldAlert className="w-5 h-5" />} label="Open Fraud Flags" value={openFraud}
                sub={`${criticalFraud} critical, ${highFraud} high`}
                status={criticalFraud > 0 ? "danger" : highFraud > 0 ? "warn" : "ok"} />
              <MetricCard icon={<BookOpen className="w-5 h-5" />} label="Pending Homework" value={pendingHw}
                sub="Awaiting grading" status={pendingHw > 20 ? "warn" : "ok"} />
              <MetricCard icon={<Bell className="w-5 h-5" />} label="Unread Notifications" value={notifications} sub="System-wide" />
              <MetricCard icon={<Clock className="w-5 h-5" />} label="On Waitlist" value={waitlist}
                sub="Awaiting a spot" status={waitlist > 10 ? "warn" : "ok"} />
              {metrics && (
                <MetricCard icon={<Mail className="w-5 h-5" />} label="Failed Emails (24h)"
                  value={metrics.failedEmails24h + metrics.dlqEmails24h}
                  sub={`${metrics.dlqEmails24h} in DLQ`}
                  status={(metrics.failedEmails24h + metrics.dlqEmails24h) > 5 ? "danger" :
                          (metrics.failedEmails24h + metrics.dlqEmails24h) > 0 ? "warn" : "ok"} />
              )}
              {metrics && (
                <MetricCard icon={<Server className="w-5 h-5" />} label="Webhooks (24h)"
                  value={`${metrics.webhookSuccess24h} / ${metrics.webhookSuccess24h + metrics.webhookFailed24h}`}
                  sub={`${metrics.webhookFailed24h} failed`}
                  status={metrics.webhookFailed24h > 0 ? "warn" : "ok"} />
              )}
              <MetricCard icon={<CheckCircle2 className="w-5 h-5" />} label="Health Score"
                value={`${score}/100`} sub={systemStatus}
                status={score >= 80 ? "ok" : score >= 60 ? "warn" : "danger"} />
            </div>

            {/* 24h activity chart */}
            {metrics && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">24h Activity Snapshot</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{metrics.enrollments24h}</div>
                    <div className="text-xs text-slate-500 mt-0.5">New enrollments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{metrics.webhookSuccess24h}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Webhooks processed</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${metrics.webhookFailed24h > 0 ? "text-red-600" : "text-slate-900"}`}>{metrics.webhookFailed24h}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Failed webhooks</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${(metrics.failedEmails24h + metrics.dlqEmails24h) > 0 ? "text-red-600" : "text-slate-900"}`}>
                      {metrics.failedEmails24h + metrics.dlqEmails24h}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Failed emails</div>
                  </div>
                </div>
              </div>
            )}

            {/* Score breakdown */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Score Breakdown</div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>No critical fraud flags</span>
                  <span className={criticalFraud === 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                    {criticalFraud === 0 ? "+30" : "−30 applied"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>No high fraud flags</span>
                  <span className={highFraud === 0 ? "text-emerald-600 font-semibold" : "text-amber-500 font-semibold"}>
                    {highFraud === 0 ? "+20" : `−${highFraud * 5} applied`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Homework backlog under 20</span>
                  <span className={pendingHw <= 20 ? "text-emerald-600 font-semibold" : "text-amber-500 font-semibold"}>
                    {pendingHw <= 20 ? "+20" : "−10 applied"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Waitlist under 10 students</span>
                  <span className={waitlist <= 10 ? "text-emerald-600 font-semibold" : "text-amber-500 font-semibold"}>
                    {waitlist <= 10 ? "+20" : "−5 applied"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recent enrollment activity (24h)</span>
                  <span className="text-emerald-600 font-semibold">+10 base</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
