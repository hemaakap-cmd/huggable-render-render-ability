import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CreditCard, Shield, ArrowLeft, Loader2, CheckCircle2, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { getCourse } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { useMyVerification } from "@/hooks/useSsraData";

export default function Checkout() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const courseId  = params.get("courseId") ?? "";
  const course    = getCourse(courseId);

  const { user, profile, loading: authLoading } = useSsraAuth();
  const { data: verification, isLoading: vLoad } = useMyVerification();

  const [loading, setLoading] = useState(false);

  /* pre-fill from logged-in profile */
  const displayName  = profile?.full_name  ?? user?.user_metadata?.full_name ?? "";
  const displayEmail = profile?.email      ?? user?.email ?? "";

  /* redirect to login if not authenticated */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?courseId=${courseId}`)}`);
    }
  }, [authLoading, user, navigate, courseId]);

  // Read UTM params stored on landing (set by App.tsx)
  function getUtmMeta(): Record<string, string> {
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    const out: Record<string, string> = {};
    keys.forEach((k) => { const v = sessionStorage.getItem(k); if (v) out[k] = v; });
    return out;
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !user) return;
    setLoading(true);
    try {
      // If course has a direct Stripe payment link, redirect to it (test/legacy flow)
      if (course.paymentLink) {
        const url = new URL(course.paymentLink);
        if (user.email) url.searchParams.set("prefilled_email", user.email);
        window.location.href = url.toString();
        return;
      }

      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          courseId:   course.id,
          successUrl: `${origin}/payment-success?courseId=${course.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl:  `${origin}/checkout?courseId=${course.id}`,
          metadata:   getUtmMeta(),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.url) { window.location.href = data.url; }
      else throw new Error("No checkout URL returned.");
    } catch (err: unknown) {
      toast({ title: "Payment error", description: (err as Error).message, variant: "destructive" });
      setLoading(false);
    }
  }

  /* loading state */
  if (authLoading || vLoad) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
        <Footer />
      </div>
    );
  }

  /* course not found */
  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 mb-4">Course not found.</p>
            <Link to="/pricing" className="text-[hsl(220,91%,54%)] font-semibold hover:underline">Back to pricing</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* verification gate for subscription courses */
  const needsVerification = course.requires_verification;
  const isVerified        = verification?.status === "approved";
  const isPending         = verification?.status === "pending";

  if (needsVerification && !isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-32 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">Verification Required</h1>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              The <strong>{course.title}</strong> subscription is exclusively for sports science graduates and students.
              We need to verify your diploma or student ID before you can subscribe.
            </p>

            {isPending ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 mb-6 flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-blue-800">Your application is under review</div>
                  <div className="text-xs text-blue-700 mt-0.5">
                    We'll email you within 24–48 hours. Once approved, come back here to subscribe.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6 flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-amber-800">No active verification</div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    Submit your application — it takes 5 minutes. We review within 3–5 days.
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!isPending && (
                <Link to={`/apply?course=${course.id}&intent=subscribe`}>
                  <button className="w-full py-3 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
                    Submit Verification Application
                  </button>
                </Link>
              )}
              <Link to="/dashboard/subscription">
                <button className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">
                  Go to My Subscription
                </button>
              </Link>
            </div>
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
        <Link to="/pricing" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to pricing
        </Link>

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
              <ul className="space-y-1.5 mb-5">
                {course.modules.slice(0, 4).map((m) => (
                  <li key={m} className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {m}
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {course.type === "subscription" ? "Monthly subscription" : "One-time payment"}
                  </span>
                  <span className="font-bold text-slate-900 font-display text-xl">
                    €{course.price}
                    {course.type === "subscription" && <span className="text-sm font-normal text-slate-400">/mo</span>}
                  </span>
                </div>
                {course.type === "subscription" && (
                  <p className="text-xs text-slate-400 mt-1">Cancel anytime from your Stripe portal</p>
                )}
              </div>
              <div className="mt-5 flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                <Shield className="w-4 h-4 text-[hsl(220,91%,54%)] shrink-0" />
                Payments secured by Stripe. Your card details are never stored on our servers.
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="md:col-span-3 order-1 md:order-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Complete Enrolment</h2>
              <p className="text-slate-500 text-sm mb-6">
                You'll be redirected to Stripe's secure checkout to complete your payment.
              </p>

              {/* Logged-in user info — read only */}
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

              <form onSubmit={handlePay}>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe…</>
                    : <><CreditCard className="w-4 h-4" /> Continue to Secure Payment — €{course.price}{course.type === "subscription" ? "/mo" : ""}</>
                  }
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                <span>Visa</span>
                <span>Mastercard</span>
                <span>American Express</span>
                <span>Apple Pay</span>
                <span>Google Pay</span>
                <span>SEPA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
