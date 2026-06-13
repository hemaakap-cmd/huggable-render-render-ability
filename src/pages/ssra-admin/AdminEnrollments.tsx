import { BookOpen, TrendingUp, Euro, Mail, Loader2 } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminEnrollments, useAdminSubscriptions } from "@/hooks/useSsraData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function SendReminderButton({ enrollment }: { enrollment: any }) {
  const [loading, setLoading] = useState(false);
  const email = enrollment.ssra_profiles?.email ?? enrollment.student_email_snapshot;
  if (!email) return null;
  const send = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          template: "payment-reminder",
          to: email,
          data: {
            studentName: enrollment.ssra_profiles?.full_name ?? enrollment.student_name_snapshot ?? "there",
            courseName: enrollment.course_title_snapshot ?? enrollment.ssra_courses?.title ?? "your course",
            startDate: enrollment.start_date_snapshot
              ? new Date(enrollment.start_date_snapshot + "T00:00:00").toLocaleDateString()
              : "—",
            startTime: enrollment.start_time_snapshot ? String(enrollment.start_time_snapshot).slice(0, 5) : "—",
            amount: `€${enrollment.amount_eur ?? 0}`,
            orderNumber: enrollment.order_number ?? "—",
            checkoutUrl: `https://ssracourses.com/courses/${enrollment.course_id}`,
          },
        },
      });
      if (error) throw error;
      toast({ title: "Reminder sent", description: `Payment reminder emailed to ${email}.` });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={send}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
      Send reminder
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending:  "bg-amber-50 text-amber-700 border-amber-200",
    refunded: "bg-slate-100 text-slate-500",
    canceled: "bg-red-50 text-red-600 border-red-200",
    past_due: "bg-orange-50 text-orange-600 border-orange-200",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${m[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

export default function AdminEnrollments() {
  const { data: enrollments = [], isLoading: eLoad } = useAdminEnrollments();
  const { data: subs = [],         isLoading: sLoad } = useAdminSubscriptions();

  const totalRevenue = enrollments
    .filter((e: any) => e.status === "active")
    .reduce((s: number, e: any) => s + (e.amount_eur ?? 0), 0);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Enrollments &amp; Subscriptions</h1>
          <p className="text-slate-500 text-sm mt-1">All course purchases and active subscriptions.</p>
        </div>

        {/* Revenue cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Total Revenue</span>
            </div>
            <div className="text-3xl font-bold font-display text-slate-900">€{totalRevenue.toFixed(0)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-[hsl(220,91%,54%)]" />
              <span className="text-xs text-slate-500">One-time Enrollments</span>
            </div>
            <div className="text-3xl font-bold font-display text-slate-900">{enrollments.length}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-[hsl(43,96%,50%)]" />
              <span className="text-xs text-slate-500">Active Subscriptions</span>
            </div>
            <div className="text-3xl font-bold font-display text-slate-900">
              {subs.filter((s: any) => s.status === "active").length}
            </div>
          </div>
        </div>

        {/* One-time enrollments */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">One-time Course Enrollments</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {eLoad && <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>}
            {!eLoad && enrollments.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No enrollments yet.</div>
            )}
            {enrollments.map((e: any) => (
              <div key={e.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">
                      {e.ssra_profiles?.full_name ?? e.student_name_snapshot ?? e.ssra_profiles?.email ?? e.student_email_snapshot ?? "Unknown"}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {e.course_title_snapshot ?? e.ssra_courses?.title}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                      {e.order_number && (
                        <span className="font-mono text-slate-600">{e.order_number}</span>
                      )}
                      {e.start_date_snapshot && (
                        <span>Starts: {new Date(e.start_date_snapshot + "T00:00:00").toLocaleDateString()}
                          {e.start_time_snapshot ? ` · ${String(e.start_time_snapshot).slice(0, 5)}` : ""}</span>
                      )}
                      {e.duration_snapshot && <span>· {e.duration_snapshot}</span>}
                      {e.instructor_snapshot && <span>· {e.instructor_snapshot}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="text-sm font-bold text-slate-900">€{e.amount_eur ?? 0}</div>
                    <StatusBadge status={e.status} />
                    {e.status === "pending" && <SendReminderButton enrollment={e} />}
                    <div className="text-xs text-slate-400">
                      {e.paid_at
                        ? new Date(e.paid_at).toLocaleDateString()
                        : e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscriptions */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Subscriptions (Medical German)</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sLoad && <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>}
            {!sLoad && subs.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No subscriptions yet.</div>
            )}
            {subs.map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">
                    {s.ssra_profiles?.full_name ?? s.ssra_profiles?.email ?? "Unknown"}
                  </div>
                  <div className="text-xs text-slate-400">
                    Renews: {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 shrink-0">
                  €{s.ssra_courses?.price_eur ?? 29}/mo
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
