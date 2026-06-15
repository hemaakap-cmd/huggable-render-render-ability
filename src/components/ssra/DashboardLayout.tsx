import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, CreditCard,
  User, LogOut, Menu, X, ChevronRight, Video, AlertCircle, Award, BookCheck, Receipt, FolderOpen, Bell, Radio,
} from "lucide-react";
import { ssraSignOut, useSsraAuth } from "@/hooks/useSsraAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import SsraLogo from "@/components/ssra/SsraLogo";
import PanelErrorBoundary from "@/components/PanelErrorBoundary";

const NAV = [
  { icon: LayoutDashboard, label: "Overview",      href: "/dashboard" },
  { icon: BookOpen,        label: "My Courses",     href: "/dashboard/courses" },
  { icon: Receipt,         label: "Order Status",   href: "/dashboard/orders" },
  { icon: Video,           label: "Live Sessions",  href: "/dashboard/sessions" },
  { icon: Radio,           label: "Live Broadcasts", href: "/dashboard/broadcasts" },
  { icon: FolderOpen,      label: "Materials",      href: "/dashboard/materials" },
  { icon: CreditCard,      label: "Subscription",   href: "/dashboard/subscription" },
  { icon: Award,           label: "Certificates",   href: "/dashboard/certificates" },
  { icon: BookCheck,       label: "Homework",       href: "/dashboard/homework" },
  { icon: User,            label: "Profile",        href: "/dashboard/profile" },
  { icon: Bell,            label: "Notifications",  href: "/dashboard/preferences" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, loading, isInstructor, isAdmin } = useSsraAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Live ecosystem: every student-facing flow writes an in-app notification;
  // an INSERT on the student's notifications invalidates their dashboard caches.
  useRealtimeSync("student", profile?.id ?? null);
  const initial = (profile?.full_name ?? profile?.email ?? "S")[0].toUpperCase();

  // Instructors and admins have their own portals — send them there
  useEffect(() => {
    if (loading) return;
    if (isInstructor) navigate("/instructor", { replace: true });
    else if (isAdmin) navigate("/ssra-admin", { replace: true });
  }, [loading, isInstructor, isAdmin, navigate]);

  // Force students with incomplete profiles to complete their data
  const needsCompletion = !loading && profile && !isInstructor && !isAdmin && (!profile.full_name || profile.full_name.trim() === "");
  const onProfilePage = location.pathname === "/dashboard/profile";

  useEffect(() => {
    if (needsCompletion && !onProfilePage) {
      navigate("/dashboard/profile", { replace: true });
    }
  }, [needsCompletion, onProfilePage, navigate]);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex flex-col h-full bg-slate-950 ${mobile ? "w-64" : "w-64 hidden lg:flex"}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <Link to="/" aria-label="SSRA Academy — Home">
          <SsraLogo size={32} scheme="light" />
        </Link>
        <div className="text-white/25 text-[10px] tracking-widest uppercase mt-1.5 pl-0.5">Student Portal</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            end={href === "/dashboard"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-[hsl(220,91%,54%)] text-white shadow-lg shadow-blue-500/25"
                  : "text-white/55 hover:text-white hover:bg-white/6"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/8 space-y-1">
        <Link to="/courses"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all">
          <BookOpen className="w-4 h-4" /> Browse Courses
        </Link>
        <button
          onClick={ssraSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10">
            <Sidebar mobile />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-white z-20">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-800">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <Link to="/courses"
              className="hidden sm:flex items-center gap-1 text-xs text-[hsl(220,91%,54%)] font-medium hover:underline">
              Browse Courses <ChevronRight className="w-3 h-3" />
            </Link>
            <div className="w-8 h-8 rounded-full bg-[hsl(220,91%,54%)] flex items-center justify-center text-white text-xs font-bold">
              {initial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">

          {needsCompletion && onProfilePage && (
            <div className="max-w-2xl mx-auto mb-4 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-900">Complete your profile</div>
                <div className="text-amber-700 mt-0.5">
                  Please add your full name to continue using the dashboard.
                </div>
              </div>
            </div>
          )}
          <PanelErrorBoundary panelName="your dashboard">
            {children}
          </PanelErrorBoundary>
        </main>
      </div>
    </div>
  );
}
