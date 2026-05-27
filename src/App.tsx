import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { useSsraAuth } from "./hooks/useSsraAuth";
import Index from "./pages/Index";

/* ── Public ── */
const Courses         = lazy(() => import("./pages/Courses"));
const About           = lazy(() => import("./pages/About"));
const Apply           = lazy(() => import("./pages/Apply"));
const Contact         = lazy(() => import("./pages/Contact"));
const Pricing         = lazy(() => import("./pages/Pricing"));
const Checkout        = lazy(() => import("./pages/Checkout"));
const PaymentSuccess  = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const StudentLogin    = lazy(() => import("./pages/StudentLogin"));

/* ── Legal pages ── */
const PrivacyPolicy      = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsConditions    = lazy(() => import("./pages/legal/TermsConditions"));
const RefundCancellation = lazy(() => import("./pages/legal/RefundCancellation"));

/* ── Student dashboard ── */
const StudentDashboard  = lazy(() => import("./pages/dashboard/StudentDashboard"));
const MyCourses         = lazy(() => import("./pages/dashboard/MyCourses"));
const MySubscription    = lazy(() => import("./pages/dashboard/MySubscription"));

/* ── Admin dashboard ── */
const AdminOverview       = lazy(() => import("./pages/ssra-admin/AdminOverview"));
const AdminCourses        = lazy(() => import("./pages/ssra-admin/AdminCourses"));
const AdminStudents       = lazy(() => import("./pages/ssra-admin/AdminStudents"));
const AdminVerifications  = lazy(() => import("./pages/ssra-admin/AdminVerifications"));
const AdminEnrollments    = lazy(() => import("./pages/ssra-admin/AdminEnrollments"));
const AdminRevenue        = lazy(() => import("./pages/ssra-admin/AdminRevenue"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 300_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <Loader2 className="w-8 h-8 animate-spin text-[hsl(220,91%,54%)]" />
  </div>
);

/* ── Auth guards ── */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSsraAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useSsraAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user)    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<Spinner />}>
              <Routes>
                {/* Public marketing */}
                <Route path="/"                 element={<Index />} />
                <Route path="/courses"          element={<Courses />} />
                <Route path="/about"            element={<About />} />
                <Route path="/apply"            element={<Apply />} />
                <Route path="/contact"          element={<Contact />} />
                <Route path="/pricing"          element={<Pricing />} />
                <Route path="/checkout"         element={<Checkout />} />
                <Route path="/payment-success"  element={<PaymentSuccess />} />
                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                <Route path="/login"            element={<StudentLogin />} />

                {/* Legal pages */}
                <Route path="/privacy"          element={<PrivacyPolicy />} />
                <Route path="/terms"            element={<TermsConditions />} />
                <Route path="/refund"           element={<RefundCancellation />} />

                {/* Student dashboard — auth required */}
                <Route path="/dashboard"              element={<RequireAuth><StudentDashboard /></RequireAuth>} />
                <Route path="/dashboard/courses"      element={<RequireAuth><MyCourses /></RequireAuth>} />
                <Route path="/dashboard/subscription" element={<RequireAuth><MySubscription /></RequireAuth>} />
                <Route path="/dashboard/*"            element={<RequireAuth><StudentDashboard /></RequireAuth>} />

                {/* Admin — admin role required */}
                <Route path="/ssra-admin"                   element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
                <Route path="/ssra-admin/courses"           element={<RequireAdmin><AdminCourses /></RequireAdmin>} />
                <Route path="/ssra-admin/students"          element={<RequireAdmin><AdminStudents /></RequireAdmin>} />
                <Route path="/ssra-admin/verifications"     element={<RequireAdmin><AdminVerifications /></RequireAdmin>} />
                <Route path="/ssra-admin/enrollments"       element={<RequireAdmin><AdminEnrollments /></RequireAdmin>} />
                <Route path="/ssra-admin/subscriptions"     element={<RequireAdmin><AdminRevenue /></RequireAdmin>} />
                <Route path="/ssra-admin/revenue"           element={<RequireAdmin><AdminRevenue /></RequireAdmin>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
