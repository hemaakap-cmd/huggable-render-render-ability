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
const Courses           = lazy(() => import("./pages/Courses"));
const CourseDetail      = lazy(() => import("./pages/CourseDetail"));
const About             = lazy(() => import("./pages/About"));
const Apply             = lazy(() => import("./pages/Apply"));
const Contact           = lazy(() => import("./pages/Contact"));
const Pricing           = lazy(() => import("./pages/Pricing"));
const Checkout          = lazy(() => import("./pages/Checkout"));
const PaymentSuccess    = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled   = lazy(() => import("./pages/PaymentCanceled"));
const StudentLogin      = lazy(() => import("./pages/StudentLogin"));
const VerifyOtp         = lazy(() => import("./pages/VerifyOtp"));
const ResetPassword     = lazy(() => import("./pages/ResetPassword"));
const Legal             = lazy(() => import("./pages/Legal"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));

/* ── Legal (local) ── */
const PrivacyPolicy      = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsConditions    = lazy(() => import("./pages/legal/TermsConditions"));
const RefundCancellation = lazy(() => import("./pages/legal/RefundCancellation"));

/* ── Student dashboard ── */
const StudentDashboard  = lazy(() => import("./pages/dashboard/StudentDashboard"));
const MyCourses         = lazy(() => import("./pages/dashboard/MyCourses"));
const MySessions        = lazy(() => import("./pages/dashboard/MySessions"));
const MySubscription    = lazy(() => import("./pages/dashboard/MySubscription"));
const MyProfile         = lazy(() => import("./pages/dashboard/MyProfile"));
const MyCertificates    = lazy(() => import("./pages/dashboard/MyCertificates"));

/* ── Admin dashboard ── */
const AdminDashboard      = lazy(() => import("./pages/ssra-admin/AdminDashboard"));
const AdminOverview       = lazy(() => import("./pages/ssra-admin/AdminOverview"));
const AdminCourses        = lazy(() => import("./pages/ssra-admin/AdminCourses"));
const AdminSessions       = lazy(() => import("./pages/ssra-admin/AdminSessions"));
const AdminAttendance     = lazy(() => import("./pages/ssra-admin/AdminAttendance"));
const AdminStudents       = lazy(() => import("./pages/ssra-admin/AdminStudents"));
const AdminVerifications  = lazy(() => import("./pages/ssra-admin/AdminVerifications"));
const AdminEnrollments    = lazy(() => import("./pages/ssra-admin/AdminEnrollments"));
const AdminRevenue        = lazy(() => import("./pages/ssra-admin/AdminRevenue"));
const AdminCertificates   = lazy(() => import("./pages/ssra-admin/AdminCertificates"));

/* ── Super Admin ── */
const SuperAdminFinance   = lazy(() => import("./pages/ssra-admin/SuperAdminFinance"));
const SuperAdminAdmins    = lazy(() => import("./pages/ssra-admin/SuperAdminAdmins"));

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

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useSsraAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user)         return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isSuperAdmin) return <Navigate to="/ssra-admin" replace />;
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
                <Route path="/"                 element={<Index />} />
                <Route path="/courses"          element={<Courses />} />
                <Route path="/courses/:id"      element={<CourseDetail />} />
                <Route path="/about"            element={<About />} />
                <Route path="/apply"            element={<Apply />} />
                <Route path="/contact"          element={<Contact />} />
                <Route path="/pricing"          element={<Pricing />} />
                <Route path="/checkout"         element={<Checkout />} />
                <Route path="/payment-success"  element={<PaymentSuccess />} />
                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                <Route path="/login"            element={<StudentLogin />} />
                <Route path="/verify-otp"       element={<VerifyOtp />} />
                <Route path="/reset-password"   element={<ResetPassword />} />
                <Route path="/legal"            element={<Legal />} />
                <Route path="/verify"           element={<VerifyCertificate />} />
                <Route path="/verify/:code"     element={<VerifyCertificate />} />

                {/* Legacy legal pages */}
                <Route path="/privacy"          element={<PrivacyPolicy />} />
                <Route path="/terms"            element={<TermsConditions />} />
                <Route path="/refund"           element={<RefundCancellation />} />

                {/* Student dashboard */}
                <Route path="/dashboard"              element={<RequireAuth><StudentDashboard /></RequireAuth>} />
                <Route path="/dashboard/courses"      element={<RequireAuth><MyCourses /></RequireAuth>} />
                <Route path="/dashboard/sessions"     element={<RequireAuth><MySessions /></RequireAuth>} />
                <Route path="/dashboard/subscription" element={<RequireAuth><MySubscription /></RequireAuth>} />
                <Route path="/dashboard/profile"      element={<RequireAuth><MyProfile /></RequireAuth>} />
                <Route path="/dashboard/certificates" element={<RequireAuth><MyCertificates /></RequireAuth>} />
                <Route path="/dashboard/*"            element={<RequireAuth><StudentDashboard /></RequireAuth>} />

                {/* Admin */}
                <Route path="/ssra-admin"                   element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                <Route path="/ssra-admin/overview"          element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
                <Route path="/ssra-admin/courses"           element={<RequireAdmin><AdminCourses /></RequireAdmin>} />
                <Route path="/ssra-admin/sessions"          element={<RequireAdmin><AdminSessions /></RequireAdmin>} />
                <Route path="/ssra-admin/attendance"        element={<RequireAdmin><AdminAttendance /></RequireAdmin>} />
                <Route path="/ssra-admin/students"          element={<RequireAdmin><AdminStudents /></RequireAdmin>} />
                <Route path="/ssra-admin/verifications"     element={<RequireAdmin><AdminVerifications /></RequireAdmin>} />
                <Route path="/ssra-admin/enrollments"       element={<RequireAdmin><AdminEnrollments /></RequireAdmin>} />
                <Route path="/ssra-admin/subscriptions"     element={<RequireAdmin><AdminRevenue /></RequireAdmin>} />
                <Route path="/ssra-admin/revenue"           element={<RequireAdmin><AdminRevenue /></RequireAdmin>} />
                <Route path="/ssra-admin/certificates"      element={<RequireAdmin><AdminCertificates /></RequireAdmin>} />

                {/* Super Admin */}
                <Route path="/ssra-admin/finance"           element={<RequireSuperAdmin><SuperAdminFinance /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/admins"            element={<RequireSuperAdmin><SuperAdminAdmins /></RequireSuperAdmin>} />

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
