import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Receipt, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { useSsraAuth } from "@/hooks/useSsraAuth";

type Status = "checking" | "success" | "pending" | "error";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useSsraAuth();
  const courseId = params.get("courseId");
  const enrollmentId = params.get("enrollmentId");
  const sessionId = params.get("session_id");

  const [status, setStatus] = useState<Status>("checking");
  const [enrollment, setEnrollment] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    let attempt = 0;

    async function poll() {
      while (!cancelled && attempt < 20) {
        attempt++;
        setAttempts(attempt);
        let query = supabase
          .from("ssra_enrollments")
          .select("id, status, paid_at, amount_eur, order_number, course_title_snapshot, course_id")
          .order("created_at", { ascending: false })
          .limit(1);
        if (sessionId) query = supabase
          .from("ssra_enrollments")
          .select("id, status, paid_at, amount_eur, order_number, course_title_snapshot, course_id")
          .eq("stripe_checkout_session_id", sessionId)
          .limit(1);
        else if (enrollmentId) query = supabase
          .from("ssra_enrollments")
          .select("id, status, paid_at, amount_eur, order_number, course_title_snapshot, course_id")
          .eq("id", enrollmentId)
          .limit(1);
        else if (courseId) query = supabase
          .from("ssra_enrollments")
          .select("id, status, paid_at, amount_eur, order_number, course_title_snapshot, course_id")
          .eq("course_id", courseId)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          setStatus("error");
          return;
        }
        const row = data?.[0];
        if (row) {
          setEnrollment(row);
          if (row.status === "active" && row.paid_at) {
            setStatus("success");
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setStatus("pending");
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, enrollmentId, courseId, sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 container max-w-2xl pt-32 pb-20">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm">
          {status === "checking" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center mb-5">
                <Loader2 className="w-8 h-8 text-[hsl(220,91%,54%)] animate-spin" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Confirming your payment…</h1>
              <p className="text-slate-500 text-sm">
                We're verifying the payment with our provider. This usually takes a few seconds.
              </p>
              <p className="text-xs text-slate-400 mt-3">Check #{attempts}/20</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 mx-auto flex items-center justify-center mb-5">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Payment successful</h1>
              <p className="text-slate-500 text-sm mb-6">
                You're enrolled in{" "}
                <span className="font-semibold text-slate-800">
                  {enrollment?.course_title_snapshot ?? "your course"}
                </span>
                . A confirmation email is on its way.
              </p>

              <div className="grid grid-cols-2 gap-3 text-left mb-6">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                    <Receipt className="w-3.5 h-3.5" /> Order
                  </div>
                  <div className="font-mono text-sm font-semibold text-slate-900 break-all">
                    {enrollment?.order_number ?? "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-1">Amount</div>
                  <div className="font-semibold text-slate-900">
                    {enrollment?.amount_eur != null ? `€${Number(enrollment.amount_eur).toFixed(2)}` : "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/dashboard/courses"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,48%)]"
                >
                  Go to My Courses <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/dashboard/orders"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                >
                  View order status
                </Link>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-5">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Payment is processing</h1>
              <p className="text-slate-500 text-sm mb-6">
                Your payment was submitted but we haven't received confirmation yet. This can take a couple of minutes.
                You'll receive an email as soon as it's confirmed, and the status will appear on your Order Status page.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/dashboard/orders"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,48%)]"
                >
                  Check order status <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                >
                  Go to dashboard
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-5">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">We couldn't verify your payment</h1>
              <p className="text-slate-500 text-sm mb-6">
                If you completed the payment, please check your email — it may take a few minutes to confirm. You can
                always review the status on your Order Status page or contact support.
              </p>
              <Link
                to="/dashboard/orders"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,48%)]"
              >
                Check order status <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
