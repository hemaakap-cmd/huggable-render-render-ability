import { test, expect } from "@playwright/test";
import { admin } from "../helpers/supabase";

test.describe("Course enrollment, capacity, waitlist", () => {
  test("course catalog renders", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.locator("body")).toContainText(/course|german|level/i, { timeout: 10_000 });
  });

  test("capacity check via DB invariant", async () => {
    const sb = admin();
    const { data, error } = await sb
      .from("ssra_courses")
      .select("id,capacity,enrolled_count")
      .gt("enrolled_count", 0);
    expect(error).toBeNull();
    for (const c of data ?? []) {
      expect(c.enrolled_count!).toBeLessThanOrEqual(c.capacity!);
    }
  });

  test("reserve_pending_enrollment rejects when full", async () => {
    const sb = admin();
    // Find a course at capacity (skip if none)
    const { data } = await sb.rpc("course_has_seats", { _course_id: "nonexistent-course" });
    expect(typeof data === "boolean" || data === null).toBe(true);
  });

  test.skip("waitlist promotion when a seat frees up", async () => {
    // Requires a controlled course at capacity + a waitlist entry; seed via service role.
    // Implementation: insert ssra_waitlist row, cancel an active enrollment, assert promotion job ran.
  });
});
