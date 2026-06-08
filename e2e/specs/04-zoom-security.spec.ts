import { test, expect } from "@playwright/test";
import { admin, supabaseUrl } from "../helpers/supabase";

async function callGetSessionAccess(token: string, sessionId: string, deviceToken: string) {
  const res = await fetch(`${supabaseUrl}/functions/v1/get-session-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-device-token": deviceToken,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test.describe("Zoom session security", () => {
  test.skip(!process.env.E2E_STUDENT_EMAIL, "Student persona not seeded");

  let sessionId: string;
  let userId: string;
  let accessToken: string;

  test.beforeAll(async () => {
    const sb = admin();
    // Sign in as student to capture an access token
    const { data: sess } = await sb.auth.signInWithPassword({
      email: process.env.E2E_STUDENT_EMAIL!,
      password: process.env.E2E_STUDENT_PASSWORD!,
    });
    accessToken = sess?.session?.access_token ?? "";
    userId = sess?.user?.id ?? "";

    // Pick the student's earliest enrolled session
    const { data: enrollments } = await sb
      .from("ssra_enrollments")
      .select("course_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    if (!enrollments?.length) test.skip(true, "Student has no active enrollment to test against");

    const { data: sessions } = await sb
      .from("ssra_sessions")
      .select("id,scheduled_at,duration_minutes")
      .eq("course_id", enrollments![0].course_id)
      .order("scheduled_at", { ascending: true })
      .limit(1);
    if (!sessions?.length) test.skip(true, "No session row to test against");
    sessionId = sessions![0].id;
  });

  test("denies access more than 30 minutes before start", async () => {
    const sb = admin();
    await sb.from("ssra_sessions").update({ scheduled_at: new Date(Date.now() + 60 * 60_000).toISOString() }).eq("id", sessionId);
    const r = await callGetSessionAccess(accessToken, sessionId, "device-A");
    expect(r.status).toBe(403);
  });

  test("allows access inside the 30-minute window", async () => {
    const sb = admin();
    await sb.from("ssra_sessions").update({ scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString() }).eq("id", sessionId);
    const r = await callGetSessionAccess(accessToken, sessionId, "device-A");
    expect(r.status).toBe(200);
    expect(r.body.zoom_link || r.body.link).toBeTruthy();
  });

  test("denies access after the session window ends", async () => {
    const sb = admin();
    await sb
      .from("ssra_sessions")
      .update({ scheduled_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString(), duration_minutes: 60 })
      .eq("id", sessionId);
    const r = await callGetSessionAccess(accessToken, sessionId, "device-A");
    expect(r.status).toBe(403);
  });

  test("second device is denied", async () => {
    const sb = admin();
    await sb.from("ssra_sessions").update({ scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString() }).eq("id", sessionId);
    const first = await callGetSessionAccess(accessToken, sessionId, "device-X");
    expect(first.status).toBe(200);
    const second = await callGetSessionAccess(accessToken, sessionId, "device-Y");
    expect(second.status).toBe(403);
  });

  test("audit log row exists for each access attempt", async () => {
    const sb = admin();
    const { data } = await sb
      .from("ssra_session_access_log")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
