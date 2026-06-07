import { lazy, Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { useSsraAuth } from "./hooks/useSsraAuth";
import { useVisitorTracker } from "./hooks/useVisitorTracker";
import Index from "./pages/Index";
import WhatsAppButton from "./components/ssra/WhatsAppButton";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner";

/* ── Public ── */
const Courses         = lazy(() => import("./pages/Courses"));
const CourseDetail    = lazy(() => import("./pages/CourseDetail"));
const VerifyOtp       = lazy(() => import("./pages/VerifyOtp"));
const About           = lazy(() => import("./pages/About"));
const Apply           = lazy(() => import("./pages/Apply"));
const Contact         = lazy(() => import("./pages/Contact"));
const Pricing         = lazy(() => import("./pages/Pricing"));
const Checkout        = lazy(() => import("./pages/Checkout"));
const PaymentSuccess  = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const StudentLogin    = lazy(() => import("./pages/StudentLogin"));
const AdminLogin      = lazy(() => import("./pages/AdminLogin"));
const ResetPassword   = lazy(() => import("./pages/ResetPassword"));
const Legal           = lazy(() => import("./pages/Legal"));
const PrivacyPolicy   = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/legal/TermsConditions"));
const RefundCancellation = lazy(() => import("./pages/legal/RefundCancellation"));

/* ── Student dashboard ── */
const StudentDashboard  = lazy(() => import("./pages/dashboard/StudentDashboard"));
const MyCourses         = lazy(() => import("./pages/dashboard/MyCourses"));
const MySessions        = lazy(() => import("./pages/dashboard/MySessions"));
const MySubscription    = lazy(() => import("./pages/dashboard/MySubscription"));
const MyProfile         = lazy(() => import("./pages/dashboard/MyProfile"));
const MyCertificates    = lazy(() => import("./pages/dashboard/MyCertificates"));

/* ── Verify ── */
const VerifyCertificate   = lazy(() => import("./pages/VerifyCertificate"));

/* ── Admin dashboard ── */
const AdminDashboard      = lazy(() => import("./pages/ssra-admin/AdminDashboard"));
const AdminOverview       = lazy(() => import("./pages/ssra-admin/AdminOverview"));
const AdminVerifications  = lazy(() => import("./pages/ssra-admin/AdminVerifications"));
const AdminCourses        = lazy(() => import("./pages/ssra-admin/AdminCourses"));
const AdminSessions       = lazy(() => import("./pages/ssra-admin/AdminSessions"));
const AdminStudents       = lazy(() => import("./pages/ssra-admin/AdminStudents"));
const AdminAttendance     = lazy(() => import("./pages/ssra-admin/AdminAttendance"));
const AdminEnrollments    = lazy(() => import("./pages/ssra-admin/AdminEnrollments"));
const AdminRevenue        = lazy(() => import("./pages/ssra-admin/AdminRevenue"));
/* ── Super Admin ── */
const SuperAdminFinance   = lazy(() => import("./pages/ssra-admin/SuperAdminFinance"));
const SuperAdminAdmins    = lazy(() => import("./pages/ssra-admin/SuperAdminAdmins"));
const SuperAdminActivity  = lazy(() => import("./pages/ssra-admin/SuperAdminActivity"));
const SuperAdminViewAs    = lazy(() => import("./pages/ssra-admin/SuperAdminViewAs"));
const SuperAdminSyncStatus = lazy(() => import("./pages/ssra-admin/SuperAdminSyncStatus"));
const SuperAdminManualGrant = lazy(() => import("./pages/ssra-admin/SuperAdminManualGrant"));
const SuperAdminStudentReports = lazy(() => import("./pages/ssra-admin/SuperAdminStudentReports"));
const AdminLiveVisitors    = lazy(() => import("./pages/ssra-admin/AdminLiveVisitors"));
const AdminWaitlist        = lazy(() => import("./pages/ssra-admin/AdminWaitlist"));
const AdminCoupons         = lazy(() => import("./pages/ssra-admin/AdminCoupons"));
const AdminAuditLog        = lazy(() => import("./pages/ssra-admin/AdminAuditLog"));
const AdminReports         = lazy(() => import("./pages/ssra-admin/AdminReports"));
const AdminInstructors     = lazy(() => import("./pages/ssra-admin/AdminInstructors"));
const AdminBatches         = lazy(() => import("./pages/ssra-admin/AdminBatches"));
const AdminHomework        = lazy(() => import("./pages/ssra-admin/AdminHomework"));
const AdminFraud           = lazy(() => import("./pages/ssra-admin/AdminFraud"));
const AdminSystemHealth    = lazy(() => import("./pages/ssra-admin/AdminSystemHealth"));
const AdminOperations      = lazy(() => import("./pages/ssra-admin/AdminOperations"));
const AdminCertificates    = lazy(() => import("./pages/ssra-admin/AdminCertificates"));
const AdminCancellations   = lazy(() => import("./pages/ssra-admin/AdminCancellations"));

/* ── Instructor dashboard ── */
const InstructorDashboard  = lazy(() => import("./pages/instructor/InstructorDashboard"));
const InstructorCourses    = lazy(() => import("./pages/instructor/InstructorCourses"));
const InstructorStudents   = lazy(() => import("./pages/instructor/InstructorStudents"));
const InstructorAttendance = lazy(() => import("./pages/instructor/InstructorAttendance"));
const InstructorSessions   = lazy(() => import("./pages/instructor/InstructorSessions"));
const InstructorMaterials  = lazy(() => import("./pages/instructor/InstructorMaterials"));
const InstructorHomework   = lazy(() => import("./pages/instructor/InstructorHomework"));

/* ── Student dashboard extras ── */
const MyHomework           = lazy(() => import("./pages/dashboard/MyHomework"));

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

function RequireInstructor({ children }: { children: React.ReactNode }) {
  const { user, isInstructor, loading } = useSsraAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user)          return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isInstructor)  return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useSsraAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user)          return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isSuperAdmin)  return <Navigate to="/ssra-admin" replace />;
  return <>{children}</>;
}

