import { useState } from "react";
import { ShieldAlert, CheckCircle2, X, Loader2, AlertTriangle, Eye } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useFraudFlags, useResolveFraudFlag } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";

const SEVERITY_COLORS: Record<string, string> = {
  low:      "bg-slate-100 text-slate-500 border-slate-200",
  medium:   "bg-amber-50 text-amber-700 border-amber-200",
  high:     "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const FLAG_LABELS: Record<string, string> = {
  concurrent_session:  "Concurrent Session",
  chargeback_risk:     "Chargeback Risk",
  rapid_enrollment:    "Rapid Enrollment",
  link_sharing:        "Link Sharing",
  refund_abuse:        "Refund Abuse",
  suspicious_pattern:  "Suspicious Pattern",
};

export default function AdminFraud() {
  const [showResolved, setShowResolved] = useState(false);
  const [resolveModal, setResolveModal] = useState<any>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);

  const { data: flags = [], isLoading } = useFraudFlags(showResolved ? undefined : false);
  const resolve = useResolveFraudFlag();
  const { toast } = useToast();

  async function submitResolve(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await resolve.mutateAsync({ id: resolveModal.id, note });
      toast({ title: "Flag resolved" });
      setResolveModal(null);
      setNote("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  const critical = (flags as any[]).filter(f => f.severity === "critical" && !f.resolved).length;
  const high     = (flags as any[]).filter(f => f.severity === "high"     && !f.resolved).length;
  const unresolved = (flags as any[]).filter(f => !f.resolved).length;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-500" /> Fraud & Security Flags
            </h1>
            <p className="text-slate-500 text-sm mt-1">Auto-detected and manually flagged security incidents. Resolve each with a note.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
              className="rounded" />
            Show resolved
          </label>
        </div>

        {/* Alert banners */}
        {critical > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-red-700 text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {critical} critical flag{critical > 1 ? "s" : ""} require immediate attention
          </div>
        )}
        {high > 0 && critical === 0 && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3 text-orange-700 text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {high} high-severity flag{high > 1 ? "s" : ""} pending review
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <div className="text-xs text-red-500 font-semibold mb-1">Critical</div>
            <div className="text-3xl font-bold font-display text-red-600">{critical}</div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <div className="text-xs text-orange-500 font-semibold mb-1">High</div>
            <div className="text-3xl font-bold font-display text-orange-600">{high}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-xs text-slate-500 mb-1">Total Unresolved</div>
            <div className="text-3xl font-bold font-display text-slate-900">{unresolved}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : (flags as any[]).length === 0 ? (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              No flags{showResolved ? "" : " unresolved"}. System looks clean.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">User</th>
                  <th className="text-left px-4 py-3">Flag Type</th>
                  <th className="text-center px-4 py-3">Severity</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Description</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Detected</th>
                  <th className="text-center px-4 py-3">Resolved</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(flags as any[]).map((flag: any) => (
                  <tr key={flag.id} className={`hover:bg-slate-50 transition-colors ${flag.resolved ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{flag.ssra_profiles?.full_name ?? "Unknown"}</div>
                      <div className="text-xs text-slate-400">{flag.ssra_profiles?.email ?? flag.user_id?.slice(0,8)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-700 font-medium text-xs">
                        {FLAG_LABELS[flag.flag_type] ?? flag.flag_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${SEVERITY_COLORS[flag.severity] ?? ""}`}>
                        {flag.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell max-w-[220px] truncate">
                      {flag.description}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs hidden md:table-cell">
                      {new Date(flag.created_at).toLocaleDateString("en-DE", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {flag.resolved
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                        : <span className="w-2 h-2 bg-red-400 rounded-full inline-block" />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {flag.data && (
                          <button onClick={() => setDetailModal(flag)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!flag.resolved && (
                          <button onClick={() => { setResolveModal(flag); setNote(""); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">Resolve Flag</h2>
              <button onClick={() => setResolveModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitResolve} className="p-6 space-y-4">
              <div className="text-sm text-slate-600">
                <span className="font-medium">{FLAG_LABELS[resolveModal.flag_type] ?? resolveModal.flag_type}</span>
                {" — "}{resolveModal.description}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Resolution Note *
                </label>
                <textarea required rows={3} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Describe how this was resolved or why it was dismissed…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setResolveModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : "Mark Resolved"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / evidence modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">Evidence Details</h2>
              <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Raw evidence data</div>
              <pre className="bg-slate-50 rounded-xl p-4 text-xs text-slate-700 overflow-x-auto border border-slate-100">
                {JSON.stringify(detailModal.data, null, 2)}
              </pre>
              {detailModal.resolution_note && (
                <>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4">Resolution note</div>
                  <p className="text-sm text-slate-600">{detailModal.resolution_note}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
