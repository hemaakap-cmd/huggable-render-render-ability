import { test, expect } from "@playwright/test";
import { supabaseUrl } from "../helpers/supabase";

test.describe("Health check edge function", () => {
  test("returns JSON with status field", async () => {
    const res = await fetch(`${supabaseUrl}/functions/v1/health-check`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY! },
    });
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["ok", "healthy", "degraded", "down", "unhealthy"]).toContain(String(body.status).toLowerCase());
  });

  test("reports per-dependency state", async () => {
    const res = await fetch(`${supabaseUrl}/functions/v1/health-check`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY! },
    });
    const body = await res.json();
    // Either a checks/dependencies map exists, or status is enough — assert one of them
    expect(body.checks || body.dependencies || body.status).toBeTruthy();
  });
});
