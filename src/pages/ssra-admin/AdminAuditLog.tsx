import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Loader2, RefreshCw, Search, ChevronDown, ChevronRight } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

type AuditEntry = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

const ACTION_COLOR: Record<string, string> = {
  "enrollment.refunded":    "bg-red-50 text-red-700",
  "enrollment.created":     "bg-emerald-50 text-emerald-700",
  "subscription.canceled":  "bg-red-50 text-red-700",
  "verification.approved":  "bg-emerald-50 text-emerald-700",
  "verification.rejected":  "bg-amber-50 text-amber-700",
  "course.updated":         "bg-blue-50 text-blue-700",
  "coupon.created":         "bg-purple-50 text-purple-700",
  "user.role_changed":      "bg-orange-50 text-orange-700",
};

function useAuditLog(search: string, page: number) {
  const PAGE_SIZE = 50;
  return useQuery({
    queryKey: ["ssra-audit-log", search, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;
      let q = (supabase.from("ssra_audit_log" as never) as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (search) q = q.or(`action.ilike.%${search}%,actor_email.ilike.%${search}%,resource_type.ilike.%${search}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as AuditEntry[], total: count ?? 0 };
    },
  });
}

function JsonToggle({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  if (!data || (typeof data === "object" && Object.keys(data as object).length === 0)) return <span className="text-slate-400">—</span>;
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs text-[hsl(220,91%,54%)] hover:underline">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} Details
      </button>
      {open && (
        <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-40 text-slate-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(0);
  const { data, isLoading, refetch } = useAuditLog(search, page);
  const rows  = data?.rows  ?? [];
  const total = data?.total ?? 0;
  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Audit Log</h1>
            <p className="text-slate-500 text-sm mt-1">
              Immutable record of all admin actions. {total.toLocaleString()} entries total.
            </p>
          </div>
          <button
            onClick={() => void refetch()}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by action, email, or resource…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900">No audit entries</h3>
            <p className="text-sm text-slate-500 mt-1">Admin actions will be logged here automatically.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left w-40">Time</th>
                      <th className="px-4 py-3 text-left">Actor</th>
                      <th className="px-4 py-3 text-left">Action</th>
                      <th className="px-4 py-3 text-left">Resource</th>
                      <th className="px-4 py-3 text-left">Details</th>
                      <th className="px-4 py-3 text-left">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((e) => {
                      const actionColor = ACTION_COLOR[e.action] ?? "bg-slate-50 text-slate-600";
                      return (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors align-top">
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(e.created_at).toLocaleString("en-GB", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900">{e.actor_email ?? "system"}</div>
                            {e.actor_role && <div className="text-xs text-slate-400">{e.actor_role}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${actionColor}`}>
                              {e.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {e.resource_type && <div className="font-semibold">{e.resource_type}</div>}
                            {e.resource_id  && <div className="font-mono text-slate-400 truncate max-w-[12ch]">{e.resource_id.slice(0, 8)}…</div>}
                          </td>
                          <td className="px-4 py-3">
                            <JsonToggle data={e.details} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {e.ip_address ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs">Page {page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
