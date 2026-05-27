/**
 * MASSAVO Company Branding Constants
 * Used across all printable materials and documents
 * 
 * Brand Colors (HSL):
 * - Primary: 25 45% 35% (Warm Terracotta)
 * - Accent: 32 70% 45% (Rich Amber)
 * - Background: 30 20% 94% (Warm Cream)
 * 
 * Fonts:
 * - Display: Playfair Display (headers)
 * - Body: Inter (text)
 */
export const COMPANY_INFO = {
  name: "MASSAVO",
  email: "info@massavo.com",
  phone: "+49 160 5652154",
  address: "Bracknellstraße 41, 51379 Leverkusen",
  tagline: "Professional Massage Services",
  website: "www.massavo.com",
  services: "Sportmassage • Klassische Massage",
  social: {
    instagram: "@massavo.gym",
  },
} as const;

/**
 * Print-specific styling constants
 * Use these for consistent print document formatting
 */
export const PRINT_STYLES = {
  colors: {
    primary: "#7a4a2a", // HSL 25 45% 35%
    accent: "#c9782a", // HSL 32 70% 45%
    headerBorder: "#d97706", // amber-600
    text: "#1c1917", // stone-900
    textMuted: "#57534e", // stone-600
    background: "#fffbf7", // warm cream
  },
  fonts: {
    display: "'Playfair Display', serif",
    body: "'Inter', sans-serif",
  },
} as const;
