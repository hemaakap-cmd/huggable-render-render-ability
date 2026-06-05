import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, ShieldCheck, Clock, CheckCircle2, XCircle,
  ArrowRight, Video, TrendingUp, BookOpen, UserCheck, AlertTriangle, Info,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import AdminLayout from "@/components/ssra/AdminLayout";
import {
  useAdminStats, useAdminVerifications, useAdminEnrollments,
  useStudentGrowth, useAdminSessions, useOperationalAlerts,
} from "@/hooks/useSsraData";

const PIE_COLORS = {
  pending:  "hsl(43,96%,50%)",
  approved: "hsl(160,84%,39%)",
  rejected: "hsl(0,84%,60%)",
};

function KpiCard({ icon: Icon, label, value, sub, color, href }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; href?: string;
}) {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all group h-full">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {href && <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />}
      </div>
      <div className="text-2xl font-bold font-display text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: verificationsPage }              = useAdminVerifications("all");
  const { data: pendingVerifPage }               = useAdminVerifications("pending");
  const { data: enrollments = [] }               = useAdminEnrollments();
  const { data: growth = [] }                    = useStudentGrowth();
  const { data: sessions = [] }                  = useAdminSessions();
  const { data: opAlerts = [] }                  = useOperationalAlerts();
  const verifications = verificationsPage?.rows ?? [];
  const pendingVerif = pendingVerifPage?.rows ?? [];

  /* Verification status breakdown for pie chart */
  const verifPie = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const v of verifications) {
      if (v.status in counts) counts[v.status]++;
    }
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([name, value]) => ({ name, value }));
  }, [verifications]);

  /* Recent activity: last 8 enrollments + last 4 verifications */
  const recentActivity = useMemo(() => {
    const enrolItems = (enrollments as any[]).slice(0, 8).map((e) => ({
      id: e.id, type: "enrollment",
      name: e.ssra_profiles?.full_name ?? e.ssra_profiles?.email ?? "Unknown",
      detail: e.ssra_courses?.title ?? "—",
      status: e.status,
      date: e.enrolled_at,
    }));
    const verifItems = verifications.slice(0, 4).map((v) => ({
      id: v.id, type: "verification",
      name: v.full_name ?? "Unknown",
      detail: `${v.country} · ${v.degree}`,
      status: v.status,
      date: v.created_at,
    }));
    return [...enrolItems, ...verifItems]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 10);
  }, [enrollments, verifications]);

  /* Upcoming sessions */
  const upcomingSessions = useMemo(() =>
    (sessions as any[])
      .filter((s) => !s.is_cancelled && new Date(s.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 4),
  [sessions]);

  const v = statsLoading ? "…" : "";
  const totalStudents = v || (stats?.totalStudents ?? 0);
  const pendingCount  = v || (stats?.pendingVerifications ?? 0);
  const activeSubs    = v || (stats?.activeSubscriptions ?? 0);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Student Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of student activity, verifications, and sessions.</p>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users}     label="Total Students"        value={totalStudents} color="bg-blue-100 text-[hsl(220,91%,54%)]" href="/ssra-admin/students" />
          <KpiCard icon={ShieldCheck} label="Pending Verifications" value={pendingCount} color="bg-amber-100 text-amber-600" href="/ssra-admin/verifications" sub="Need review" />
          <KpiCard icon={UserCheck} label="Active Subscriptions"  value={activeSubs}   color="bg-emerald-100 text-emerald-600" href="/ssra-admin/enrollments" />
          <KpiCard icon={Video}     label="Upcoming Sessions"     value={upcomingSessions.length} color="bg-violet-100 text-violet-600" href="/ssra-admin/sessions" />
        </div>

        {/* Operational alerts */}
        {opAlerts.length > 0 && (
          <div className="space-y-2">
            {opAlerts.map((alert, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                alert.level === "warn"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}>
                {alert.level === "warn"
                  ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                <span className="flex-1">{alert.message}</span>
                {alert.href && (
                  <Link to={alert.href} className="font-semibold hover:underline shrink-0">Fix →</Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Student growth — line chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[hsl(220,91%,54%)]" /> Student Growth (8 months)
              </h2>
            </div>
            {growth.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number) => [v, "New students"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="students" stroke="hsl(220,91%,54%)" strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(220,91%,54%)" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Verification funnel — pie chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" /> Verification Status
            </h2>
            {verifPie.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-300 text-sm">No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={verifPie} dataKey="value" cx="50%" cy="50%" outerRadius={65}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {verifPie.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {verifPie.map((e) => (
                    <span key={e.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[e.name as keyof typeof PIE_COLORS] }} />
                      {e.name} ({e.value})
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending verifications quick-list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 text-sm">Pending Verifications</h2>
              <Link to="/ssra-admin/verifications" className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline">
                View all
              </Link>
            </div>
            {pendingVerif.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <div className="text-slate-400 text-sm">All caught up!</div>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingVerif.slice(0, 5).map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                      {v.full_name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{v.full_name}</div>
                      <div className="text-xs text-slate-400">{v.country} · {v.degree}</div>
                    </div>
                    <Link to="/ssra-admin/verifications">
                      <button className="text-xs font-semibold text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors whitespace-nowrap">
                        Review
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity feed */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 text-sm">Recent Activity</h2>
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No activity yet.</div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      a.type === "enrollment"
                        ? "bg-blue-100 text-[hsl(220,91%,54%)]"
                        : "bg-amber-100 text-amber-600"
                    }`}>
                      {a.type === "enrollment" ? <BookOpen className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate text-xs">{a.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{a.detail}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming sessions */}
        {upcomingSessions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Video className="w-4 h-4 text-violet-500" /> Upcoming Sessions
              </h2>
              <Link to="/ssra-admin/sessions" className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline">
                Manage sessions
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {upcomingSessions.map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <div className="text-xs font-semibold text-violet-700 truncate">{s.title}</div>
                  <div className="text-xs text-violet-500 mt-1">
                    {new Date(s.scheduled_at).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="text-xs text-violet-400">
                    {new Date(s.scheduled_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
