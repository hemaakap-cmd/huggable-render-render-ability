import { Activity, AlertTriangle, CheckCircle2, Users, BookOpen, Bell, Clock, ShieldAlert, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useSystemHealth } from "@/hooks/useSsraData";

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="56" cy="56" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${c}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-display text-slate-900">{score}</span>
        <span className="text-xs text-slate-400 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "ok" | "warn" | "danger";
}
function MetricCard({ icon, label, value, sub, status = "ok" }: MetricCardProps) {
  const bg = status === "danger" ? "bg-red-50 border-red-100" : status === "warn" ? "bg-amber-50 border-amber-100" : "bg-white border-slate-200";
  const textColor = status === "danger" ? "text-red-700" : status === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className={`border rounded-2xl p-5 ${bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`${textColor} opacity-70`}>{icon}</div>
        <div className={`text-xs font-semibold uppercase tracking-wide ${textColor} opacity-70`}>{label}</div>
      </div>
      <div className={`text-3xl font-bold font-display ${textColor}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${textColor} opacity-60`}>{sub}</div>}
    </div>
  );
}

export default function AdminSystemHealth() {
  const { data: health, isLoading, refetch, isFetching } = useSystemHealth();

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

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-[hsl(220,91%,54%)]" />
              System Health
            </h1>
            <p className="text-slate-500 text-sm mt-1">Real-time platform status and operational metrics.</p>
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Health score + status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-8">
          <ScoreRing score={score} />
          <div>
            <div className={`text-2xl font-bold font-display ${statusColor}`}>{systemStatus}</div>
            <div className="text-slate-500 text-sm mt-1">Overall platform health score</div>
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-slate-600">≥ 80 Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-slate-600">60–79 Degraded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-slate-600">&lt; 60 Critical</span>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Loading metrics…</div>
        ) : (
          <>
            {/* Alert banners */}
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

            {/* Metric grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<Users className="w-5 h-5" />}
                label="Enrollments (24h)"
                value={enrollments}
                sub="New enrollments today"
                status={enrollments > 50 ? "warn" : "ok"}
              />
              <MetricCard
                icon={<ShieldAlert className="w-5 h-5" />}
                label="Open Fraud Flags"
                value={openFraud}
                sub={`${criticalFraud} critical, ${highFraud} high`}
                status={criticalFraud > 0 ? "danger" : highFraud > 0 ? "warn" : "ok"}
              />
              <MetricCard
                icon={<BookOpen className="w-5 h-5" />}
                label="Pending Homework"
                value={pendingHw}
                sub="Submissions awaiting grading"
                status={pendingHw > 20 ? "warn" : "ok"}
              />
              <MetricCard
                icon={<Bell className="w-5 h-5" />}
                label="Unread Notifications"
                value={notifications}
                sub="System-wide unread count"
                status="ok"
              />
              <MetricCard
                icon={<Clock className="w-5 h-5" />}
                label="On Waitlist"
                value={waitlist}
                sub="Students awaiting a spot"
                status={waitlist > 10 ? "warn" : "ok"}
              />
              <MetricCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Health Score"
                value={`${score}/100`}
                sub={systemStatus}
                status={score >= 80 ? "ok" : score >= 60 ? "warn" : "danger"}
              />
            </div>

            {/* Score breakdown explanation */}
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
                  <span>No unresolved high fraud flags</span>
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