function AppInner() {
  // Capture UTM params from social media traffic on first landing
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => {
      const v = p.get(k);
      if (v) sessionStorage.setItem(k, v);
    });
  }, []);

  // Live visitor tracking (skips admin/dashboard routes internally)
  useVisitorTracker();

  return (
    <>
      <PaymentTestModeBanner />
      <Suspense fallback={<Spinner />}>
        <Routes>
                {/* Public marketing */}
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
                <Route path="/staff-login"      element={<AdminLogin />} />
                <Route path="/reset-password"  element={<ResetPassword />} />
                <Route path="/legal"           element={<Legal />} />
                <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
                <Route path="/privacy"         element={<PrivacyPolicy />} />
                <Route path="/terms"           element={<TermsConditions />} />
                <Route path="/terms-of-service" element={<TermsConditions />} />
                <Route path="/terms-and-conditions" element={<TermsConditions />} />
                <Route path="/refund-policy"   element={<RefundCancellation />} />
                <Route path="/refund"          element={<RefundCancellation />} />
                <Route path="/verify/:code"    element={<VerifyCertificate />} />
                <Route path="/verify"          element={<VerifyCertificate />} />

                {/* Student dashboard — auth required */}
                <Route path="/dashboard"              element={<RequireAuth><StudentDashboard /></RequireAuth>} />
                <Route path="/dashboard/courses"      element={<RequireAuth><MyCourses /></RequireAuth>} />
                <Route path="/dashboard/sessions"     element={<RequireAuth><MySessions /></RequireAuth>} />
                <Route path="/dashboard/subscription" element={<RequireAuth><MySubscription /></RequireAuth>} />
                <Route path="/dashboard/profile"       element={<RequireAuth><MyProfile /></RequireAuth>} />
                <Route path="/dashboard/certificates" element={<RequireAuth><MyCertificates /></RequireAuth>} />
                <Route path="/dashboard/homework"     element={<RequireAuth><MyHomework /></RequireAuth>} />
                <Route path="/dashboard/*"            element={<RequireAuth><StudentDashboard /></RequireAuth>} />

                {/* Admin — admin role required */}
                <Route path="/ssra-admin"                   element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                <Route path="/ssra-admin/overview"          element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
                <Route path="/ssra-admin/courses"           element={<RequireAdmin><AdminCourses /></RequireAdmin>} />
                <Route path="/ssra-admin/sessions"          element={<RequireAdmin><AdminSessions /></RequireAdmin>} />
                <Route path="/ssra-admin/attendance"        element={<RequireAdmin><AdminAttendance /></RequireAdmin>} />
                <Route path="/ssra-admin/students"          element={<RequireAdmin><AdminStudents /></RequireAdmin>} />
                <Route path="/ssra-admin/enrollments"       element={<RequireAdmin><AdminEnrollments /></RequireAdmin>} />
                <Route path="/ssra-admin/revenue"           element={<RequireAdmin><AdminRevenue /></RequireAdmin>} />
                <Route path="/ssra-admin/live"              element={<RequireAdmin><AdminLiveVisitors /></RequireAdmin>} />
                <Route path="/ssra-admin/verifications"     element={<RequireAdmin><AdminVerifications /></RequireAdmin>} />
                <Route path="/ssra-admin/waitlist"          element={<RequireAdmin><AdminWaitlist /></RequireAdmin>} />
                <Route path="/ssra-admin/coupons"           element={<RequireAdmin><AdminCoupons /></RequireAdmin>} />
                <Route path="/ssra-admin/audit-log"         element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />
                <Route path="/ssra-admin/reports"           element={<RequireAdmin><AdminReports /></RequireAdmin>} />
                <Route path="/ssra-admin/instructors"       element={<RequireAdmin><AdminInstructors /></RequireAdmin>} />
                <Route path="/ssra-admin/batches"           element={<RequireAdmin><AdminBatches /></RequireAdmin>} />
                <Route path="/ssra-admin/homework"          element={<RequireAdmin><AdminHomework /></RequireAdmin>} />
                <Route path="/ssra-admin/fraud"             element={<RequireAdmin><AdminFraud /></RequireAdmin>} />
                <Route path="/ssra-admin/certificates"      element={<RequireAdmin><AdminCertificates /></RequireAdmin>} />
                <Route path="/ssra-admin/cancellations"     element={<RequireAdmin><AdminCancellations /></RequireAdmin>} />

                {/* Instructor panel */}
                <Route path="/instructor"                   element={<RequireInstructor><InstructorDashboard /></RequireInstructor>} />
                <Route path="/instructor/courses"           element={<RequireInstructor><InstructorCourses /></RequireInstructor>} />
                <Route path="/instructor/students"          element={<RequireInstructor><InstructorStudents /></RequireInstructor>} />
                <Route path="/instructor/attendance"        element={<RequireInstructor><InstructorAttendance /></RequireInstructor>} />
                <Route path="/instructor/sessions"          element={<RequireInstructor><InstructorSessions /></RequireInstructor>} />
                <Route path="/instructor/materials"         element={<RequireInstructor><InstructorMaterials /></RequireInstructor>} />
                <Route path="/instructor/homework"          element={<RequireInstructor><InstructorHomework /></RequireInstructor>} />

                {/* Super Admin only */}
                <Route path="/ssra-admin/system-health"     element={<RequireSuperAdmin><AdminSystemHealth /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/operations"        element={<RequireSuperAdmin><AdminOperations /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/finance"           element={<RequireSuperAdmin><SuperAdminFinance /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/admins"            element={<RequireSuperAdmin><SuperAdminAdmins /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/activity"          element={<RequireSuperAdmin><SuperAdminActivity /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/view-as/:userId"  element={<RequireSuperAdmin><SuperAdminViewAs /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/sync-status"      element={<RequireSuperAdmin><SuperAdminSyncStatus /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/manual-grant"     element={<RequireSuperAdmin><SuperAdminManualGrant /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/student-reports"  element={<RequireSuperAdmin><SuperAdminStudentReports /></RequireSuperAdmin>} />
                <Route path="/ssra-super-admin/student-reports" element={<RequireSuperAdmin><SuperAdminStudentReports /></RequireSuperAdmin>} />

                <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <WhatsAppButton />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppInner />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
