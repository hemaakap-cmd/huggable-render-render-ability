import { useId } from "react";

interface SsraLogoProps {
  /** "mark" = icon only · "full" = icon + wordmark */
  variant?: "mark" | "full";
  /** Height of the icon square in px (default 36) */
  size?: number;
  /** "light" = white text — use on dark backgrounds (header, sidebar, footer)
   *  "dark"  = slate text — use on white/light backgrounds */
  scheme?: "light" | "dark";
  className?: string;
}

/* ─────────────────────────────────────────────────────────────
   The icon mark:
   • Dark navy→blue gradient badge (rounded square)
   • Semi-transparent shield silhouette inside (academic crest)
   • Gold graduation cap board + tassel at the top
   • White S-curve flowing through the shield body
     (sports science · movement · rehabilitation)
──────────────────────────────────────────────────────────── */
function LogoMark({ size, uid }: { size: number; uid: string }) {
  const bgId     = `ssra-bg-${uid}`;
  const shieldId = `ssra-sh-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Background: deep navy → bold blue */}
        <linearGradient id={bgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#071020" />
          <stop offset="100%" stopColor="#1B3A8C" />
        </linearGradient>
        {/* Shield fill: translucent blue top → near-transparent at pointed bottom */}
        <linearGradient id={shieldId} x1="20" y1="11" x2="20" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.1"  />
        </linearGradient>
      </defs>

      {/* ── Background badge ── */}
      <rect width="40" height="40" rx="9" fill={`url(#${bgId})`} />

      {/* ── Shield silhouette ──
          Flat top (y=11), vertical sides down to y=20, then
          quadratic curves tapering to pointed bottom (20,34). */}
      <path
        d="M8 11 L32 11 L32 20 Q32 28 20 34 Q8 28 8 20 Z"
        fill={`url(#${shieldId})`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.75"
      />

      {/* ── Graduation cap board (gold) ── */}
      <rect x="11" y="7.5" width="18" height="2.5" rx="1.25" fill="#F5A623" />

      {/* ── Tassel: cord + knot ── */}
      <line
        x1="26.5" y1="10"
        x2="26.5" y2="13.5"
        stroke="#F5A623"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="26.5" cy="14.6" r="1.15" fill="#F5A623" />

      {/* ── S-curve ──
          Single open path that traces the letter S through the shield.
          Represents: sports Science · fluid movement · rehabilitation flow.
          x-range 15–25 (centered at 20), y-range 13–31 (inside shield). */}
      <path
        d="M25 16 Q25 13 20 13 Q15 13 15 19 Q15 22 20 22 Q25 22 25 28 Q25 31 20 31 Q15 31 15 27"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Public component ── */
export default function SsraLogo({
  variant  = "full",
  size     = 36,
  scheme   = "light",
  className = "",
}: SsraLogoProps) {
  /* Replace colons React 18 useId produces — can't appear in SVG id="" */
  const uid = useId().replace(/:/g, "");

  if (variant === "mark") {
    return <LogoMark size={size} uid={uid} />;
  }

  const nameColor = scheme === "light" ? "text-white"     : "text-slate-900";
  const subColor  = scheme === "light" ? "text-white/50"  : "text-slate-400";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} uid={uid} />
      <div className="leading-none select-none">
        <span className={`block font-bold font-display text-[15px] tracking-wide ${nameColor}`}>
          SSRA
        </span>
        <span className={`block text-[9px] tracking-[0.22em] uppercase ${subColor}`}>
          Academy
        </span>
      </div>
    </div>
  );
}
