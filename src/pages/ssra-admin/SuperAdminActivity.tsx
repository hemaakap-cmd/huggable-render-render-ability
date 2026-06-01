import { useState } from "react";
import {
  Activity, Video, BookOpen, ShieldCheck, CheckCircle2, XCircle,
  Clock, Crown, Calendar, TrendingUp, Users,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import {
  useAdminActivityFeed,
  useAdminSessionsActivity,
  useAdminCoursesActivity,
  useAdminUsers,
} from "@/hooks/useSsraData";
import { Navigate } from "react-router-dom";

type Tab = "verifications" | "sessions" | "courses" | "admins";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-DE", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SuperAdminActivity() {
  const { isSuperAdmin, loading } = useSsraAuth();
  const [tab, setTab] = useState<Tab>("verifications");

  const { data: feed    = [], isLoading: feedLoading   } = useAdminActivityFeed();
  const { data: sessions = [], isLoading: sessLoading  } = useAdminSessionsActivity();
  const { data: courses  = [], isLoading: coursLoading } = useAdminCoursesActivity();
  const { data: admins   = [], isLoading: adminLoading } = useAdminUsers();

  if (!loading && !isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  /* ── per-admin verification stats ── */
  const adminMap: Record<string, { name: string; email: string; approved: number; rejected: number }> = {};
  (feed as any[]).forEach((v: any) => {
    const r = v.reviewer;
    if (!r) return;
    if (!adminMap[r.id]) adminMap[r.id] = { name: r.full_name ?? r.email, email: r.email, approved: 0, rejected: 0 };
    if (v.status === "approved") adminMap[r.id].approved++;
    else if (v.status === "rejected") adminMap[r.id].rejected++;
  });
  const adminStats = Object.values(adminMap).sort((a, b) => (b.approved + b.rejected) - (a.approved + a.rejected));

  const TABS: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "verifications", label: "Verification Reviews", icon: ShieldCheck, count: (feed as any[]).length },
    { key: "sessions",      label: "Sessions",             icon: Video,       count: (sessions as any[]).length },
    { key: "courses",       label: "Courses",              icon: BookOpen,    count: (courses as any[]).length },
    { key: "admins",        label: "Admin Summary",        icon: Users,       count: (admins as any[]).filter((a: any) => a.role !== "student").length },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(43,96%,50%)]/15 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[hsl(43,96%,50%)]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Activity Monitor</h1>
            <p className="text-slate-500 text-sm">Full visibility into everything admins and instructors do.</p>
          </div>
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[hsl(43,96%,50%)] bg-[hsl(43,96%,50%)]/10 px-2.5 py-1 rounded-full">
            <Crown className="w-3 h-3" /> Super Admin Only
          </span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, label: "Reviews done",    value: (feed as any[]).length,        color: "text-blue-600",   bg: "bg-blue-50" },
            { icon: CheckCircle2,label: "Approved",        value: (feed as any[]).filter((v: any) => v.status === "approved").length, color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: Video,       label: "Sessions created",value: (sessions as any[]).length,    color: "text-purple-600", bg: "bg-purple-50" },
            { icon: BookOpen,    label: "Courses managed", value: (courses as any[]).length,     color: "text-amber-600",  bg: "bg-amber-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className={`w-8 h-8 ${bg} ${color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-display text-slate-900">{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === key ? "bg-[hsl(43,96%,50%)] text-slate-900" : "bg-slate-200 text-slate-500"
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Tab: Verification Reviews */}
        {tab === "verifications" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" /> Admin Review History
              </h2>
              <span className="text-xs text-slate-400">{(feed as any[]).length} reviews</span>
            </div>

            {feedLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : (feed as any[]).length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No reviews yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(feed as any[]).map((v: any) => (
                  <div key={v.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                      v.status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                    }`}>
                      {v.status === "approved" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">{v.full_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          v.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {v.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{v.email}</div>
                      {v.admin_notes && (
                        <div className="mt-1 text-xs text-slate-500 italic">"{v.admin_notes}"</div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {v.reviewed_at ? timeAgo(v.reviewed_at) : "—"}
                        </span>
                        {v.reviewer && (
                          <span className="text-[11px] text-[hsl(220,91%,54%)] font-semibold">
                            by {v.reviewer.full_name ?? v.reviewer.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 shrink-0 mt-0.5 hidden sm:block">
                      {v.reviewed_at ? fmt(v.reviewed_at) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Sessions */}
        {tab === "sessions" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-500" /> All Zoom Sessions
              </h2>
              <span className="text-xs text-slate-400">{(sessions as any[]).length} sessions</span>
            </div>

            {sessLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : (sessions as any[]).length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No sessions created yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(sessions as any[]).map((s: any) => {
                  const isPast = new Date(s.scheduled_at) < new Date();
                  return (
                    <div key={s.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${s.is_cancelled ? "opacity-50" : ""}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        s.is_cancelled ? "bg-red-400" : isPast ? "bg-slate-300" : "bg-emerald-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{s.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {s.ssra_courses?.title} · {fmt(s.scheduled_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.is_cancelled && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">CANCELLED</span>
                        )}
                        {!s.is_cancelled && isPast && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">PAST</span>
                        )}
                        {!s.is_cancelled && !isPast && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" /> UPCOMING
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Courses */}
        {tab === "courses" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" /> Course Catalog
              </h2>
              <span className="text-xs text-slate-400">{(courses as any[]).length} courses</span>
            </div>

            {coursLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(courses as any[]).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${c.is_active ? "bg-emerald-400" : "bg-slate-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 truncate">{c.title}</span>
                        {c.title_ar && <span className="text-xs text-slate-400 font-arabic">{c.title_ar}</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{c.category}</span>
                        <span>·</span>
                        <span className="capitalize">{c.course_type?.replace("_", " ")}</span>
                        {c.price_eur && <><span>·</span><span>€{c.price_eur}/mo</span></>}
                        <span>·</span>
                        <span>Updated {timeAgo(c.updated_at ?? c.created_at)}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {c.is_active ? "ACTIVE" : "HIDDEN"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Admin Summary */}
        {tab === "admins" && (
          <div className="space-y-4">
            {/* Per-admin stats */}
            {adminStats.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[hsl(43,96%,50%)]" />
                  <h2 className="font-semibold text-slate-900 text-sm">Admin Review Performance</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {adminStats.map((a, i) => {
                    const total = a.approved + a.rejected;
                    const approvalRate = total ? Math.round((a.approved / total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-9 h-9 rounded-full bg-[hsl(220,91%,54%)]/10 text-[hsl(220,91%,54%)] flex items-center justify-center text-sm font-bold shrink-0">
                          {a.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{a.name}</div>
                          <div className="text-xs text-slate-400 truncate">{a.email}</div>
                          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${approvalRate}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <div className="text-base font-bold text-slate-900">{total}</div>
                            <div className="text-[10px] text-slate-400">reviews</div>
                          </div>
                          <div>
                            <div className="text-base font-bold text-emerald-600">{a.approved}</div>
                            <div className="text-[10px] text-slate-400">approved</div>
                          </div>
                          <div>
                            <div className="text-base font-bold text-red-500">{a.rejected}</div>
                            <div className="text-[10px] text-slate-400">rejected</div>
                          </div>
                          <div>
                            <div className="text-base font-bold text-slate-700">{approvalRate}%</div>
                            <div className="text-[10px] text-slate-400">approval</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All admins list */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-slate-900 text-sm">All Admins & Super Admins</h2>
              </div>
              {adminLoading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {(admins as any[]).map((u: any) => {
                    const stats = adminMap[u.id];
                    return (
                      <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          u.role === "super_admin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-[hsl(220,91%,54%)]"
                        }`}>
                          {u.full_name?.[0] ?? u.email?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{u.full_name ?? "—"}</div>
                          <div className="text-xs text-slate-400 truncate">{u.email}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          u.role === "super_admin"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-[hsl(220,91%,54%)] border-blue-200"
                        }`}>
                          {u.role === "super_admin" ? "Super Admin" : "Admin"}
                        </span>
                        {stats && (
                          <div className="text-xs text-slate-400 shrink-0 hidden sm:block">
                            {stats.approved + stats.rejected} reviews
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
