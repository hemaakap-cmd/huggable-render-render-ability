import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

/**
 * Project layout — testMatch patterns MUST match the spec filenames in
 * e2e/specs/. Naming convention: <persona>-<area>.spec.ts
 *
 *   anonymous-*.spec.ts    no auth state, always runnable
 *   api-*.spec.ts          DB-level integration tests (service role), no browser auth
 *   student-*.spec.ts      storageState e2e/.auth/student.json
 *   instructor-*.spec.ts   storageState e2e/.auth/instructor.json
 *   admin-*.spec.ts        storageState e2e/.auth/admin.json
 *   super-admin-*.spec.ts  storageState e2e/.auth/super-admin.json
 *
 * auth.setup.ts ALWAYS writes the four storage-state files: real sessions
 * when E2E_PASSWORD (+ optional E2E_*_EMAIL) are set, empty states otherwise.
 * Persona specs self-skip when credentials are absent, so the suite is green
 * out of the box and gains coverage as secrets are provisioned.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-GB",
  },

  projects: [
    // Writes e2e/.auth/*.json (real sessions or empty placeholders)
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    {
      name: "anonymous",
      testMatch: /specs[/\\]anonymous-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "api",
      testMatch: /specs[/\\]api-.*\.spec\.ts/,
      // No browser needed — these hit the database directly
    },
    {
      name: "student",
      testMatch: /specs[/\\]student-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/student.json" },
      dependencies: ["setup"],
    },
    {
      name: "instructor",
      testMatch: /specs[/\\]instructor-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/instructor.json" },
      dependencies: ["setup"],
    },
    {
      name: "admin",
      testMatch: /specs[/\\]admin-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },
    {
      name: "super-admin",
      testMatch: /specs[/\\]super-admin-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/super-admin.json" },
      dependencies: ["setup"],
    },
  ],

  // Local dev: vite dev server. CI: serve the production build (vite preview)
  // so E2E exercises the same bundle that ships.
  webServer: {
    command: process.env.CI
      ? "npm run preview -- --port 8080 --strictPort"
      : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
