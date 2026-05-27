import { useMemo } from "react";
import { TrendingUp, Euro, Users, CreditCard } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminEnrollments, useAdminSubscriptions, useAdminStats } from "@/hooks/useSsraData";

const COLORS = ["hsl(220,91%,54%)", "hsl(43,96%,50%)", "hsl(160,84%,39%)", "hsl(262,83%,58%)", "hsl(15,86%,56%)", "hsl(200,98%,39%)"];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="text-3xl font-bold font-display text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminRevenue() {
  const { data: enrollments = [] } = useAdminEnrollments();
  const { data: subs = [] }        = useAdminSubscriptions();
  const { data: stats }            = useAdminStats();

  /* Monthly enrollment revenue — group by month */
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enrollments as any[]) {
      if (e.status !== "active") continue;
      const d = e.enrolled_at ? new Date(e.enrolled_at) : null;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + (e.amount_eur ?? 0);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, revenue]) => ({ month: month.slice(5), revenue: Number(revenue.toFixed(2)) }));
  }, [enrollments]);

  /* Revenue by course */
  const byCourse = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enrollments as any[]) {
      if (e.status !== "active") continue;
      const title = e.ssra_courses?.title ?? "Unknown";
      map[title] = (map[title] ?? 0) + (e.amount_eur ?? 0);
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value: Number(value.toFixed(2)) }));
  }, [enrollments]);

  /* MRR from active subscriptions */
  const mrr = useMemo(() =>
    (subs as any[])
      .filter((s) => s.status === "active" || s.status === "trialing")
      .reduce((sum, s) => sum + (s.ssra_courses?.price_eur ?? 29), 0),
  [subs]);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const activeEnrollments = (enrollments as any[]).filter((e: any) => e.status === "active").length;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Revenue</h1>
          <p className="text-slate-500 text-sm mt-1">Financial overview of all course sales and subscriptions.</p>
        </div>

        {/* KPI cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Euro}       label="Total Revenue"         value={`€${totalRevenue.toFixed(0)}`} sub="One-time enrollments"      color="text-emerald-500" />
          <StatCard icon={TrendingUp} label="Monthly Recurring (MRR)" value={`€${mrr}`}                   sub={`${(subs as any[]).filter((s:any)=>s.status==="active").length} active subs`} color="text-[hsl(220,91%,54%)]" />
          <StatCard icon={CreditCard} label="Total Enrollments"     value={activeEnrollments}             sub="Active only"               color="text-amber-500" />
          <StatCard icon={Users}      label="Subscriptions"         value={(subs as any[]).filter((s:any) => s.status==="active").length} sub="Active this month" color="text-purple-500" />
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly bar chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-800 mb-4 text-sm">Monthly Enrollment Revenue (€)</h2>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(v: number) => [`€${v}`, "Revenue"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(220,91%,54%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart by course */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-800 mb-4 text-sm">Revenue by Course</h2>
            {byCourse.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byCourse} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {byCourse.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `€${v}`} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* All enrollments table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">All Enrollments</h2>
            <span className="text-xs text-slate-400">{(enrollments as any[]).length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {(enrollments as any[]).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No enrollments yet.</div>
            ) : (
              (enrollments as any[]).map((e: any) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {e.ssra_profiles?.full_name ?? e.ssra_profiles?.email ?? "Unknown"}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{e.ssra_courses?.title}</div>
                  </div>
                  <div className="font-bold text-slate-900 shrink-0">€{e.amount_eur ?? 0}</div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    e.status === "active"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    e.status === "refunded" ? "bg-slate-100 text-slate-500 border-slate-200"      :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>{e.status}</span>
                  <div className="text-xs text-slate-400 shrink-0 hidden sm:block">
                    {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subscriptions table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Subscriptions</h2>
            <span className="text-xs text-slate-400">{(subs as any[]).length} total · MRR €{mrr}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {(subs as any[]).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No subscriptions yet.</div>
            ) : (
              (subs as any[]).map((s: any) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {s.ssra_profiles?.full_name ?? s.ssra_profiles?.email ?? "Unknown"}
                    </div>
                    <div className="text-xs text-slate-400">
                      Renews {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 shrink-0">€{s.ssra_courses?.price_eur ?? 29}/mo</div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    s.status === "active"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    s.status === "past_due" ? "bg-red-50 text-red-700 border-red-200"             :
                    s.status === "canceled" ? "bg-slate-100 text-slate-500 border-slate-200"      :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>{s.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
