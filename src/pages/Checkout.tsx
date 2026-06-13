import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CreditCard, Shield, ArrowLeft, Loader2, CheckCircle2, Lock, AlertCircle, Calendar, Clock, User, Tag, X } from "lucide-react";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";
import { getCourse } from "@/lib/courseCatalog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { useCourseSchedule, usePublicCourses } from "@/hooks/useSsraData";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

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
  const { enabled: couponsEnabled } = useFeatureFlag("coupons_enabled");

  const [loading, setLoading] = useState(false);

  const [couponCode,    setCouponCode]    = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState<string | null>(null);
  const [couponApplied, setCouponApplied] = useState<{
    code: string; discountType: string; discountValue: number; finalDiscount: number;
  } | null>(null);

  const scheduleReady = !!(schedule?.start_date && schedule?.start_time && schedule?.duration);

  const displayName  = profile?.full_name  ?? user?.user_metadata?.full_name ?? "";
  const displayEmail = profile?.email      ?? user?.email ?? "";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?courseId=${courseId}`)}`);
    }
  }, [authLoading, user, navigate, courseId]);

  function getUtmMeta(): Record<string, string> {
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    const out: Record<string, string> = {};
    keys.forEach((k) => { const v = sessionStorage.getItem(k); if (v) out[k] = v; });
    return out;
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim() || !course) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-coupon", {
        body: { code: couponCode.trim().toUpperCase(), courseId: course.id, amountEur: course.price },
      });
      if (error) throw new Error(error.message);
      if (!data?.valid) {
        setCouponError(data?.errorReason ?? "Invalid coupon code.");
        setCouponApplied(null);
      } else {
        setCouponApplied({
          code:          couponCode.trim().toUpperCase(),
          discountType:  data.discountType,
          discountValue: data.discountValue,
          finalDiscount: data.finalDiscount,
        });
        setCouponError(null);
      }
    } catch (err: unknown) {
      setCouponError((err as Error).message);
    } finally {
      setCouponLoading(false);
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !user) return;
    setLoading(true);
    try {
      // 1. Create pending enrollment row and get Paddle external price ID
      const { data, error } = await supabase.functions.invoke("paddle-prepare-checkout", {
        body: {
          courseId: course.id,
          couponCode: couponApplied?.code ?? null,
          metadata: getUtmMeta(),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.alreadyEnrolled) {
        toast({
          title: "You're already enrolled ✅",
          description: "This course is already in your dashboard. Redirecting you there…",
        });
        setTimeout(() => navigate("/dashboard/courses"), 1500);
        return;
      }
      if (!data?.paddlePriceId) throw new Error("Could not prepare checkout. Please try again.");

      const enrollmentId: string | undefined = data.customData?.enrollmentId;

      // 2. Init Paddle.js (cached after first call)
      await initializePaddle();

      // 3. Resolve external price ID → Paddle internal price ID (pri_xxx)
      const internalPriceId = await getPaddlePriceId(data.paddlePriceId);

      // 4. Open Paddle checkout overlay
      const successUrl = `${window.location.origin}/payment-success?courseId=${course.id}${enrollmentId ? `&enrollmentId=${enrollmentId}` : ""}`;

      window.Paddle.Checkout.open({
        items: [{ priceId: internalPriceId, quantity: 1 }],
        ...(data.paddleDiscountId ? { discountId: data.paddleDiscountId } : {}),
        customData: data.customData,
        customer: { email: user.email ?? undefined },
        settings: {
          successUrl,
          allowedPaymentMethods: ["card", "paypal"],
        },
      });
    } catch (err: unknown) {
      toast({ title: "Payment error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-slate-50">
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
                  <span className={`font-bold font-display text-xl ${couponApplied ? "line-through text-slate-400 text-base" : "text-slate-900"}`}>
                    €{course.price}
                    {!couponApplied && course.type === "subscription" && <span className="text-sm font-normal text-slate-400">/mo</span>}
                  </span>
                </div>
                {couponApplied && (
                  <>
                    <div className="flex items-center justify-between text-emerald-700 text-sm">
                      <span>Discount ({couponApplied.code})</span>
                      <span>− €{couponApplied.finalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="text-sm">Total</span>
                      <span className="font-display text-xl">
                        €{Math.max(0, course.price - couponApplied.finalDiscount).toFixed(2)}
                        {course.type === "subscription" && <span className="text-sm font-normal text-slate-400">/mo</span>}
                      </span>
                    </div>
                  </>
                )}
                {!couponApplied && course.type === "subscription" && (
                  <p className="text-xs text-slate-400">Cancel anytime at paddle.net. See refund policy below.</p>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Prices are <strong>tax-exclusive</strong>. VAT / sales tax is calculated automatically at checkout based on your country and shown as a separate line (Course price + VAT = Total).
                </p>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-900 leading-relaxed">
                <strong>Refund policy:</strong> Cancellations approved within 14 days are refunded at <strong>80%</strong> of the amount paid. A <strong>20% administrative fee</strong> is retained. Example: €19.00 paid → €3.80 fee → €15.20 refund.{" "}
                <Link to="/refund-policy" className="underline">Read full policy</Link>.
              </div>
              <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                <Shield className="w-4 h-4 text-[hsl(220,91%,54%)] shrink-0" />
                Payments processed securely by Paddle.com (Merchant of Record). Invoices, receipts and emails are issued under SSRA Academy. Your card details are never stored on our servers.
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="md:col-span-3 order-1 md:order-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Complete Enrolment</h2>
              <p className="text-slate-500 text-sm mb-6">
                A secure Paddle checkout will open to complete your payment.
              </p>

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

              {/* Coupon code (admin-controlled) */}
              {couponsEnabled && (
                <div className="mb-5">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Coupon code
                  </label>
                  {couponApplied ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-sm text-emerald-700 font-semibold flex-1">{couponApplied.code} applied</span>
                      <button
                        type="button"
                        onClick={() => { setCouponApplied(null); setCouponCode(""); }}
                        className="text-emerald-500 hover:text-emerald-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApplyCoupon(); }}}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => void handleApplyCoupon()}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handlePay}>
                <button type="submit" disabled={loading || !scheduleReady}
                  className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</>
                    : !scheduleReady
                      ? "Setup incomplete — contact admin"
                      : <><CreditCard className="w-4 h-4" /> Pay €{couponApplied
                          ? Math.max(0, course.price - couponApplied.finalDiscount).toFixed(2)
                          : course.price}{course.type === "subscription" ? "/mo" : ""} via Paddle</>
                  }
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                <span>Visa</span>
                <span>Mastercard</span>
                <span>American Express</span>
                <span>Apple Pay</span>
                <span>Google Pay</span>
                <span>PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
