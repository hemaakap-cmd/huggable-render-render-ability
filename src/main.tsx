import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Validate required environment variables in production
if (import.meta.env.PROD) {
  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PRICE_GERMAN_SUB",
    "VITE_STRIPE_PRICE_REHAB",
    "VITE_STRIPE_PRICE_BEWEGUNG",
    "VITE_STRIPE_PRICE_PRAXIS",
    "VITE_STRIPE_PRICE_ANATOMIE",
    "VITE_STRIPE_PRICE_TRAINING",
    "VITE_STRIPE_PRICE_TELEFON",
    "VITE_STRIPE_PRICE_BERUF",
    "VITE_STRIPE_PRICE_DOSB",
  ];
  const missing = required.filter(
    (k) => !import.meta.env[k as keyof ImportMetaEnv]
  );
  if (missing.length > 0) {
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc;">
          <div style="max-width: 600px; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin: 0 0 1rem 0; font-size: 24px;">Configuration Error</h1>
            <p style="color: #374151; margin: 0 0 1rem 0;">Missing required environment variables:</p>
            <ul style="color: #374151; margin: 0 0 1rem 1rem; padding: 0;">
              ${missing.map((m) => `<li>${m}</li>`).join("")}
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Check your deployment platform's environment variable configuration.</p>
          </div>
        </div>
      `;
    }
    throw new Error(
      `[Config] Missing required environment variables:\n${missing.join(
        "\n"
      )}\n\nCheck your deployment platform's env var configuration.`
    );
  }
}

createRoot(document.getElementById("root")!).render(<App />);
