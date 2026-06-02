/**
 * SSRA Academy Company Branding Constants
 * Used across all printable materials and documents (certificates,
 * invoices, enrollment confirmations, exported reports).
 *
 * Brand Colors (HSL):
 * - Primary: 220 91% 54% (SSRA Blue)
 * - Accent:  142 71% 45% (Growth Green)
 * - Background: 210 20% 98% (Cool Off-White)
 *
 * Fonts:
 * - Display: Playfair Display (headers)
 * - Body:    Inter (text)
 */
export const COMPANY_INFO = {
  name: "SSRA Academy",
  legalName: "Sports Science Rehabilitation Academy",
  email: "info@ssracourses.com",
  supportEmail: "support@ssracourses.com",
  phone: "+49 160 5652154",
  address: "Bracknellstraße 41, 51379 Leverkusen, Germany",
  tagline: "German sports science career path — taught in Arabic",
  website: "www.ssracourses.com",
  services: "Medical German · Clinical Rehabilitation · Career Support",
  social: {
    instagram: "@ssra.academy",
  },
} as const;

/**
 * Print-specific styling constants
 * Use these for consistent print document formatting
 */
export const PRINT_STYLES = {
  colors: {
    primary: "#1d6ef0",    // HSL 220 91% 54%
    accent: "#22c55e",     // HSL 142 71% 45%
    headerBorder: "#1d6ef0",
    text: "#0f172a",       // slate-900
    textMuted: "#475569",  // slate-600
    background: "#f8fafc", // slate-50
  },
  fonts: {
    display: "'Playfair Display', serif",
    body: "'Inter', sans-serif",
  },
} as const;
