/**
 * Instructor portal — every instructor page renders, and the instructor is
 * fenced out of the admin panel (the privilege boundary the 2026-06-12 audit
 * tightened around homework scoping).
 */
import { test, expect } from "@playwright/test";

const HAS_CREDS = !!process.env.E2E_PASSWORD;
test.skip(!HAS_CREDS, "E2E_PASSWORD not set — persona specs skipped");

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
