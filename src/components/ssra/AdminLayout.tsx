import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  GraduationCap, LayoutDashboard, Users, ShieldCheck,
  BookOpen, CreditCard, LogOut, Menu, X, TrendingUp, Library,
} from "lucide-react";
import { ssraSignOut } from "@/hooks/useSsraAuth";

const NAV = [
  { icon: LayoutDashboard, label: "Overview",        href: "/ssra-admin" },
  { icon: Library,         label: "Courses",          href: "/ssra-admin/courses" },
  { icon: Users,           label: "Students",         href: "/ssra-admin/students" },
  { icon: ShieldCheck,     label: "Verifications",    href: "/ssra-admin/verifications" },
  { icon: BookOpen,        label: "Enrollments",      href: "/ssra-admin/enrollments" },
  { icon: CreditCard,      label: "Subscriptions",    href: "/ssra-admin/subscriptions" },
  { icon: TrendingUp,      label: "Revenue",          href: "/ssra-admin/revenue" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`flex flex-col h-full bg-slate-950 ${mobile ? "w-64" : "w-64 hidden lg:flex"}`}>
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-[hsl(43,96%,50%)] flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-slate-900" />
        </div>
        <div>
          <div className="text-white font-bold font-display text-sm">SSRA Admin</div>
          <div className="text-white/30 text-[10px]">Management Portal</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, href }) => (
          <NavLink key={href} to={href} end={href === "/ssra-admin"}
            onClick={() => setOpen(false)}
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
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/8">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all mb-1">
          <GraduationCap className="w-4 h-4" /> View Site
        </Link>
        <button onClick={ssraSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/8 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10"><Sidebar mobile /></div>
          <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white z-20">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-6 shrink-0">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-500">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-xs text-slate-400 ml-auto">SSRA Admin Portal</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
