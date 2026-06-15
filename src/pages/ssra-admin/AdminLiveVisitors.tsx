import { useEffect, useState } from "react";
import { Users, Globe2, FileText, Activity, RefreshCw, LogIn, UserCheck, MapPin } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

type TodayTotals = {
  visitors: number;
  countries: number;
  logins: number;
  completedProfiles: number;
};

type Visitor = {
  id: string;
  session_id: string;
  user_id: string | null;
  path: string;
  country: string | null;
  city: string | null;
  referrer: string | null;
  device_type: string | null;
  user_agent: string | null;
  last_seen_at: string;
  first_seen_at: string;
  page_views: number;
};

const WINDOW_MIN = 5;

export default function AdminLiveVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  async function load() {
    setRefreshing(true);
    try {
      const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
      const { data, error } = await supabase
        .from("site_visitor_sessions")
        .select("*")
        .gte("last_seen_at", since)
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (error) console.error("[live-visitors] load error:", error);
      setVisitors((data as Visitor[]) ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("live-visitors")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_visitor_sessions" }, () => load())
      .subscribe();
    const t = setInterval(() => setTick((n) => n + 1), 15_000); // re-render relative times + prune stale
    const t2 = setInterval(load, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); clearInterval(t2); };
  }, []);

  // Group by country / page
  const byCountry = new Map<string, number>();
  const byPage = new Map<string, number>();
  for (const v of visitors) {
    const c = v.country || "Unknown";
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
    byPage.set(v.path, (byPage.get(v.path) ?? 0) + 1);
  }
  const countries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]);
  const pages = [...byPage.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Live Visitors</h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time visitors active in the last {WINDOW_MIN} minutes
              <span className="inline-flex items-center gap-1.5 ml-3 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="btn-outline px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<Users className="w-5 h-5" />} label="Active now" value={visitors.length} color="text-emerald-600" />
          <Stat icon={<Globe2 className="w-5 h-5" />} label="Countries" value={countries.length} color="text-blue-600" />
          <Stat icon={<FileText className="w-5 h-5" />} label="Pages viewed" value={pages.length} color="text-violet-600" />
          <Stat icon={<Activity className="w-5 h-5" />} label="Logged-in users" value={visitors.filter((v) => v.user_id).length} color="text-amber-600" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* By Country */}
          <Card title="By country">
            {countries.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-slate-100">
                {countries.map(([c, n]) => (
                  <li key={c} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-700">{c}</span>
                    <span className="font-semibold text-slate-900">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* By Page */}
          <Card title="By page">
            {pages.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-slate-100">
                {pages.map(([p, n]) => (
                  <li key={p} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-700 font-mono text-xs truncate max-w-[70%]">{p}</span>
                    <span className="font-semibold text-slate-900">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Live feed */}
        <Card title={`Live feed (${visitors.length})`}>
          {loading ? <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
            : visitors.length === 0 ? <Empty />
            : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-6 py-3">Country</th>
                      <th className="text-left px-6 py-3">Page</th>
                      <th className="text-left px-6 py-3">Device</th>
                      <th className="text-left px-6 py-3">Referrer</th>
                      <th className="text-left px-6 py-3">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3 text-slate-700">
                          {v.country || "—"}{v.city ? <span className="text-slate-400"> · {v.city}</span> : null}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-slate-600">{v.path}</td>
                        <td className="px-6 py-3 text-slate-500 capitalize">{v.device_type || "—"}</td>
                        <td className="px-6 py-3 text-slate-500 text-xs truncate max-w-[200px]">
                          {(() => { try { return v.referrer ? new URL(v.referrer).hostname : "Direct"; } catch { return "Direct"; } })()}
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs" data-tick={tick}>
                          {formatDistanceToNow(new Date(v.last_seen_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      </div>
    </AdminLayout>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className={`inline-flex w-9 h-9 rounded-xl bg-slate-50 items-center justify-center ${color} mb-3`}>{icon}</div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="font-display text-lg font-bold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty() { return <p className="text-sm text-slate-400 py-8 text-center">No visitors right now</p>; }
