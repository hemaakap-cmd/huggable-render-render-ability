import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useSsraAuth, ssraSignOut } from "@/hooks/useSsraAuth";
import SsraLogo from "@/components/ssra/SsraLogo";
import NotificationBell from "@/components/ssra/NotificationBell";

const NAV = [
  { label: "Home",    href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
  { label: "About",   href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname }            = useLocation();
  const { user, profile, isAdmin, isInstructor, loading } = useSsraAuth();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const initial = (profile?.full_name ?? profile?.email ?? user?.email ?? "U")[0].toUpperCase();

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-slate-100"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" aria-label="SSRA Academy — Home">
          <SsraLogo size={36} scheme={scrolled ? "dark" : "light"} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? scrolled
                    ? "text-[hsl(220,91%,54%)] bg-[hsl(220,91%,54%)]/8"
                    : "text-white bg-white/12"
                  : scrolled
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side — CTA or user menu */}
        <div className="hidden md:flex items-center gap-2">
          {!loading && user ? (
            <>
              {isAdmin && (
                <Link to="/ssra-admin">
                  <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scrolled ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-white/80 bg-white/10 hover:bg-white/20"
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </button>
                </Link>
              )}
              {isInstructor && (
                <Link to="/instructor">
                  <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scrolled ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-white/80 bg-white/10 hover:bg-white/20"
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Instructor
                  </button>
                </Link>
              )}
              <NotificationBell scheme={scrolled ? "dark" : "light"} />
              <Link to="/dashboard">
                <button className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white/80 hover:bg-white/10"
                }`}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
              </Link>
              <div className="relative group">
                <button
                  aria-label="Open user menu"
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all ${
                    scrolled ? "bg-[hsl(220,91%,54%)]" : "bg-white/20 border border-white/30"
                  }`}
                >
                  {initial}
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-700 truncate">{profile?.full_name ?? "—"}</div>
                    <div className="text-xs text-slate-400 truncate">{profile?.email ?? user.email}</div>
                  </div>
                  <Link to="/dashboard/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    Profile
                  </Link>
                  <button onClick={ssraSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : !loading ? (
            <>
              <Link to="/login">
                <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  scrolled ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}>
                  Sign In
                </button>
              </Link>
              <Link to="/apply">
                <button className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  scrolled
                    ? "bg-[hsl(220,91%,54%)] text-white hover:bg-[hsl(220,91%,48%)] shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-900 hover:bg-white/90"
                }`}>
                  Apply Free
                </button>
              </Link>
            </>
          ) : null}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden p-2 rounded-lg transition-colors ${
            scrolled ? "text-slate-600 hover:bg-slate-100" : "text-white hover:bg-white/10"
          }`}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-xl px-4 pb-5">
          <nav className="flex flex-col gap-1 pt-3">
            {NAV.map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname === href
                    ? "text-[hsl(220,91%,54%)] bg-[hsl(220,91%,54%)]/8"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100 mt-1 space-y-1">
              {user ? (
                <>
                  <Link to="/dashboard" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <LayoutDashboard className="w-4 h-4 text-[hsl(220,91%,54%)]" /> Dashboard
                  </Link>
                  {isAdmin && (
                    <Link to="/ssra-admin" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                      <ShieldCheck className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                  {isInstructor && (
                    <Link to="/instructor" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                      <ShieldCheck className="w-4 h-4" /> Instructor Panel
                    </Link>
                  )}
                  <button onClick={ssraSignOut} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <button className="w-full py-3 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 mb-2">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/apply">
                    <button className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(220,91%,54%)] text-white">
                      Apply Free
                    </button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
