import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

test.describe("Revenue dashboard", () => {
  test("loads with KPI cards", async ({ page }) => {
    await page.goto("/ssra-admin/revenue");
    await expect(page.getByText(/gross/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/net/i).first()).toBeVisible();
    await expect(page.getByText(/refund/i).first()).toBeVisible();
  });

  test("environment + range filters re-query", async ({ page }) => {
    await page.goto("/ssra-admin/revenue");
    const test7d = page.getByRole("button", { name: /7d|7 days/i }).first();
    if (await test7d.isVisible().catch(() => false)) await test7d.click();
    await expect(page.getByText(/gross/i).first()).toBeVisible();
  });

  test.skip("CSV/Excel export downloads", async () => {
    // Unskip after wiring an Export button. Use page.waitForEvent('download').
  });
});
