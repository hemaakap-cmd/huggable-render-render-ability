/**
 * Public surface — every route an anonymous visitor can reach must render
 * without crashing. Catches broken lazy chunks, route typos, and provider
 * errors that unit tests (jsdom) miss.
 */
import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page renders hero and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText(/SSRA/i, { timeout: 15_000 });
    await expect(page.getByRole("link", { name: /courses/i }).first()).toBeVisible();
  });

  test("course catalog lists courses with at least one card", async ({ page }) => {
    await page.goto("/courses");
    // Catalog has 10 static courses; at least the flagship must render
    await expect(page.locator("body")).toContainText(/Medizinisches Deutsch|Medical German/i);
  });

  test("course detail page renders for the flagship course", async ({ page }) => {
    await page.goto("/courses/medical-german");
    await expect(page.locator("body")).toContainText(/Medizinisches Deutsch|Medical German/i);
  });

  test("student login page shows OTP email form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("staff login page renders", async ({ page }) => {
    await page.goto("/staff-login");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("pricing page renders", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("body")).toContainText(/€|EUR/i);
  });

  test("legal pages render", async ({ page }) => {
    for (const path of ["/privacy-policy", "/terms", "/refund-policy"]) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("certificate verification page is public", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
  });

  test("unknown route shows the 404 page, not a crash", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
