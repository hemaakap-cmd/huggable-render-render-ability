/**
 * RBAC perimeter — anonymous visitors must be bounced off every protected
 * route. This is the test that catches a route accidentally registered
 * without its RequireAuth/RequireAdmin guard (exactly the /checkout bug
 * found in the 2026-06-12 ecosystem audit).
 */
import { test, expect } from "@playwright/test";

const PROTECTED_ROUTES = [
  // Student portal
  "/dashboard",
  "/dashboard/courses",
  "/dashboard/sessions",
  "/dashboard/homework",
  "/dashboard/certificates",
  "/dashboard/subscription",
  "/dashboard/preferences",
  // Checkout (regression guard for the audit finding)
  "/checkout",
  // Admin panel
  "/ssra-admin",
  "/ssra-admin/students",
  "/ssra-admin/enrollments",
  "/ssra-admin/reports",
  "/ssra-admin/coupons",
  // Super admin
  "/ssra-admin/finance",
  "/ssra-admin/system-health",
  "/ssra-admin/admins",
  "/ssra-admin/reconciliation",
  // Instructor portal
  "/instructor",
  "/instructor/students",
  "/instructor/homework",
];

test.describe("Anonymous access control", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects anonymous visitor to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }
});
