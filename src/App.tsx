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
import Index from "./pages/Index";
import WhatsAppButton from "./components/ssra/WhatsAppButton";

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
const AdminLogin      = lazy(() => import("./pages/AdminLogin"));
const ResetPassword   = lazy(() => import("./pages/ResetPassword"));
const Legal           = lazy(() => import("./pages/Legal"));

/* ── Student dashboard ── */
const StudentDashboard  = lazy(() => import("./pages/dashboard/StudentDashboard"));
const MyCourses         = lazy(() => import("./pages/dashboard/MyCourses"));
const MySessions        = lazy(() => import("./pages/dashboard/MySessions"));
const MySubscription    = lazy(() => import("./pages/dashboard/MySubscription"));
const MyProfile         = lazy(() => import("./pages/dashboard/MyProfile"));

/* ── Admin dashboard ── */
const AdminDashboard      = lazy(() => import("./pages/ssra-admin/AdminDashboard"));
const AdminOverview       = lazy(() => import("./pages/ssra-admin/AdminOverview"));
const AdminCourses        = lazy(() => import("./pages/ssra-admin/AdminCourses"));
const AdminSessions       = lazy(() => import("./pages/ssra-admin/AdminSessions"));
const AdminStudents       = lazy(() => import("./pages/ssra-admin/AdminStudents"));
const AdminAttendance     = lazy(() => import("./pages/ssra-admin/AdminAttendance"));
const AdminVerifications  = lazy(() => import("./pages/ssra-admin/AdminVerifications"));
const AdminEnrollments    = lazy(() => import("./pages/ssra-admin/AdminEnrollments"));
const AdminRevenue        = lazy(() => import("./pages/ssra-admin/AdminRevenue"));
/* ── Super Admin ── */
const SuperAdminFinance   = lazy(() => import("./pages/ssra-admin/SuperAdminFinance"));
const SuperAdminAdmins    = lazy(() => import("./pages/ssra-admin/SuperAdminAdmins"));
const SuperAdminActivity  = lazy(() => import("./pages/ssra-admin/SuperAdminActivity"));
const SuperAdminViewAs    = lazy(() => import("./pages/ssra-admin/SuperAdminViewAs"));
const SuperAdminSyncStatus = lazy(() => import("./pages/ssra-admin/SuperAdminSyncStatus"));
const SuperAdminManualGrant = lazy(() => import("./pages/ssra-admin/SuperAdminManualGrant"));

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

  return (
    <>
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
                <Route path="/staff-login"      element={<AdminLogin />} />
                <Route path="/reset-password"  element={<ResetPassword />} />
                <Route path="/legal"           element={<Legal />} />

                {/* Student dashboard — auth required */}
                <Route path="/dashboard"              element={<RequireAuth><StudentDashboard /></RequireAuth>} />
                <Route path="/dashboard/courses"      element={<RequireAuth><MyCourses /></RequireAuth>} />
                <Route path="/dashboard/sessions"     element={<RequireAuth><MySessions /></RequireAuth>} />
                <Route path="/dashboard/subscription" element={<RequireAuth><MySubscription /></RequireAuth>} />
                <Route path="/dashboard/profile"      element={<RequireAuth><MyProfile /></RequireAuth>} />
                <Route path="/dashboard/*"            element={<RequireAuth><StudentDashboard /></RequireAuth>} />

                {/* Admin — admin role required */}
                <Route path="/ssra-admin"                   element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                <Route path="/ssra-admin/overview"          element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
                <Route path="/ssra-admin/courses"           element={<RequireAdmin><AdminCourses /></RequireAdmin>} />
                <Route path="/ssra-admin/sessions"          element={<RequireAdmin><AdminSessions /></RequireAdmin>} />
                <Route path="/ssra-admin/attendance"        element={<RequireAdmin><AdminAttendance /></RequireAdmin>} />
                <Route path="/ssra-admin/students"          element={<RequireAdmin><AdminStudents /></RequireAdmin>} />
                <Route path="/ssra-admin/verifications"     element={<RequireAdmin><AdminVerifications /></RequireAdmin>} />
                <Route path="/ssra-admin/enrollments"       element={<RequireAdmin><AdminEnrollments /></RequireAdmin>} />
                <Route path="/ssra-admin/revenue"           element={<RequireAdmin><AdminRevenue /></RequireAdmin>} />
                {/* Super Admin only */}
                <Route path="/ssra-admin/finance"           element={<RequireSuperAdmin><SuperAdminFinance /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/admins"            element={<RequireSuperAdmin><SuperAdminAdmins /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/activity"          element={<RequireSuperAdmin><SuperAdminActivity /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/view-as/:userId"  element={<RequireSuperAdmin><SuperAdminViewAs /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/sync-status"      element={<RequireSuperAdmin><SuperAdminSyncStatus /></RequireSuperAdmin>} />
                <Route path="/ssra-admin/manual-grant"     element={<RequireSuperAdmin><SuperAdminManualGrant /></RequireSuperAdmin>} />

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
