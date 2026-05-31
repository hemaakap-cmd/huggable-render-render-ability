import { useMemo } from "react";
import { Crown, TrendingUp, Euro, CreditCard, Users, AlertCircle } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminEnrollments, useAdminSubscriptions, useAdminStats } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { Navigate } from "react-router-dom";

const COLORS = ["hsl(220,91%,54%)", "hsl(43,96%,50%)", "hsl(160,84%,39%)", "hsl(262,83%,58%)", "hsl(15,86%,56%)"];
const SUB_COLORS: Record<string, string> = {
  active:    "hsl(160,84%,39%)",
  canceled:  "hsl(215,16%,57%)",
  past_due:  "hsl(0,84%,60%)",
  trialing:  "hsl(43,96%,50%)",
};

function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.value >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}>
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold font-display text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function SuperAdminFinance() {
  const { isSuperAdmin, loading } = useSsraAuth();

  const { data: enrollments = [] } = useAdminEnrollments();
  const { data: subs = [] }        = useAdminSubscriptions();
  const { data: stats }            = useAdminStats();

  /* Guard — only super_admin */
  if (!loading && !isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  /* Monthly revenue trend — enrollments */
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months: { month: string; revenue: number; enrollments: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
      let revenue = 0, count = 0;
      for (const e of enrollments as any[]) {
        if (e.status !== "active" || !e.enrolled_at?.startsWith(key)) continue;
        revenue += e.amount_eur ?? 0;
        count++;
      }
      months.push({ month: label, revenue: Number(revenue.toFixed(2)), enrollments: count });
    }
    return months;
  }, [enrollments]);

  /* Revenue by category */
  const byCategory = useMemo(() => {
    const map: Record<string, number> = { clinical: 0, language: 0, career: 0 };
    for (const e of enrollments as any[]) {
      if (e.status !== "active") continue;
      const cat = e.ssra_courses?.category ?? "other";
      map[cat] = (map[cat] ?? 0) + (e.amount_eur ?? 0);
    }
    return Object.entries(map).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Number(value.toFixed(2)),
    }));
  }, [enrollments]);

  /* Subscription health */
  const subHealth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of subs as any[]) {
      map[s.status] = (map[s.status] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [subs]);

  /* MRR */
  const activeSubs   = (subs as any[]).filter((s) => s.status === "active" || s.status === "trialing");
  const mrr          = activeSubs.reduce((sum, s) => sum + (s.ssra_courses?.price_eur ?? 29), 0);
  const cancelledSubs = (subs as any[]).filter((s) => s.status === "canceled").length;
  const churnRate    = subs.length > 0 ? Math.round((cancelledSubs / subs.length) * 100) : 0;
  const totalRevenue = stats?.totalRevenue ?? 0;

  /* This month's revenue */
  const thisMonth = monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0;
  const lastMonth = monthlyRevenue[monthlyRevenue.length - 2]?.revenue ?? 0;
  const revTrend  = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(43,96%,50%)]/15 flex items-center justify-center">
            <Crown className="w-5 h-5 text-[hsl(43,96%,50%)]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Financial Analytics</h1>
            <p className="text-slate-500 text-sm">Revenue, subscriptions, and financial health — Super Admin only.</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Euro}       label="Total Revenue"    value={`€${totalRevenue.toFixed(0)}`}  color="bg-emerald-100 text-emerald-600"
            sub="All completed payments" />
          <KpiCard icon={TrendingUp} label="MRR"              value={`€${mrr}`}                      color="bg-[hsl(220,91%,54%)]/10 text-[hsl(220,91%,54%)]"
            sub={`${activeSubs.length} active subscriptions`}
            trend={{ value: revTrend, label: "vs last month" }} />
          <KpiCard icon={CreditCard} label="This Month"       value={`€${thisMonth.toFixed(0)}`}     color="bg-amber-100 text-amber-600"
            sub="Enrollment revenue" />
          <KpiCard icon={Users}      label="Churn Rate"       value={`${churnRate}%`}                color="bg-red-100 text-red-500"
            sub={`${cancelledSubs} cancelled subscriptions`} />
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Monthly revenue — line */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Monthly Revenue (€) — Last 8 months</h2>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "revenue" ? `€${v}` : v,
                    name === "revenue" ? "Revenue" : "Enrollments",
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(220,91%,54%)" strokeWidth={2.5}
                  dot={{ r: 3 }} activeDot={{ r: 5 }} name="revenue" />
                <Line type="monotone" dataKey="enrollments" stroke="hsl(43,96%,50%)" strokeWidth={1.5}
                  strokeDasharray="4 2" dot={false} name="enrollments" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-4 h-0.5 bg-[hsl(220,91%,54%)] inline-block" /> Revenue (€)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-4 h-0.5 bg-[hsl(43,96%,50%)] inline-block border-dashed border-t" /> Enrollments
              </span>
            </div>
          </div>

          {/* Subscription health — pie */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Subscription Health</h2>
            {subHealth.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-300 text-sm">No subscriptions yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={subHealth} dataKey="value" cx="50%" cy="50%" outerRadius={65}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {subHealth.map((e, i) => (
                        <Cell key={i} fill={SUB_COLORS[e.name] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-3">
                  {subHealth.map((e) => (
                    <div key={e.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: SUB_COLORS[e.name] ?? "#94a3b8" }} />
                        {e.name}
                      </span>
                      <span className="font-semibold text-slate-700">{e.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue by category — bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Revenue by Course Category (€)</h2>
            {byCategory.every((c) => c.value === 0) ? (
              <div className="h-40 flex items-center justify-center text-slate-300 text-sm">No revenue yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={byCategory} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip formatter={(v: number) => [`€${v}`, "Revenue"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subscriptions table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Active Subscriptions</h2>
              <span className="text-xs text-slate-400">MRR €{mrr}</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
              {activeSubs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No active subscriptions.</div>
              ) : activeSubs.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] text-xs font-bold shrink-0">
                    {s.ssra_profiles?.full_name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate text-xs">
                      {s.ssra_profiles?.full_name ?? s.ssra_profiles?.email ?? "Unknown"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Renews {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900 text-xs shrink-0">
                    €{s.ssra_courses?.price_eur ?? 29}/mo
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All enrollments */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">All Payments</h2>
            <span className="text-xs text-slate-400">{(enrollments as any[]).length} total</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {(enrollments as any[]).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No payments yet.</div>
            ) : (enrollments as any[]).map((e: any) => (
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
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
