import { test, expect } from "@playwright/test";

const adminRoutes = ["/ssra-admin", "/ssra-admin/users", "/ssra-admin/revenue", "/ssra-admin/sessions"];
const instructorRoutes = ["/instructor", "/instructor/sessions"];

test.describe("RBAC — anonymous", () => {
  for (const r of [...adminRoutes, ...instructorRoutes]) {
    test(`anonymous cannot view ${r}`, async ({ page }) => {
      await page.goto(r);
      await expect(page).toHaveURL(/\/(auth|login|index|\/$)/, { timeout: 10_000 });
    });
  }
});

test.describe("RBAC — student", () => {
  test.use({ storageState: "e2e/.auth/student.json" });
  for (const r of adminRoutes) {
    test(`student blocked from ${r}`, async ({ page }) => {
      await page.goto(r);
      await expect(page).not.toHaveURL(new RegExp(r.replace("/", "\\/") + "$"));
    });
  }
});

test.describe("RBAC — instructor", () => {
  test.use({ storageState: "e2e/.auth/instructor.json" });
  test("instructor can reach /instructor", async ({ page }) => {
    await page.goto("/instructor");
    await expect(page).toHaveURL(/\/instructor/);
  });
  test("instructor blocked from /ssra-admin", async ({ page }) => {
    await page.goto("/ssra-admin");
    await expect(page).not.toHaveURL(/\/ssra-admin$/);
  });
});

test.describe("RBAC — admin", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });
  test("admin reaches /ssra-admin", async ({ page }) => {
    await page.goto("/ssra-admin");
    await expect(page).toHaveURL(/\/ssra-admin/);
  });
});

test.describe("RBAC — super admin only", () => {
  test.use({ storageState: "e2e/.auth/super_admin.json" });
  test("super-admin sees role-promotion controls", async ({ page }) => {
    await page.goto("/ssra-admin/users");
    // Super-admin-only control: role dropdown to admin/super_admin
    await expect(page.getByText(/role|promote|super/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
