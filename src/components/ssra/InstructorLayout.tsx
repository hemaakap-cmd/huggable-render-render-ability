import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList,
  Video, FolderOpen, LogOut, Menu, X, ChevronDown, GraduationCap, BookCheck,
} from "lucide-react";
import SsraLogo from "@/components/ssra/SsraLogo";
import BackButton from "@/components/ssra/BackButton";
import PanelErrorBoundary from "@/components/PanelErrorBoundary";
import { useSsraAuth, ssraSignOut } from "@/hooks/useSsraAuth";

const NAV = [
  { icon: LayoutDashboard, label: "Overview",    href: "/instructor" },
  { icon: BookOpen,        label: "My Courses",  href: "/instructor/courses" },
  { icon: Users,           label: "My Students", href: "/instructor/students" },
  { icon: Video,           label: "Sessions",    href: "/instructor/sessions" },
  { icon: ClipboardList,   label: "Attendance",  href: "/instructor/attendance" },
  { icon: FolderOpen,      label: "Materials",   href: "/instructor/materials" },
  { icon: BookCheck,       label: "Homework",    href: "/instructor/homework" },
];

function NavItem({ icon: Icon, label, href, end = false, onClick }: {
  icon: React.ElementType; label: string; href: string; end?: boolean; onClick?: () => void;
}) {
  return (
    <NavLink to={href} end={end} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? "bg-emerald-500 text-white font-semibold"
            : "text-white/55 hover:text-white hover:bg-white/6"
        }`
      }>
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile } = useSsraAuth();
  const close = () => setOpen(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex flex-col h-full bg-slate-900 ${mobile ? "w-64" : "w-64 hidden lg:flex"}`}>
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/8">
        <div>
          <SsraLogo size={32} scheme="light" />
          <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1.5 inline-block bg-emerald-500/20 text-emerald-400">
            Instructor Portal
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Instructor
        </div>
        {NAV.map(({ icon, label, href }) => (
          <NavItem key={href} icon={icon} label={label} href={href} end={href === "/instructor"} onClick={close} />
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-white/8 space-y-0.5">
        {profile && (
          <div className="px-3 py-2 mb-1 rounded-xl bg-white/5">
            <div className="text-xs font-semibold text-white truncate">{profile.full_name ?? "—"}</div>
            <div className="text-[10px] text-white/35 truncate">{profile.email}</div>
          </div>
        )}
        <Link to="/" onClick={close}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all">
          <GraduationCap className="w-4 h-4 shrink-0" /> View Site
        </Link>
        <button onClick={ssraSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut className="w-4 h-4 shrink-0" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

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
          <div className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <ChevronDown className="w-3.5 h-3.5 rotate-90 text-emerald-500" />
            <span className="text-emerald-600 font-semibold">Instructor Portal</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <BackButton />
          </div>
          <PanelErrorBoundary panelName="the instructor portal">
            {children}
          </PanelErrorBoundary>
        </main>
      </div>
    </div>
  );
}
