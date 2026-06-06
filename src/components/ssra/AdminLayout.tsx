import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users,
  BookOpen, CreditCard, LogOut, Menu, X, Library, Video,
  ClipboardList, TrendingUp, Crown, UserCog, ChevronDown, Activity,
  GraduationCap, GitBranch, Wand2, Radio, FileCheck, Tag, ShieldAlert,
  FileSpreadsheet, GraduationCap as InstructorIcon, Layers, BookCheck,
  AlertOctagon, HeartPulse, BarChart3, Award, RotateCcw,
} from "lucide-react";
import SsraLogo from "@/components/ssra/SsraLogo";
import { useSsraAuth, ssraSignOut } from "@/hooks/useSsraAuth";

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: "Dashboard",       href: "/ssra-admin" },
  { icon: Radio,           label: "Live Visitors",   href: "/ssra-admin/live" },
  { icon: Users,           label: "Students",        href: "/ssra-admin/students" },
  { icon: FileCheck,       label: "Verifications",   href: "/ssra-admin/verifications" },
  { icon: Users,           label: "Waitlist",         href: "/ssra-admin/waitlist" },
  { icon: Tag,             label: "Coupons",          href: "/ssra-admin/coupons" },
  { icon: ShieldAlert,      label: "Audit Log",        href: "/ssra-admin/audit-log" },
  { icon: FileSpreadsheet,  label: "Reports",          href: "/ssra-admin/reports" },
  { icon: InstructorIcon,   label: "Instructors",      href: "/ssra-admin/instructors" },
  { icon: ClipboardList,    label: "Attendance",       href: "/ssra-admin/attendance" },
  { icon: Library,          label: "Courses",          href: "/ssra-admin/courses" },
  { icon: Layers,           label: "Batches",          href: "/ssra-admin/batches" },
  { icon: Video,            label: "Sessions",         href: "/ssra-admin/sessions" },
  { icon: BookOpen,         label: "Enrollments",      href: "/ssra-admin/enrollments" },
  { icon: BookCheck,        label: "Homework",         href: "/ssra-admin/homework" },
  { icon: Award,            label: "Certificates",     href: "/ssra-admin/certificates" },
  { icon: AlertOctagon,     label: "Fraud Flags",      href: "/ssra-admin/fraud" },
  { icon: HeartPulse,       label: "System Health",    href: "/ssra-admin/system-health" },
  { icon: RotateCcw,        label: "Cancellations",    href: "/ssra-admin/cancellations" },
];

const SUPER_NAV = [
  { icon: Activity,   label: "Activity Monitor", href: "/ssra-admin/activity" },
  { icon: TrendingUp, label: "Finance",           href: "/ssra-admin/finance" },
  { icon: CreditCard, label: "Revenue",           href: "/ssra-admin/revenue" },
  { icon: UserCog,    label: "Manage Admins",     href: "/ssra-admin/admins" },
  { icon: GitBranch,  label: "Sync Status",       href: "/ssra-admin/sync-status" },
  { icon: Wand2,      label: "Manual Grant",      href: "/ssra-admin/manual-grant" },
  { icon: BarChart3,  label: "Student Reports",   href: "/ssra-admin/student-reports" },
];

function NavItem({ icon: Icon, label, href, end = false, onClick }: {
  icon: React.ElementType; label: string; href: string; end?: boolean; onClick?: () => void;
}) {
  return (
    <NavLink to={href} end={end} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? "bg-[hsl(43,96%,50%)] text-slate-900 font-semibold"
            : "text-white/55 hover:text-white hover:bg-white/6"
        }`
      }>
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen]     = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { profile, isSuperAdmin } = useSsraAuth();

  const close = () => setOpen(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex flex-col h-full bg-slate-950 transition-all ${
      mobile ? "w-64" : collapsed ? "w-16 hidden lg:flex" : "w-64 hidden lg:flex"
    }`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/8 min-w-0">
        {collapsed
          ? <SsraLogo variant="mark" size={32} />
          : (
            <div className="min-w-0">
              <SsraLogo size={32} scheme="light" />
              <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1.5 inline-block ${
                isSuperAdmin ? "bg-[hsl(43,96%,50%)] text-slate-900" : "bg-white/10 text-white/50"
              }`}>
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </div>
            </div>
          )
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            Management
          </div>
        )}
        {ADMIN_NAV.map(({ icon, label, href }) => (
          <NavItem key={href} icon={icon} label={collapsed ? "" : label} href={href} end={href === "/ssra-admin"} onClick={close} />
        ))}

        {isSuperAdmin && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[hsl(43,96%,50%)]/60 flex items-center gap-1.5">
                <Crown className="w-3 h-3" /> Super Admin
              </div>
            )}
            {collapsed && <div className="my-2 mx-3 border-t border-white/10" />}
            {SUPER_NAV.map(({ icon, label, href }) => (
              <NavItem key={href} icon={icon} label={collapsed ? "" : label} href={href} onClick={close} />
            ))}
          </>
        )}
      </nav>

      {/* User + footer */}
      <div className="px-2 py-3 border-t border-white/8 space-y-0.5">
        {!collapsed && profile && (
          <div className="px-3 py-2 mb-1 rounded-xl bg-white/5">
            <div className="text-xs font-semibold text-white truncate">{profile.full_name ?? "—"}</div>
            <div className="text-[10px] text-white/35 truncate">{profile.email}</div>
          </div>
        )}
        <Link to="/" onClick={close}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all">
          <GraduationCap className="w-4 h-4 shrink-0" />
          {!collapsed && "View Site"}
        </Link>
        <button onClick={ssraSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={close} />
          <div className="relative z-10"><Sidebar mobile /></div>
          <button onClick={close} className="absolute top-4 right-4 text-white z-20">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-500">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-90"}`} />
          </button>
          <div className="text-xs text-slate-400 ml-auto">
            {isSuperAdmin
              ? <span className="flex items-center gap-1 text-[hsl(43,96%,50%)] font-semibold"><Crown className="w-3 h-3" /> Super Admin Portal</span>
              : "SSRA Admin Portal"}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
