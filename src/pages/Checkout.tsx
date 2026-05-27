import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CreditCard, Shield, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { getCourse } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [params]  = useSearchParams();
  const { toast } = useToast();
  const courseId  = params.get("courseId") ?? "";
  const course    = getCourse(courseId);

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId:       course.priceId,
          mode:          course.type === "subscription" ? "subscription" : "payment",
          customerEmail: email,
          successUrl:    `${origin}/payment-success?courseId=${course.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl:     `${origin}/checkout?courseId=${course.id}`,
          metadata:      { courseName: course.title, studentName: name },
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

              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  <p className="text-xs text-slate-400 mt-1">Your receipt and course access will be sent here.</p>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe…</>
                      : <><CreditCard className="w-4 h-4" /> Continue to Secure Payment</>
                    }
                  </button>
                </div>
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
