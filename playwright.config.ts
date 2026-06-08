import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "https://id-preview--fcbf27d0-f45a-43f6-b456-77bf480f5cc7.lovable.app";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "anonymous", use: { ...devices["Desktop Chrome"] } },
    { name: "student", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/student.json" }, dependencies: ["setup"] },
    { name: "instructor", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/instructor.json" }, dependencies: ["setup"] },
    { name: "admin", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" }, dependencies: ["setup"] },
    { name: "super_admin", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/super_admin.json" }, dependencies: ["setup"] },
    { name: "setup", testMatch: /.*\.setup\.ts/ },
  ],
});
