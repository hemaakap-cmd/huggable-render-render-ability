import { useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface BackButtonProps {
  /** Extra classes (positioning, margin, etc.). Do NOT pass colors — variant handles that. */
  className?: string;
  /** Arabic label, customizable. */
  label?: string;
  /** Fallback route when there's no history to go back to. Defaults to "/". */
  to?: string;
  /** Visual variant — "auto" picks light pill on dark surfaces via className context. */
  variant?: "light" | "dark";
}

/**
 * Smart back button:
 * - Uses history.back() when there IS history within our app.
 * - Falls back to the `to` route (default "/") when opened from an external link
 *   or on the first navigation entry — so it actually goes somewhere useful.
 * - Themed pill, matches the site's design tokens; two variants for light/dark backgrounds.
 */
export default function BackButton({
  className = "",
  label = "Back",
  to = "/",
  variant = "light",
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // history.idx is populated by react-router; idx === 0 means this is the entry page.
  const hasHistory =
    typeof window !== "undefined" &&
    (window.history.state?.idx ?? 0) > 0 &&
    location.key !== "default";

  const base =
    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border backdrop-blur-sm transition-all duration-200 hover:-translate-x-0.5";

  const styles =
    variant === "dark"
      ? "bg-white/10 border-white/20 text-white/90 hover:bg-white/15 hover:border-white/30"
      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 hover:text-slate-900";

  const content = (
    <>
      {/* In RTL Arabic, ArrowRight visually points "back" toward the start of the text flow. */}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </>
  );

  if (!hasHistory) {
    return (
      <Link
        to={to}
        className={`${base} ${styles} ${className}`}
        aria-label="Back to previous page"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`${base} ${styles} ${className}`}
      aria-label="Back to previous page"
    >
      {content}
    </button>
  );
}
