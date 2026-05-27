import { useState } from "react";
import { Search, Users, Mail, Globe2 } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminStudents } from "@/hooks/useSsraData";

export default function AdminStudents() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useAdminStudents(search);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Students</h1>
            <p className="text-slate-500 text-sm mt-1">All registered students on SSRA.</p>
          </div>
          <div className="text-2xl font-bold font-display text-slate-400">{data.length}</div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white" />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <span className="col-span-4">Student</span>
            <span className="col-span-3">Country · Degree</span>
            <span className="col-span-2 text-center">Enrollments</span>
            <span className="col-span-3 text-center">Subscription</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">No students found.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.map((s: any) => {
                const subStatus = s.ssra_subscriptions?.[0]?.status;
                return (
                  <div key={s.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3.5 hover:bg-slate-50 transition-colors">
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
                    <div className="col-span-3 text-center">
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
