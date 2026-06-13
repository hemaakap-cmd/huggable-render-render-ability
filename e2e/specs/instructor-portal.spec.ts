/**
 * Instructor portal — every instructor page renders, and the instructor is
 * fenced out of the admin panel (the privilege boundary the 2026-06-12 audit
 * tightened around homework scoping).
 */
import { test, expect } from "@playwright/test";
import { personaAuthReady } from "../helpers/persona";

// Gate on a REAL seeded session (set by auth.setup), not merely on the env var,
// so the suite skips cleanly when personas aren't provisioned instead of running
// unauthenticated and reporting false failures.
test.beforeEach(() => {
  test.skip(
    !personaAuthReady("instructor.json"),
    "No seeded instructor session (E2E_PASSWORD unset or persona not provisioned) — skipped",
  );
});

test.describe("Instructor portal", () => {
  test("instructor dashboard renders the portal shell", async ({ page }) => {
    await page.goto("/instructor");
    await expect(page).toHaveURL(/\/instructor/, { timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
  });

  const PAGES = [
    "/instructor/courses",
    "/instructor/students",
    "/instructor/sessions",
    "/instructor/attendance",
    "/instructor/materials",
    "/instructor/homework",
  ];

  for (const route of PAGES) {
    test(`${route} renders without crashing`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/")), { timeout: 15_000 });
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    });
  }

  test("instructor CANNOT access the admin panel", async ({ page }) => {
    await page.goto("/ssra-admin");
    // RequireAdmin bounces to /dashboard; DashboardLayout then forwards
    // instructors to /instructor — either way, never inside /ssra-admin
    await expect(page).not.toHaveURL(/\/ssra-admin/, { timeout: 15_000 });
  });

  test("instructor CANNOT access super-admin pages", async ({ page }) => {
    await page.goto("/ssra-admin/system-health");
    await expect(page).not.toHaveURL(/system-health/, { timeout: 15_000 });
  });
});
