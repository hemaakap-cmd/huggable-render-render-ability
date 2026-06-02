import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Mail, Calendar, Clock, User, Loader2 } from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { getCourse } from "@/lib/stripe";
import { useEnrollmentBySession } from "@/hooks/useSsraData";

function formatDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}
function formatTime(t?: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const courseId  = params.get("courseId");
  const fallbackCourse = courseId ? getCourse(courseId) : null;

  const { data: enrollment, isLoading } = useEnrollmentBySession(sessionId);

  const courseTitle = enrollment?.course_title_snapshot ?? fallbackCourse?.title ?? "Your course";
  const isSubscription = fallbackCourse?.type === "subscription";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="font-display text-4xl font-bold text-slate-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-slate-500">
              Welcome to SSRA — your enrollment is confirmed.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
            {sessionId && isLoading && !enrollment ? (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Finalising your enrollment…
              </div>
            ) : (
              <>
                <div className="mb-5 pb-5 border-b border-slate-100">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Course</div>
                  <div className="font-display text-xl font-bold text-slate-900">{courseTitle}</div>
                  {enrollment?.order_number && (
                    <div className="text-xs text-slate-500 mt-2">
                      Order: <span className="font-mono text-slate-700">{enrollment.order_number}</span>
                    </div>
                  )}
                </div>

                {(enrollment?.start_date_snapshot || enrollment?.start_time_snapshot || enrollment?.duration_snapshot || enrollment?.instructor_snapshot) && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    {enrollment?.start_date_snapshot && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-[hsl(220,91%,54%)] mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-400">Start date</div>
                          <div className="text-sm font-medium text-slate-800">{formatDate(enrollment.start_date_snapshot)}</div>
                        </div>
                      </div>
                    )}
                    {enrollment?.start_time_snapshot && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-[hsl(220,91%,54%)] mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-400">Start time</div>
                          <div className="text-sm font-medium text-slate-800">{formatTime(enrollment.start_time_snapshot)}</div>
                        </div>
                      </div>
                    )}
                    {enrollment?.duration_snapshot && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-[hsl(220,91%,54%)] mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-400">Duration</div>
                          <div className="text-sm font-medium text-slate-800">{enrollment.duration_snapshot}</div>
                        </div>
                      </div>
                    )}
                    {enrollment?.instructor_snapshot && (
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-[hsl(220,91%,54%)] mt-0.5" />
                        <div>
                          <div className="text-xs text-slate-400">Instructor</div>
                          <div className="text-sm font-medium text-slate-800">{enrollment.instructor_snapshot}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {enrollment?.amount_eur != null && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">Amount paid</span>
                    <span className="font-bold text-slate-900">€{Number(enrollment.amount_eur).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 mb-8 flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-[hsl(220,91%,54%)] mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-800 mb-1">Check your inbox</div>
              <div className="text-xs text-slate-500">
                We've sent your payment receipt and full enrollment details by email. Check spam if you don't see them within 5 minutes.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={isSubscription ? "/dashboard/subscription" : "/dashboard/courses"}>
              <button className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 w-full sm:w-auto justify-center">
                Access your course <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/courses">
              <button className="btn-outline px-6 py-3 rounded-xl text-sm font-semibold w-full sm:w-auto">
                Browse more courses
              </button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
