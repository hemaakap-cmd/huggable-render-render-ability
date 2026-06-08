import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
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
    // Auth state setup — runs once, saves auth cookies for each persona
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    {
      name: "anonymous",
      testMatch: /.*anonymous.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "student",
      testMatch: /.*student.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/student.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "instructor",
      testMatch: /.*instructor.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/instructor.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "admin",
      testMatch: /.*admin.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "super-admin",
      testMatch: /.*super.?admin.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/super-admin.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Start the dev server automatically when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
