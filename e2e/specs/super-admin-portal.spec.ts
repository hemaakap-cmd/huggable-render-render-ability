/**
 * Super-admin portal — finance, RBAC management, observability and the
 * self-healing surfaces (reconciliation, system health with cron monitoring).
 */
import { test, expect } from "@playwright/test";

const HAS_CREDS = !!process.env.E2E_PASSWORD;
test.skip(!HAS_CREDS, "E2E_PASSWORD not set — persona specs skipped");

test.describe("Super-admin portal", () => {
  const PAGES = [
    "/ssra-admin/system-health",
    "/ssra-admin/operations",
    "/ssra-admin/finance",
    "/ssra-admin/revenue",
    "/ssra-admin/admins",
    "/ssra-admin/activity",
    "/ssra-admin/sync-status",
    "/ssra-admin/reconciliation",
    "/ssra-admin/financial-audit",
    "/ssra-admin/manual-grant",
    "/ssra-admin/student-reports",
  ];

  for (const route of PAGES) {
    test(`${route} renders without crashing`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/")), { timeout: 15_000 });
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    });
  }

  test("System Health shows the pg_cron monitoring section", async ({ page }) => {
    await page.goto("/ssra-admin/system-health");
    await expect(page.locator("body")).toContainText(/Scheduled Jobs/i, { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/Nightly reconciliation/i);
    await expect(page.locator("body")).toContainText(/Waitlist promotion/i);
  });

  test("Reconciliation page exposes a manual trigger", async ({ page }) => {
    await page.goto("/ssra-admin/reconciliation");
    await expect(
      page.getByRole("button", { name: /run|trigger|reconcil/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
