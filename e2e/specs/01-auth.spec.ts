import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("anonymous sees /auth login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("sign-up form is reachable", async ({ page }) => {
    await page.goto("/auth");
    const signupTab = page.getByRole("tab", { name: /sign up|register/i }).first();
    if (await signupTab.isVisible().catch(() => false)) await signupTab.click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("password reset link is exposed", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("link", { name: /forgot|reset/i }).first()).toBeVisible();
  });

  test.skip("email verification round-trip", async () => {
    // Requires SMTP catcher (Mailosaur). Wire up MAILOSAUR_SERVER_ID/KEY then unskip.
  });

  test.skip("password reset round-trip", async () => {
    // Same reason — needs SMTP capture.
  });

  test("invalid credentials show an error", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel(/email/i).fill("nobody@example.test");
    await page.getByLabel(/password/i).fill("wrongpassword123!");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
