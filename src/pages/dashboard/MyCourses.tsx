import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, ArrowRight, ShoppingBag, XCircle, Clock } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyEnrollments, useMySubscription } from "@/hooks/useSsraData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CancelEnrollmentDialog from "@/components/ssra/CancelEnrollmentDialog";

const CANCEL_WINDOW_DAYS = 14;

function useMyCancellationRequests() {
  return useQuery({
    queryKey: ["ssra-cancel-requests-me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_cancellation_requests")
        .select("id, enrollment_id, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function MyCourses() {
  const { data: enrollments = [], isLoading: eLoad } = useMyEnrollments();
  const { data: subscription }                       = useMySubscription();
  const { data: cancelRequests = [] }                = useMyCancellationRequests();
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<{ id: string; title: string; days: number } | null>(null);

  const hasActiveSub = subscription?.status === "active" || subscription?.status === "trialing";

  // Only consider cancellation requests created AFTER the enrollment's latest payment.
  // A re-enrollment (new paid_at) supersedes any prior pending/rejected request on the same row.
  const paidAtByEnrollment = new Map<string, string | null>();
  enrollments.forEach((e: any) => paidAtByEnrollment.set(e.id, e.paid_at ?? null));
  const reqByEnrollment = new Map<string, { status: string }>();
  cancelRequests.forEach((r: any) => {
    const paidAt = paidAtByEnrollment.get(r.enrollment_id);
    if (paidAt && new Date(r.created_at).getTime() < new Date(paidAt).getTime()) return;
    if (!reqByEnrollment.has(r.enrollment_id)) reqByEnrollment.set(r.enrollment_id, { status: r.status });
  });

  const daysRemaining = (paidAt?: string | null) => {
    if (!paidAt) return 0;
    const elapsed = (Date.now() - new Date(paidAt).getTime()) / 86_400_000;
    return Math.max(0, Math.ceil(CANCEL_WINDOW_DAYS - elapsed));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 text-sm mt-1">All your enrolled courses and active subscriptions.</p>
        </div>

        {hasActiveSub && subscription && (
          <div className="bg-gradient-to-r from-[hsl(220,91%,54%)] to-[hsl(220,91%,44%)] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-white/70" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Active Subscription</span>
            </div>
            <div className="font-display text-xl font-bold">{(subscription as any).ssra_courses?.title ?? "Medical German"}</div>
            <div className="text-white/60 text-sm mt-1">
              Renews {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString("en-DE", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </div>
            <Link to="/dashboard/subscription">
              <button className="mt-4 text-xs font-semibold text-white/80 border border-white/25 px-4 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1">
                Manage subscription <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-slate-800 mb-4">
            One-time Enrollments
            {!eLoad && <span className="ml-2 text-sm font-normal text-slate-400">({enrollments.length})</span>}
          </h2>

          {eLoad ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <div className="text-slate-500 text-sm mb-2">No one-time enrollments yet.</div>
              <div className="text-slate-400 text-xs mb-6">Browse our catalogue and enrol in a course to get started.</div>
              <Link to="/courses">
                <button className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
                  Browse Courses
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {enrollments.map((e: any) => {
                const req = reqByEnrollment.get(e.id);
                const days = daysRemaining(e.paid_at);
                const eligible = !!e.paid_at && days > 0 && !req;
                return (
                  <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[hsl(220,91%,54%)]/30 hover:shadow-md transition-all flex flex-col">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(220,91%,54%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-sm">{e.ssra_courses?.title ?? e.course_title_snapshot ?? "—"}</div>
                        <div className="text-xs text-slate-400 mt-0.5 capitalize">{e.ssra_courses?.category} course</div>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Active
                          </span>
                          <span className="text-xs text-slate-400">
                            Enrolled {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                      {req ? (
                        <div className="flex items-center gap-2">
                          {req.status === "pending" && (<><Clock className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-700 font-medium">Cancellation pending review</span></>)}
                          {req.status === "rejected" && (<><XCircle className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-500">Cancellation request declined</span></>)}
                          {(req.status === "approved" || req.status === "refunded") && (<span className="text-slate-500">Cancellation processed</span>)}
                        </div>
                      ) : eligible ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">
                            {days} day{days === 1 ? "" : "s"} left to cancel
                          </span>
                          <button
                            onClick={() => setCancelTarget({ id: e.id, title: e.ssra_courses?.title ?? e.course_title_snapshot ?? "this course", days })}
                            className="text-red-600 font-semibold hover:underline">
                            Request cancellation
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          {e.paid_at ? "14-day cancellation window has ended" : "Cancellation available after payment is confirmed"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800 text-sm">Looking for more courses?</div>
            <div className="text-xs text-slate-500 mt-0.5">Browse our full catalogue of 9 programmes.</div>
          </div>
          <Link to="/courses">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
              Browse <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      {cancelTarget && (
        <CancelEnrollmentDialog
          enrollmentId={cancelTarget.id}
          courseTitle={cancelTarget.title}
          daysRemaining={cancelTarget.days}
          onClose={() => setCancelTarget(null)}
          onSubmitted={() => qc.invalidateQueries({ queryKey: ["ssra-cancel-requests-me"] })}
        />
      )}
    </DashboardLayout>
  );
}
