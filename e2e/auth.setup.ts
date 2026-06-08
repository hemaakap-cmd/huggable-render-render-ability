import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const personas = [
  { role: "student",     email: process.env.E2E_STUDENT_EMAIL,     password: process.env.E2E_STUDENT_PASSWORD },
  { role: "instructor",  email: process.env.E2E_INSTRUCTOR_EMAIL,  password: process.env.E2E_INSTRUCTOR_PASSWORD },
  { role: "admin",       email: process.env.E2E_ADMIN_EMAIL,       password: process.env.E2E_ADMIN_PASSWORD },
  { role: "super_admin", email: process.env.E2E_SUPER_ADMIN_EMAIL, password: process.env.E2E_SUPER_ADMIN_PASSWORD },
];

fs.mkdirSync(path.join(__dirname, ".auth"), { recursive: true });

for (const p of personas) {
  setup(`authenticate as ${p.role}`, async ({ page }) => {
    if (!p.email || !p.password) {
      setup.skip(true, `Missing E2E_${p.role.toUpperCase()}_EMAIL/PASSWORD — seed personas first`);
    }
    await page.goto("/auth");
    await page.getByLabel(/email/i).fill(p.email!);
    await page.getByLabel(/password/i).fill(p.password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|home|ssra-admin|instructor|index|\/$)/, { timeout: 15_000 });
    await page.context().storageState({ path: `e2e/.auth/${p.role}.json` });
  });
}
