import { Link } from "react-router-dom";
import {
  Users, BookOpen, ShieldCheck, CreditCard, TrendingUp,
  Clock, CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminStats, useAdminVerifications, useAdminEnrollments } from "@/hooks/useSsraData";

function StatCard({
  icon: Icon, label, value, sub, color, href,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; href?: string;
}) {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
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
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    past_due: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: verifications = [] }             = useAdminVerifications("pending");
  const { data: enrollments = [] }               = useAdminEnrollments();

  const recentEnrollments = enrollments.slice(0, 5);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Academy Overview</h1>
          <p className="text-slate-500 text-sm mt-1">All metrics for SSRA — Sports Science &amp; Rehabilitation Academy.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}      label="Total Students"         value={statsLoading ? "…" : stats?.totalStudents ?? 0}        color="bg-blue-100 text-[hsl(220,91%,54%)]"  href="/ssra-admin/students" />
          <StatCard icon={ShieldCheck}label="Pending Verifications"  value={statsLoading ? "…" : stats?.pendingVerifications ?? 0} color="bg-amber-100 text-amber-600"             href="/ssra-admin/verifications" sub="Needs review" />
          <StatCard icon={CreditCard} label="Active Subscriptions"   value={statsLoading ? "…" : stats?.activeSubscriptions ?? 0}  color="bg-emerald-100 text-emerald-600"        href="/ssra-admin/subscriptions" />
          <StatCard icon={TrendingUp} label="Total Revenue"          value={statsLoading ? "…" : `€${(stats?.totalRevenue ?? 0).toFixed(0)}`} color="bg-violet-100 text-violet-600" href="/ssra-admin/revenue" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending verifications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Pending Verifications</h2>
              <Link to="/ssra-admin/verifications" className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline">
                View all
              </Link>
            </div>
            {verifications.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="text-slate-400 text-sm">All caught up!</div>
              </div>
            ) : (
              <div className="space-y-3">
                {verifications.slice(0, 4).map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                      {v.full_name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{v.full_name}</div>
                      <div className="text-xs text-slate-400">{v.country} · {v.degree}</div>
                    </div>
                    <Link to="/ssra-admin/verifications">
                      <button className="text-xs font-semibold text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors">
                        Review
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent enrollments */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Recent Enrollments</h2>
              <Link to="/ssra-admin/enrollments" className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline">
                View all
              </Link>
            </div>
            {recentEnrollments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No enrollments yet.</div>
            ) : (
              <div className="space-y-3">
                {recentEnrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] text-xs font-bold shrink-0">
                      {e.ssra_profiles?.full_name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {e.ssra_profiles?.full_name ?? e.ssra_profiles?.email ?? "Unknown"}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{e.ssra_courses?.title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-slate-900">€{e.amount_eur}</div>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
