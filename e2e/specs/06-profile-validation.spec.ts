import { test, expect } from "@playwright/test";
import { admin } from "../helpers/supabase";

test.describe("Profile validation (Latin-only)", () => {
  test.use({ storageState: "e2e/.auth/student.json" });

  test("UI rejects Arabic full_name", async ({ page }) => {
    await page.goto("/complete-profile");
    const nameField = page.getByLabel(/full name|name/i).first();
    if (!(await nameField.isVisible().catch(() => false))) test.skip(true, "Profile already complete");
    await nameField.fill("محمد علي");
    await page.getByRole("button", { name: /save|continue|submit/i }).click();
    await expect(page.getByText(/latin|english|invalid/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("DB CHECK rejects Arabic in country", async () => {
    const sb = admin();
    const { error } = await sb.from("ssra_profiles").update({ country: "مصر" }).eq("email", process.env.E2E_STUDENT_EMAIL!);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/check|constraint|violat/i);
  });

  test("valid Latin values are accepted", async () => {
    const sb = admin();
    const { error } = await sb.from("ssra_profiles").update({ country: "Germany" }).eq("email", process.env.E2E_STUDENT_EMAIL!);
    expect(error).toBeNull();
  });
});
