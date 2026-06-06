import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  enrollment_id: string;
  user_id: string;
  course_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  refund_amount_eur: number | null;
  paddle_adjustment_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function useCancellationRequests() {
  return useQuery({
    queryKey: ["ssra-cancel-requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_cancellation_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export default function AdminCancellations() {
  const { data: rows = [], isLoading } = useCancellationRequests();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const process = async (id: string, decision: "approve" | "reject", issueRefund: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("admin-process-cancellation", {
      body: {
        requestId: id,
        decision,
        adminNotes: notes[id]?.trim() || null,
        issueRefund,
      },
    });
    setBusy(null);
    if (error || (data as any)?.error) {
      toast({ title: "Action failed", description: (data as any)?.error ?? error?.message, variant: "destructive" });
      return;
    }
    const refundErr = (data as any)?.refundError;
    toast({
      title: decision === "approve" ? "Request approved" : "Request rejected",
      description: refundErr ? `Enrollment cancelled. Refund must be issued manually: ${refundErr}` : undefined,
    });
    qc.invalidateQueries({ queryKey: ["ssra-cancel-requests-admin"] });
  };

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Cancellation Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Students can request to cancel a paid enrollment within 14 days of payment.</p>
        </div>

        {isLoading ? (
          <div className="text-slate-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Pending ({pending.length})</h2>
              {pending.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">No pending requests.</div>
              ) : (
                <div className="space-y-3">
                  {pending.map((r) => (
                    <div key={r.id} className="bg-white border border-amber-200 rounded-xl p-5">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-sm">
                          <div><span className="text-slate-400 text-xs">Course:</span> <span className="font-semibold text-slate-900">{r.course_id}</span></div>
                          <div><span className="text-slate-400 text-xs">User:</span> <span className="font-mono text-xs text-slate-600">{r.user_id}</span></div>
                          <div><span className="text-slate-400 text-xs">Enrollment:</span> <span className="font-mono text-xs text-slate-600">{r.enrollment_id}</span></div>
                          <div><span className="text-slate-400 text-xs">Amount:</span> <span className="font-semibold text-slate-900">€{Number(r.refund_amount_eur ?? 0).toFixed(2)}</span></div>
                          <div><span className="text-slate-400 text-xs">Requested:</span> {new Date(r.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-slate-400 text-xs mb-1">Reason</div>
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-700 text-sm whitespace-pre-wrap">{r.reason}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs text-slate-500 mb-1">Admin notes (optional, sent to student on rejection)</label>
                        <input
                          value={notes[r.id] ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g. Course already started, partial refund agreed via email…"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 justify-end">
                        <button
                          disabled={busy === r.id}
                          onClick={() => process(r.id, "reject", false)}
                          className="px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5">
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button
                          disabled={busy === r.id}
                          onClick={() => process(r.id, "approve", false)}
                          className="px-3.5 py-2 rounded-lg border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                          Approve without refund
                        </button>
                        <button
                          disabled={busy === r.id}
                          onClick={() => process(r.id, "approve", true)}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                          {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve & refund
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">History ({done.length})</h2>
              {done.length === 0 ? (
                <div className="text-slate-400 text-sm">Nothing yet.</div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="text-left px-4 py-2">Course</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-left px-4 py-2">Amount</th>
                        <th className="text-left px-4 py-2">Refund ID</th>
                        <th className="text-left px-4 py-2">Reviewed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {done.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 text-slate-700">{r.course_id}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              r.status === "refunded" ? "bg-emerald-50 text-emerald-700" :
                              r.status === "approved" ? "bg-blue-50 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-2">€{Number(r.refund_amount_eur ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {r.paddle_adjustment_id ?? (r.status === "approved" ? (
                              <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> manual</span>
                            ) : "—")}
                          </td>
                          <td className="px-4 py-2 text-slate-500 text-xs">{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
