import { useState, useMemo } from "react";
import { Search, Users, Mail, Globe2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminStudents } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";

type SubFilter = "all" | "active" | "none";
const PAGE_SIZE = 25;

export default function AdminStudents() {
  const [search, setSearch]       = useState("");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [page, setPage]           = useState(0);
  const { data, isLoading }       = useAdminStudents(search, page, PAGE_SIZE);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const { isSuperAdmin }          = useSsraAuth();
  const navigate                  = useNavigate();

  const filtered = useMemo(() => {
    if (subFilter === "all") return rows;
    if (subFilter === "active") return rows.filter((s: any) => s.ssra_subscriptions?.[0]?.status === "active");
    return rows.filter((s: any) => !s.ssra_subscriptions?.[0]?.status);
  }, [rows, subFilter]);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Students</h1>
            <p className="text-slate-500 text-sm mt-1">All registered students on SSRA.</p>
          </div>
          <div className="text-2xl font-bold font-display text-slate-400">{filtered.length}</div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(["all", "active", "none"] as SubFilter[]).map((v) => (
              <button key={v} onClick={() => setSubFilter(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  subFilter === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {v === "none" ? "No Sub" : v === "active" ? "Active Sub" : "All"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className={`grid gap-4 px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide ${isSuperAdmin ? "grid-cols-13" : "grid-cols-12"}`}>
            <span className={isSuperAdmin ? "col-span-4" : "col-span-4"}>Student</span>
            <span className={isSuperAdmin ? "col-span-3" : "col-span-3"}>Country · Degree</span>
            <span className={`col-span-2 text-center`}>Enrollments</span>
            <span className={`${isSuperAdmin ? "col-span-2" : "col-span-3"} text-center`}>Subscription</span>
            {isSuperAdmin && <span className="col-span-2 text-center">View As</span>}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">No students found.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((s: any) => {
                const subStatus = s.ssra_subscriptions?.[0]?.status;
                return (
                  <div key={s.id} className={`grid gap-4 items-center px-4 py-3.5 hover:bg-slate-50 transition-colors ${isSuperAdmin ? "grid-cols-13" : "grid-cols-12"}`}>
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] font-bold text-xs shrink-0">
                        {s.full_name?.[0] ?? s.email?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{s.full_name ?? "—"}</div>
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {s.email}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Globe2 className="w-3 h-3" /> {s.country ?? "—"}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{s.degree ?? "—"}</div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="inline-block bg-[hsl(220,91%,54%)]/10 text-[hsl(220,91%,54%)] text-xs font-semibold px-2 py-0.5 rounded-full">
                        {s.ssra_enrollments?.[0]?.count ?? 0}
                      </span>
                    </div>
                    <div className={`${isSuperAdmin ? "col-span-2" : "col-span-3"} text-center`}>
                      {subStatus ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          subStatus === "active"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          subStatus === "past_due" ? "bg-red-50 text-red-700 border-red-200"             :
                          "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {subStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                    {isSuperAdmin && (
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => navigate(`/ssra-admin/view-as/${s.id}`)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                          <Eye className="w-3 h-3" /> View as
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
