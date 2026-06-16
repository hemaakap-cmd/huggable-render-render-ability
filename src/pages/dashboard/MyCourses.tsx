import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, ShoppingBag, XCircle, Clock, PlayCircle, Video, Calendar, User } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyEnrollments, useMySubscription } from "@/hooks/useSsraData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CancelEnrollmentDialog from "@/components/ssra/CancelEnrollmentDialog";
import { resolveCourseMeta, formatCourseDate } from "@/lib/courseDefaults";

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
  const subscribedCourseId = (subscription as any)?.course_id ?? null;

  // Build the unified course list. Subscription course appears once.
  // If the user also has an enrollment row for that course, we mark the
  // enrollment as the "subscription" view instead of rendering twice.
  const enrollmentMap = new Map<string, any>();
  (enrollments as any[]).forEach((e) => { if (e.course_id) enrollmentMap.set(e.course_id, e); });

  const courses: Array<{
    kind: "subscription" | "enrollment";
    id: string;
    courseId: string;
    title: string;
    paidAt: string | null;
    enrolledAt: string | null;
  }> = [];

  if (hasActiveSub && subscribedCourseId) {
    const e = enrollmentMap.get(subscribedCourseId);
    courses.push({
      kind: "subscription",
      id: e?.id ?? `sub-${subscribedCourseId}`,
      courseId: subscribedCourseId,
      title: (subscription as any)?.ssra_courses?.title ?? e?.course_title_snapshot ?? "Medical German",
      paidAt: e?.paid_at ?? null,
      enrolledAt: e?.enrolled_at ?? subscription?.current_period_end ?? null,
    });
    enrollmentMap.delete(subscribedCourseId);
  }

  enrollmentMap.forEach((e) => {
    courses.push({
      kind: "enrollment",
      id: e.id,
      courseId: e.course_id,
      title: e.ssra_courses?.title ?? e.course_title_snapshot ?? "—",
      paidAt: e.paid_at ?? null,
      enrolledAt: e.enrolled_at ?? null,
    });
  });

  const paidAtByEnrollment = new Map<string, string | null>();
  (enrollments as any[]).forEach((e: any) => paidAtByEnrollment.set(e.id, e.paid_at ?? null));
  const reqByEnrollment = new Map<string, { status: string }>();
  (cancelRequests as any[]).forEach((r: any) => {
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
          <h1 className="font-display text-2xl font-bold text-slate-900">My Active Courses</h1>
          <p className="text-slate-500 text-sm mt-1">Continue learning, join your live sessions, and track your enrolments.</p>
        </div>

        {eLoad ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <div className="text-slate-500 text-sm mb-2">No active courses yet.</div>
            <div className="text-slate-400 text-xs mb-6">Browse our catalogue and start learning today.</div>
            <Link to="/courses">
              <button className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">Browse Courses</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((c) => {
              const meta = resolveCourseMeta(c.courseId, null);
              const req = c.kind === "enrollment" ? reqByEnrollment.get(c.id) : undefined;
              const days = daysRemaining(c.paidAt);
              const eligible = c.kind === "enrollment" && !!c.paidAt && days > 0 && !req;

              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Header strip */}
                  <div className={`px-6 py-4 flex items-center justify-between gap-3 ${
                    c.kind === "subscription" ? "bg-gradient-to-r from-[hsl(220,91%,54%)] to-[hsl(220,91%,44%)] text-white" : "bg-slate-50 text-slate-900"
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        c.kind === "subscription" ? "bg-white/15" : "bg-[hsl(220,91%,54%)]/10"
                      }`}>
                        <BookOpen className={`w-5 h-5 ${c.kind === "subscription" ? "text-white" : "text-[hsl(220,91%,54%)]"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">{c.title}</div>
                        <div className={`text-xs ${c.kind === "subscription" ? "text-white/70" : "text-slate-500"}`}>
                          {c.kind === "subscription" ? "Active monthly support" : "Active enrolment"}
                        </div>
                      </div>
                    </div>
                    <span className={`hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      c.kind === "subscription" ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {c.kind === "subscription" ? "Subscription" : "Enrolled"}
                    </span>
                  </div>

                  {/* Body — Course Information */}
                  <div className="p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                        <span className="text-slate-400">Starts:</span>
                        <span className="font-semibold text-slate-800">{formatCourseDate(new Date(meta.startDateISO + "T00:00:00"))}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                        <span className="text-slate-400">Time:</span>
                        <span className="font-semibold text-slate-800">{meta.startTime} {meta.timezoneLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                        <span className="text-slate-400">Instructor:</span>
                        <span className="font-semibold text-slate-800">{meta.instructor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Video className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                        <span className="text-slate-400">Duration:</span>
                        <span className="font-semibold text-slate-800">{meta.durationLabel}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link to="/dashboard/materials" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
                        <PlayCircle className="w-4 h-4" /> Start Learning
                      </Link>
                      <Link to="/dashboard/sessions" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                        <Video className="w-4 h-4" /> Join live session
                      </Link>
                    </div>

                    {/* Cancellation row (enrollments only) */}
                    {c.kind === "enrollment" && (
                      <div className="pt-4 border-t border-slate-100 text-xs">
                        {req ? (
                          <div className="flex items-center gap-2">
                            {req.status === "pending" && (<><Clock className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-700 font-medium">Cancellation pending review</span></>)}
                            {req.status === "rejected" && (<><XCircle className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-500">Cancellation request declined</span></>)}
                            {(req.status === "approved" || req.status === "refunded") && (<span className="text-slate-500">Cancellation processed</span>)}
                          </div>
                        ) : eligible ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">{days} day{days === 1 ? "" : "s"} left to cancel</span>
                            <button
                              onClick={() => setCancelTarget({ id: c.id, title: c.title, days })}
                              className="text-red-600 font-semibold hover:underline">
                              Request cancellation
                            </button>
                          </div>
                        ) : (
                          <div className="text-slate-400">
                            {c.paidAt ? "14-day cancellation window has ended" : "Cancellation available after payment is confirmed"}
                          </div>
                        )}
                      </div>
                    )}

                    {c.kind === "subscription" && (
                      <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
                        <span>Cancel anytime from your subscription page.</span>
                        <Link to="/dashboard/subscription" className="text-[hsl(220,91%,54%)] font-semibold hover:underline">
                          Manage
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800 text-sm">Looking for more courses?</div>
            <div className="text-xs text-slate-500 mt-0.5">Browse our full catalogue of programmes.</div>
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
