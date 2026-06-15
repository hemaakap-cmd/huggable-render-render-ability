import { useState, useEffect, useMemo } from "react";
import {
  CreditCard, TrendingUp, AlertTriangle, Clock, RefreshCw, Download, Users, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

type Attempt = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  course_id: string | null;
  course_title: string | null;
  amount_eur: number | null;
  status: string;
  failure_reason: string | null;
  failure_code: string | null;
  attempt_number: number;
  stripe_session_id: string | null;
  ip_address: string | null;
  country: string | null;
  environment: string;
  initiated_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
};

type Stats = {
  total: number;
  succeeded: number;
  failed: number;
  initiated: number;
  abandoned: number;
  success_rate: number;
  avg_duration_ms: number;
  unique_users: number;
  top_failure_reasons: { reason: string; count: number }[];
  hourly_buckets: { hour: string; total: number; succeeded: number; failed: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  initiated: "bg-blue-50 text-blue-700 border-blue-200",
  processing:"bg-amber-50 text-amber-700 border-amber-200",
  abandoned: "bg-slate-100 text-slate-600 border-slate-200",
};

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#64748b"];

export default function AdminPaymentMonitor() {
  const { toast } = useToast();
  const [hours, setHours] = useState<number>(24);
  const [env, setEnv] = useState<"live" | "sandbox">("live");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [topFailed, setTopFailed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const [statsRes, attemptsRes, topFailedRes] = await Promise.all([
        supabase.rpc("get_payment_monitor_stats", { _hours: hours, _env: env }),
        supabase
          .from("ssra_payment_attempts")
          .select("*")
          .eq("environment", env)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("get_top_failed_users", { _hours: hours, _env: env, _min_fails: 2 }),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (attemptsRes.error) throw attemptsRes.error;
      if (topFailedRes.error) throw topFailedRes.error;
      setStats(statsRes.data as Stats);
      setAttempts((attemptsRes.data as Attempt[]) || []);
      setTopFailed((topFailedRes.data as any[]) || []);
    } catch (e: any) {
      toast({ title: "خطأ في التحميل", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [hours, env]);

  // realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("payment-attempts-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "ssra_payment_attempts" }, () => {
        loadAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [hours, env]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (a.user_email || "").toLowerCase().includes(q) ||
          (a.course_title || "").toLowerCase().includes(q) ||
          (a.course_id || "").toLowerCase().includes(q) ||
          (a.stripe_session_id || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attempts, statusFilter, search]);

  function exportCSV() {
    const headers = [
      "created_at", "user_email", "course_title", "amount_eur", "status",
      "attempt_number", "failure_reason", "failure_code", "duration_ms",
      "country", "ip_address", "stripe_session_id", "environment",
    ];
    const rows = filteredAttempts.map((a) =>
      headers.map((h) => JSON.stringify((a as any)[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-attempts-${env}-${hours}h.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const failureReasonsForPie = (stats?.top_failure_reasons || []).slice(0, 5).map((r) => ({
    name: r.reason.length > 30 ? r.reason.slice(0, 30) + "…" : r.reason,
    value: r.count,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              مراقبة الدفع
            </h1>
            <p className="text-sm text-slate-500 mt-1">تتبع كل محاولات الدفع والفشل وأنماط الاستخدام</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={env}
              onChange={(e) => setEnv(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="live">Live</option>
              <option value="sandbox">Sandbox</option>
            </select>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value={1}>آخر ساعة</option>
              <option value={24}>آخر 24 ساعة</option>
              <option value={168}>آخر 7 أيام</option>
              <option value={720}>آخر 30 يوم</option>
            </select>
            <button
              onClick={loadAll}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
            <button
              onClick={exportCSV}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="إجمالي المحاولات" value={stats?.total ?? 0} icon={<CreditCard className="w-5 h-5 text-blue-600" />} />
          <Kpi label="معدل النجاح" value={`${stats?.success_rate ?? 0}%`} icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} />
          <Kpi label="فشل" value={stats?.failed ?? 0} icon={<XCircle className="w-5 h-5 text-red-600" />} tone="red" />
          <Kpi label="نجاح" value={stats?.succeeded ?? 0} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} />
          <Kpi label="قيد التنفيذ" value={(stats?.initiated ?? 0) + (stats?.abandoned ?? 0)} icon={<Loader2 className="w-5 h-5 text-amber-600" />} />
          <Kpi label="متوسط زمن الدفع" value={`${Math.round((stats?.avg_duration_ms ?? 0) / 1000)}s`} icon={<Clock className="w-5 h-5 text-slate-600" />} />
          <Kpi label="مستخدمين فريدين" value={stats?.unique_users ?? 0} icon={<Users className="w-5 h-5 text-blue-600" />} />
          <Kpi label="مستخدمين متكرري الفشل" value={topFailed.length} icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} tone={topFailed.length > 0 ? "orange" : undefined} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="المحاولات بمرور الوقت">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(stats?.hourly_buckets || []).map(b => ({
                  hour: new Date(b.hour).toLocaleString("ar-EG", { hour: "2-digit", day: "2-digit", month: "2-digit" }),
                  succeeded: b.succeeded, failed: b.failed,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="succeeded" stackId="a" fill="#10b981" name="نجاح" />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" name="فشل" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="أكثر أسباب الفشل">
            {failureReasonsForPie.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-400">لا يوجد فشل في هذه الفترة 🎉</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={failureReasonsForPie} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => e.name}>
                      {failureReasonsForPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Top failed users */}
        {topFailed.length > 0 && (
          <Card title="🚨 مستخدمون فشلوا أكثر من مرة">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 px-2">المستخدم</th>
                    <th className="py-2 px-2">عدد الفشل</th>
                    <th className="py-2 px-2">إجمالي المحاولات</th>
                    <th className="py-2 px-2">آخر محاولة</th>
                  </tr>
                </thead>
                <tbody>
                  {topFailed.map((u) => (
                    <tr key={u.user_id} className="border-b border-slate-50">
                      <td className="py-2 px-2">{u.user_email || u.user_id?.slice(0,8)}</td>
                      <td className="py-2 px-2"><span className="text-red-600 font-semibold">{u.failed_count}</span></td>
                      <td className="py-2 px-2">{u.total_attempts}</td>
                      <td className="py-2 px-2 text-slate-500">{new Date(u.last_attempt_at).toLocaleString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Filters + Attempts table */}
        <Card title={`سجل المحاولات (${filteredAttempts.length})`}>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالبريد، الكورس، أو معرف الجلسة…"
              className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">كل الحالات</option>
              <option value="succeeded">ناجحة</option>
              <option value="failed">فاشلة</option>
              <option value="initiated">قيد البدء</option>
              <option value="processing">قيد المعالجة</option>
              <option value="abandoned">متروكة</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 px-2">الوقت</th>
                  <th className="py-2 px-2">المستخدم</th>
                  <th className="py-2 px-2">الكورس</th>
                  <th className="py-2 px-2">المبلغ</th>
                  <th className="py-2 px-2">الحالة</th>
                  <th className="py-2 px-2">المحاولة #</th>
                  <th className="py-2 px-2">المدة</th>
                  <th className="py-2 px-2">سبب الفشل</th>
                  <th className="py-2 px-2">الدولة</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredAttempts.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />جارٍ التحميل…</td></tr>
                )}
                {!loading && filteredAttempts.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">لا توجد محاولات</td></tr>
                )}
                {filteredAttempts.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2 px-2 whitespace-nowrap text-slate-500 text-xs">{new Date(a.created_at).toLocaleString("ar-EG")}</td>
                    <td className="py-2 px-2 text-xs">{a.user_email || a.user_id?.slice(0,8)}</td>
                    <td className="py-2 px-2 text-xs">{a.course_title || a.course_id}</td>
                    <td className="py-2 px-2">{a.amount_eur ? `€${a.amount_eur}` : "—"}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-xs ${STATUS_COLORS[a.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">{a.attempt_number}</td>
                    <td className="py-2 px-2 text-xs text-slate-500">{a.duration_ms ? `${Math.round(a.duration_ms / 1000)}s` : "—"}</td>
                    <td className="py-2 px-2 text-xs text-red-600 max-w-[200px] truncate" title={a.failure_reason || ""}>{a.failure_reason || "—"}</td>
                    <td className="py-2 px-2 text-xs">{a.country || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: any; icon: React.ReactNode; tone?: "red" | "orange" }) {
  const toneCls = tone === "red" ? "border-red-200 bg-red-50/50"
                : tone === "orange" ? "border-orange-200 bg-orange-50/50"
                : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
