import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Search, ChevronDown } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminVerifications, useUpdateVerification } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";

type Status = "all" | "pending" | "approved" | "rejected";

const STATUS_TABS: { label: string; value: Status }[] = [
  { label: "All",      value: "all" },
  { label: "Pending",  value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; icon: React.ElementType }> = {
    pending:  { cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
    approved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    rejected: { cls: "bg-red-50 text-red-700 border-red-200",         icon: XCircle },
  };
  const { cls, icon: Icon } = cfg[status] ?? { cls: "bg-slate-100 text-slate-600", icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

export default function AdminVerifications() {
  const [tab, setTab]     = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const { toast }         = useToast();
  const { data = [], isLoading } = useAdminVerifications(tab);
  const update = useUpdateVerification();

  const filtered = data.filter((v: any) =>
    v.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = async (id: string, status: "approved" | "rejected") => {
    await update.mutateAsync({ id, status, notes });
    toast({
      title: status === "approved" ? "Verification approved" : "Verification rejected",
      description: status === "approved" ? "Student can now subscribe to Medical German." : "Student has been notified.",
    });
    setExpanded(null);
    setNotes("");
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Student Verifications</h1>
          <p className="text-slate-500 text-sm mt-1">Review sports science diploma submissions to unlock the Medical German subscription.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {STATUS_TABS.map(({ label, value }) => (
              <button key={value} onClick={() => setTab(value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9 pr-4 h-9 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">No verifications in this category.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((v: any) => (
                <div key={v.id}>
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] font-bold text-sm shrink-0">
                      {v.full_name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm">{v.full_name}</div>
                      <div className="text-xs text-slate-400">{v.email} · {v.country}</div>
                    </div>
                    <div className="hidden sm:block text-xs text-slate-400">{v.degree} · {v.graduation_year}</div>
                    <StatusBadge status={v.status} />
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded === v.id ? "rotate-180" : ""}`} />
                  </div>

                  {expanded === v.id && (
                    <div className="px-4 pb-5 bg-slate-50 border-t border-slate-100 space-y-4">
                      {/* Details */}
                      <div className="grid sm:grid-cols-3 gap-4 pt-4 text-sm">
                        {[
                          ["German Level", v.german_level],
                          ["Degree", v.degree],
                          ["Graduation Year", v.graduation_year],
                          ["Country", v.country],
                          ["Course Applied For", v.course_id],
                          ["Submitted", v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"],
                        ].map(([k, val]) => (
                          <div key={k}>
                            <div className="text-xs text-slate-400 mb-0.5">{k}</div>
                            <div className="font-medium text-slate-800">{val ?? "—"}</div>
                          </div>
                        ))}
                      </div>

                      {v.motivation && (
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Motivation</div>
                          <div className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200 leading-relaxed">
                            {v.motivation}
                          </div>
                        </div>
                      )}

                      {v.status === "pending" && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Admin notes (optional)</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                              placeholder="Reason for approval/rejection…"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={update.isPending}
                              onClick={() => handleUpdate(v.id, "approved")}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              <CheckCircle2 className="w-4 h-4" /> Approve
                            </button>
                            <button
                              disabled={update.isPending}
                              onClick={() => handleUpdate(v.id, "rejected")}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50">
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {v.status !== "pending" && v.admin_notes && (
                        <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                          <span className="font-medium">Admin note:</span> {v.admin_notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
