/**
 * Admin portal — every management page renders, and a regular admin is
 * fenced out of super-admin-only routes.
 */
import { test, expect } from "@playwright/test";

const HAS_CREDS = !!process.env.E2E_PASSWORD;
test.skip(!HAS_CREDS, "E2E_PASSWORD not set — persona specs skipped");

test.describe("Admin portal", () => {
  test("admin dashboard renders", async ({ page }) => {
    await page.goto("/ssra-admin");
    await expect(page).toHaveURL(/\/ssra-admin/, { timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
  });

  const PAGES = [
    "/ssra-admin/students",
    "/ssra-admin/leads",
    "/ssra-admin/courses",
    "/ssra-admin/sessions",
    "/ssra-admin/enrollments",
    "/ssra-admin/attendance",
    "/ssra-admin/waitlist",
    "/ssra-admin/coupons",
    "/ssra-admin/reports",
    "/ssra-admin/instructors",
    "/ssra-admin/batches",
    "/ssra-admin/homework",
    "/ssra-admin/certificates",
    "/ssra-admin/fraud",
    "/ssra-admin/cancellations",
    "/ssra-admin/audit-log",
  ];

  for (const route of PAGES) {
    test(`${route} renders without crashing`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/")), { timeout: 15_000 });
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    });
  }

  test("regular admin CANNOT open super-admin System Health", async ({ page }) => {
    await page.goto("/ssra-admin/system-health");
    // RequireSuperAdmin bounces plain admins back to /ssra-admin
    await expect(page).not.toHaveURL(/system-health/, { timeout: 15_000 });
  });

  test("regular admin CANNOT open super-admin Finance", async ({ page }) => {
    await page.goto("/ssra-admin/finance");
    await expect(page).not.toHaveURL(/\/finance/, { timeout: 15_000 });
  });

  test("regular admin CANNOT open Manage Admins", async ({ page }) => {
    await page.goto("/ssra-admin/admins");
    await expect(page).not.toHaveURL(/\/admins/, { timeout: 15_000 });
  });
});
