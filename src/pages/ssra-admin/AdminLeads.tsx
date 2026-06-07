import { useState } from "react";
import { Search, UserPlus, Mail, Globe2, Phone, Download, FileSpreadsheet, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminLeads, useLeadStudentStats } from "@/hooks/useSsraData";
import { exportToCSV, exportToExcel, profileCompletion, type ExportColumn } from "@/lib/exportUtils";

const PAGE_SIZE = 25;

type Lead = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  country: string | null;
  degree: string | null;
  german_level: string | null;
  created_at: string;
  updated_at: string;
};

const columns: ExportColumn<Lead>[] = [
  { header: "Full Name",   accessor: (r) => r.full_name ?? "" },
  { header: "Email",       accessor: (r) => r.email ?? "" },
  { header: "Phone",       accessor: (r) => r.phone_number ?? "" },
  { header: "Country",     accessor: (r) => r.country ?? "" },
  { header: "Degree",      accessor: (r) => r.degree ?? "" },
  { header: "German Level",accessor: (r) => r.german_level ?? "" },
  { header: "Registered",  accessor: (r) => new Date(r.created_at).toISOString().slice(0, 10) },
  { header: "Last Update", accessor: (r) => new Date(r.updated_at).toISOString().slice(0, 10) },
  { header: "Profile %",   accessor: (r) => `${profileCompletion(r)}%` },
];

export default function AdminLeads() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [completionFilter, setCompletionFilter] = useState<"all" | "empty" | "partial" | "complete">("all");
  const { data, isLoading } = useAdminLeads(search, page, PAGE_SIZE);
  const { data: stats } = useLeadStudentStats();

  const rows = (data?.rows ?? []) as Lead[];
  const total = data?.total ?? 0;

  const filtered = rows.filter((r) => {
    if (completionFilter === "all") return true;
    const c = profileCompletion(r);
    if (completionFilter === "empty") return c < 25;
    if (completionFilter === "partial") return c >= 25 && c < 75;
    return c >= 75;
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const onCSV   = () => exportToCSV(filtered, columns, `ssra-leads-${stamp}`);
  const onXLSX  = () => exportToExcel(filtered, columns, `ssra-leads-${stamp}`, "Leads");

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-amber-500" /> Leads
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Registered users who have not purchased any course yet.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCSV} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={onXLSX} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Leads"        value={stats?.totalLeads ?? "—"} hint="No payment yet" />
          <StatCard label="New This Month"     value={stats?.newLeadsThisMonth ?? "—"} hint="Signed up" />
          <StatCard label="Conversion Rate"    value={stats ? `${stats.conversionRate.toFixed(1)}%` : "—"} hint="Leads → Students" icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} />
          <StatCard label="Total Students"     value={stats?.totalStudents ?? "—"} hint="Paying customers" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(["all", "empty", "partial", "complete"] as const).map((v) => (
              <button key={v} onClick={() => setCompletionFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  completionFilter === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {v === "all" ? "All" : v === "empty" ? "<25%" : v === "partial" ? "25–75%" : "≥75%"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">No leads match the current filters.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Lead</th>
                    <th className="text-left px-4 py-3">Contact</th>
                    <th className="text-left px-4 py-3">Country</th>
                    <th className="text-center px-4 py-3">Profile</th>
                    <th className="text-left px-4 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => {
                    const completion = profileCompletion(r);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                              {(r.full_name?.[0] ?? r.email?.[0] ?? "?").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-800 truncate max-w-[180px]">{r.full_name ?? "—"}</div>
                              <div className="text-[11px] text-slate-400">{r.degree ?? "no degree"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {r.email ?? "—"}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {r.phone_number ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1"><Globe2 className="w-3 h-3 text-slate-400" /> {r.country ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${completion < 25 ? "bg-red-400" : completion < 75 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${completion}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono w-8">{completion}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div>Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} leads</div>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, hint, icon }: { label: string; value: number | string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}
