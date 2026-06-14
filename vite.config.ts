import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Governance gate for the Stripe publishable client token.
 *
 * Runs at build/dev startup. In production mode (the build that ships to the
 * live public domain), the Stripe client token MUST start with `pk_live_`.
 * Any `pk_test_` token or missing token aborts the build — preventing a
 * sandbox token from ever reaching real customers.
 *
 * In development mode a `pk_test_` (or missing) token is fine — that is the
 * preview-only sandbox.
 */
function assertStripeTokenForMode(mode: string, env: Record<string, string>) {
  const token = env.VITE_PAYMENTS_CLIENT_TOKEN ?? "";
  const isProduction = mode === "production";

  if (!isProduction) {
    if (token && !token.startsWith("pk_test_") && !token.startsWith("pk_live_")) {
      console.warn(
        `[stripe-governance] Unknown VITE_PAYMENTS_CLIENT_TOKEN prefix in dev mode "${mode}".`,
      );
    }
    return;
  }

  if (!token) {
    throw new Error(
      "[stripe-governance] Production build aborted: VITE_PAYMENTS_CLIENT_TOKEN is not set. " +
        "A live (`pk_live_...`) Stripe publishable token is required for production.",
    );
  }
  if (token.startsWith("pk_test_")) {
    throw new Error(
      "[stripe-governance] Production build aborted: VITE_PAYMENTS_CLIENT_TOKEN starts with `pk_test_`. " +
        "A sandbox token must NEVER be shipped to production — replace with the live token before publishing.",
    );
  }
  if (!token.startsWith("pk_live_")) {
    throw new Error(
      "[stripe-governance] Production build aborted: VITE_PAYMENTS_CLIENT_TOKEN has an unrecognized prefix. " +
        "Expected a `pk_live_...` token for production.",
    );
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  assertStripeTokenForMode(mode, env);

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
          assertStripeTokenForMode(resolved.mode, env);
        },
      },
    ],
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
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
