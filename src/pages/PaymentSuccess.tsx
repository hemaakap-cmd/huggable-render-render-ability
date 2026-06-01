import { useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { getCourse } from "@/lib/stripe";

export default function PaymentSuccess() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const courseId  = params.get("courseId");
  const course    = courseId ? getCourse(courseId) : null;

  // Auto-redirect to dashboard after 6s so student sees their enrollment
  useEffect(() => {
    const t = setTimeout(() => {
      navigate(course?.type === "subscription" ? "/dashboard/subscription" : "/dashboard/courses");
    }, 6000);
    return () => clearTimeout(t);
  }, [navigate, course]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-32 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="font-display text-4xl font-bold text-slate-900 mb-3">
            Payment Successful!
          </h1>
          {course && (
            <p className="text-[hsl(220,91%,54%)] font-semibold mb-3">{course.title}</p>
          )}
          <p className="text-slate-500 leading-relaxed mb-4">
            Welcome to SSRA! Your course is now active in your dashboard.
          </p>
          <p className="text-xs text-slate-400 mb-8">Redirecting to your dashboard in a few seconds…</p>

          <div className="p-5 rounded-xl bg-white border border-slate-200 mb-8 flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-[hsl(220,91%,54%)] mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-slate-800 mb-1">Check your inbox</div>
              <div className="text-xs text-slate-500">
                We've sent your course access details and Stripe receipt. Check spam if you don't see it within 5 minutes.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/courses">
              <button className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                Browse More Courses <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/dashboard">
              <button className="btn-outline px-6 py-3 rounded-xl text-sm font-semibold">
                Go to Dashboard
              </button>
            </Link>
            <Link to="/">
              <button className="btn-outline px-6 py-3 rounded-xl text-sm font-semibold">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
