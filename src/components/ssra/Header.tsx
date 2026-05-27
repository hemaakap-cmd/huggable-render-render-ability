import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, GraduationCap, ChevronDown } from "lucide-react";

const NAV = [
  { label: "Home",    href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
  { label: "About",   href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Header() {
  const [open, setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname }        = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

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
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            scrolled ? "bg-[hsl(220,91%,54%)]" : "bg-white/15 border border-white/25"
          }`}>
            <GraduationCap className={`w-5 h-5 ${scrolled ? "text-white" : "text-white"}`} />
          </div>
          <div className="leading-none">
            <span className={`block font-bold font-display text-[15px] tracking-wide ${scrolled ? "text-slate-900" : "text-white"}`}>
              SSRA
            </span>
            <span className={`block text-[9px] tracking-[0.2em] uppercase ${scrolled ? "text-slate-400" : "text-white/50"}`}>
              Academy
            </span>
          </div>
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

        {/* CTA */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/apply">
            <button className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              scrolled
                ? "bg-[hsl(220,91%,54%)] text-white hover:bg-[hsl(220,91%,48%)] shadow-md shadow-blue-500/20"
                : "bg-white text-slate-900 hover:bg-white/90"
            }`}>
              Apply Free
            </button>
          </Link>
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
            <div className="pt-2 border-t border-slate-100 mt-1">
              <Link to="/apply">
                <button className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(220,91%,54%)] text-white">
                  Apply Free
                </button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
