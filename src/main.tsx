import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Warn (do not block) on missing backend envs.
if (import.meta.env.PROD) {
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
  const missing = required.filter(
    (k) => !import.meta.env[k as keyof ImportMetaEnv]
  );
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error("[Config] Missing required env vars:", missing.join(", "));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
