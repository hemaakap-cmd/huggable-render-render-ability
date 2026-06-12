/**
 * Student portal — authenticated student journey across every dashboard page,
 * plus RBAC checks that a student can NEVER see admin or instructor surfaces.
 *
 * Requires seeded personas (node e2e/seed.mjs) + E2E_PASSWORD.
 */
import { test, expect } from "@playwright/test";

const HAS_CREDS = !!process.env.E2E_PASSWORD;
test.skip(!HAS_CREDS, "E2E_PASSWORD not set — persona specs skipped");

test.describe("Student portal", () => {
  test("dashboard renders the student portal shell", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/Student Portal/i);
  });

  const PAGES: Array<[string, RegExp]> = [
    ["/dashboard/courses",       /course/i],
    ["/dashboard/sessions",      /session/i],
    ["/dashboard/materials",     /material/i],
    ["/dashboard/homework",      /homework/i],
    ["/dashboard/certificates",  /certificate/i],
    ["/dashboard/subscription",  /subscription/i],
    ["/dashboard/orders",        /order/i],
    ["/dashboard/profile",       /profile|name|email/i],
    ["/dashboard/preferences",   /notification|preference/i],
  ];

  for (const [route, marker] of PAGES) {
    test(`${route} renders without crashing`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
      await expect(page.locator("body")).toContainText(marker, { timeout: 15_000 });
    });
  }

  test("student CANNOT access the admin panel", async ({ page }) => {
    await page.goto("/ssra-admin");
    // RequireAdmin bounces non-admins to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("student CANNOT access the instructor portal", async ({ page }) => {
    await page.goto("/instructor");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("student CANNOT access super-admin finance", async ({ page }) => {
    await page.goto("/ssra-admin/finance");
    await expect(page).not.toHaveURL(/\/ssra-admin\/finance/, { timeout: 15_000 });
  });

  test("checkout page loads for an authenticated student", async ({ page }) => {
    await page.goto("/checkout?courseId=medical-german");
    await expect(page.locator("body")).not.toContainText(/Something went wrong/i);
    // Either the order summary or a course-not-found fallback — never a redirect to /login
    await expect(page).not.toHaveURL(/\/login/);
  });
});
