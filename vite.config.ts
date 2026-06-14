import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Governance gate for the Stripe publishable client token.
 *
 * Runs at build/dev startup. In production mode (the build that ships to the
 * live public domain), only a `pk_live_` Stripe client token may be bundled.
 * If the production environment still contains a sandbox/invalid token, the
 * build continues with payments disabled instead of shipping unsafe credentials.
 *
 * In development mode a `pk_test_` (or missing) token is fine — that is the
 * preview-only sandbox.
 */
function getSafeStripeTokenForMode(mode: string, env: Record<string, string>) {
  const token = env.VITE_PAYMENTS_CLIENT_TOKEN ?? "";
  const isProduction = mode === "production";

  if (!isProduction) {
    if (token && !token.startsWith("pk_test_") && !token.startsWith("pk_live_")) {
      console.warn(
        `[stripe-governance] Unknown VITE_PAYMENTS_CLIENT_TOKEN prefix in dev mode "${mode}".`,
      );
    }
    return token;
  }

  if (!token) {
    console.warn(
      "[stripe-governance] Production checkout is disabled: VITE_PAYMENTS_CLIENT_TOKEN is not set.",
    );
    return "";
  }
  if (token.startsWith("pk_test_")) {
    console.warn(
      "[stripe-governance] Production checkout is disabled: VITE_PAYMENTS_CLIENT_TOKEN starts with `pk_test_`. " +
        "Sandbox tokens are stripped from production bundles.",
    );
    return "";
  }
  if (!token.startsWith("pk_live_")) {
    console.warn(
      "[stripe-governance] Production checkout is disabled: VITE_PAYMENTS_CLIENT_TOKEN has an unrecognized prefix.",
    );
    return "";
  }

  return token;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const safePaymentsClientToken = getSafeStripeTokenForMode(mode, env);

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      {
        name: "stripe-governance-runtime-guard",
        configResolved(resolved) {
          getSafeStripeTokenForMode(resolved.mode, env);
        },
      },
    ],
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      "import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN": JSON.stringify(safePaymentsClientToken),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor":    ["react", "react-dom", "react-router-dom"],
            "query-vendor":    ["@tanstack/react-query"],
            "supabase-vendor": ["@supabase/supabase-js"],
            "ui-vendor":       ["lucide-react"],
            "recharts-vendor": ["recharts"],
            "i18n-vendor":     ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          },
        },
      },
    },
  };
});
