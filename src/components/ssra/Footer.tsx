import { Link } from "react-router-dom";
import { GraduationCap, Mail, Globe2, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[hsl(220,91%,54%)] flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold font-display text-lg">SSRA</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 mb-5">
              Sports Science &amp; Rehabilitation Academy — non-profit education for international graduates pursuing careers in German healthcare.
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Heart className="w-3 h-3 text-red-400" />
              <span>Non-profit · Germany</span>
            </div>
          </div>

          {/* Courses */}
          <div>
            <h3 className="text-slate-200 text-sm font-semibold mb-4 tracking-wide">Courses</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ["Medical German", "/courses"],
                ["Sportrehabilitation", "/courses"],
                ["Bewegungsanalyse", "/courses"],
                ["Telefonkommunikation", "/courses"],
                ["Berufseinstieg", "/courses"],
              ].map(([l, h]) => (
                <li key={l}>
                  <Link to={h} className="hover:text-slate-200 transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Academy */}
          <div>
            <h3 className="text-slate-200 text-sm font-semibold mb-4 tracking-wide">Academy</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ["About Us", "/about"],
                ["Apply Free", "/apply"],
                ["Pricing", "/pricing"],
                ["Contact", "/contact"],
              ].map(([l, h]) => (
                <li key={l}>
                  <Link to={h} className="hover:text-slate-200 transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-slate-200 text-sm font-semibold mb-4 tracking-wide">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[hsl(220,91%,54%)] shrink-0" />
                <span>info@ssra-academy.de</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-[hsl(220,91%,54%)] shrink-0" />
                <span>Online · Germany</span>
              </li>
            </ul>
            <a href="mailto:info@ssra-academy.de" className="inline-flex items-center gap-2 mt-4 text-xs text-[hsl(220,91%,54%)] hover:text-blue-400 transition-colors">
              <Mail className="w-3.5 h-3.5" /> info@ssra-academy.de
            </a>
          </div>
        </div>

        <div className="divider my-10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} SSRA — Sports Science &amp; Rehabilitation Academy. All rights reserved.</span>
          <div className="flex gap-5">
            <Link to="/legal#privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link to="/legal#terms" className="hover:text-slate-400 transition-colors">Terms of Use</Link>
            <Link to="/legal#impressum" className="hover:text-slate-400 transition-colors">Impressum</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
