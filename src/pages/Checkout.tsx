import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CreditCard, Shield, Loader2, CheckCircle2, Lock, AlertCircle, Calendar, Clock, User, Heart } from "lucide-react";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";
import { getCourse } from "@/lib/courseCatalog";
import { useToast } from "@/hooks/use-toast";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { useCourseSchedule, usePublicCourses } from "@/hooks/useSsraData";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

// Courses that use "pay what you want" donation pricing instead of fixed price.
const DONATION_COURSE_IDS = new Set(["medical-german"]);
const DONATION_SUGGESTED = [5, 10, 25, 50];
const DONATION_MIN = 1;

function fmtDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch { return d; }
}
function fmtTime(t?: string | null) { return t ? (t.length >= 5 ? t.slice(0, 5) : t) : null; }

export default function Checkout() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const courseId  = params.get("courseId") ?? "";
  const { data: publicCourses, isLoading: coursesLoading } = usePublicCourses();
  const course    = publicCourses?.find((c) => c.id === courseId) ?? (courseId === "test-course" ? getCourse(courseId) : undefined);
  const { data: schedule } = useCourseSchedule(courseId);

  const { user, profile, loading: authLoading } = useSsraAuth();

  const [showCheckout, setShowCheckout] = useState(false);

  const scheduleReady = !!(schedule?.start_date && schedule?.start_time && schedule?.duration);

  const displayName  = profile?.full_name  ?? user?.user_metadata?.full_name ?? "";
  const displayEmail = profile?.email      ?? user?.email ?? "";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?courseId=${courseId}`)}`);
    }
  }, [authLoading, user, navigate, courseId]);

  if (authLoading || (coursesLoading && !course)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BackButton className="mb-4" />
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BackButton className="mb-4" />
            <p className="text-slate-500 mb-4">Course not found.</p>
            <Link to="/pricing" className="text-[hsl(220,91%,54%)] font-semibold hover:underline">Back to pricing</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const returnUrl = `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&courseId=${course.id}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <PaymentTestModeBanner />
      <Header />
      <div className="container max-w-4xl pt-28 pb-20">
        <BackButton className="mb-8" />

        <div className="grid md:grid-cols-5 gap-8">
          {/* Order summary */}
          <div className="md:col-span-2 order-2 md:order-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sticky top-24">
              <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${course.color} mb-4`} />
              <div className="mb-4">
                <div className="font-display text-lg font-bold text-slate-900">{course.title}</div>
                <div className="text-xs text-[hsl(220,91%,54%)] mt-0.5">{course.subtitle}</div>
              </div>
              <div className="mb-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-3.5 h-3.5 text-[hsl(220,91%,54%)]" /> <span className="text-slate-400">Start date:</span> <span className="font-semibold">{fmtDate(schedule?.start_date) ?? "TBA"}</span></div>
                <div className="flex items-center gap-2 text-slate-600"><Clock className="w-3.5 h-3.5 text-[hsl(220,91%,54%)]" /> <span className="text-slate-400">Start time:</span> <span className="font-semibold">{fmtTime(schedule?.start_time) ?? "TBA"}</span></div>
                <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-3.5 h-3.5 text-[hsl(220,91%,54%)]" /> <span className="text-slate-400">Duration:</span> <span className="font-semibold">{schedule?.duration || course.weeks}</span></div>
                {schedule?.instructor_name && <div className="flex items-center gap-2 text-slate-600"><User className="w-3.5 h-3.5 text-[hsl(220,91%,54%)]" /> <span className="text-slate-400">Instructor:</span> <span className="font-semibold">{schedule.instructor_name}</span></div>}
              </div>
              {!scheduleReady && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This course is missing schedule details. Enrollment is disabled until the admin completes the setup.</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {course.type === "subscription" ? "Monthly subscription" : "One-time payment"}
                  </span>
                  <span className="font-bold font-display text-xl text-slate-900">
                    €{course.price}
                    {course.type === "subscription" && <span className="text-sm font-normal text-slate-400">/mo</span>}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Tax is calculated automatically at checkout based on your country.
                </p>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-900 leading-relaxed">
                <strong>Refund policy:</strong> Cancellations approved within 14 days are refunded at <strong>80%</strong> of the amount paid. A <strong>20% administrative fee</strong> is retained.{" "}
                <Link to="/refund-policy" className="underline">Read full policy</Link>.
              </div>
              <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                <Shield className="w-4 h-4 text-[hsl(220,91%,54%)] shrink-0" />
                Payments processed securely by Stripe. Your card details are never stored on our servers.
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="md:col-span-3 order-1 md:order-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Complete Enrolment</h2>
              <p className="text-slate-500 text-sm mb-6">Secure checkout powered by Stripe.</p>

              {/* Logged-in user info */}
              <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Lock className="w-3.5 h-3.5" /> Enrolling as
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] font-bold text-sm shrink-0">
                    {displayName?.[0] ?? displayEmail?.[0] ?? "?"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{displayName || "—"}</div>
                    <div className="text-xs text-slate-500">{displayEmail}</div>
                  </div>
                  <Link to="/dashboard/profile" className="ml-auto text-xs text-[hsl(220,91%,54%)] hover:underline shrink-0">
                    Edit profile
                  </Link>
                </div>
              </div>

              {!showCheckout && (
                <button
                  type="button"
                  onClick={() => {
                    if (!scheduleReady) {
                      toast({ title: "Setup incomplete", description: "Please contact the admin.", variant: "destructive" });
                      return;
                    }
                    setShowCheckout(true);
                  }}
                  disabled={!scheduleReady}
                  className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay €{course.price}{course.type === "subscription" ? "/mo" : ""}
                </button>
              )}

              {showCheckout && (
                <StripeEmbeddedCheckout courseId={course.id} returnUrl={returnUrl} />
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
