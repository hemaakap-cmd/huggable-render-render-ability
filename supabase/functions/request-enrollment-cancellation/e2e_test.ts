// End-to-end test for the cancellation flow:
//   student request  →  admin review (approve / reject)  →
//   Paddle webhook confirms refund  →  row marked `refunded`.
//
// Runs against the deployed edge functions. Uses the service role to seed
// fixtures, an ephemeral test user for the student-facing call, and an
// ephemeral admin user for the admin-facing call. The webhook step calls
// the exported `handleAdjustmentEvent` handler directly, bypassing Paddle
// signature verification (which is covered by the SDK itself).

import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
await load({ export: true, allowEmptyValues: true, examplePath: null });
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleAdjustmentEvent } from "../payments-webhook/handlers.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL missing");
assert(ANON_KEY, "SUPABASE_ANON_KEY missing");
assert(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY missing");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
const COURSE_PREFIX = `test-cancel-${Date.now().toString(36)}-`;
const CREATED_COURSE_IDS: string[] = [];

// ---------- helpers ----------

async function createCourse(): Promise<string> {
  const id = `${COURSE_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await admin.from("ssra_courses").insert({
    id,
    title: "E2E Cancellation Course",
    price_eur: 100,
    course_type: "one_time",
    category: "clinical",
    is_active: false,
    sort_order: 999,
  } as any);
  if (error) throw new Error(`createCourse failed: ${error.message}`);
  CREATED_COURSE_IDS.push(id);
  return id;
}

async function createUser(email: string, role: "student" | "admin") {
  const password = `Pw_${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user!.id;
  // Trigger creates ssra_profiles; force role if admin.
  if (role === "admin") {
    await admin
      .from("ssra_profiles")
      .update({ role: "admin" })
      .eq("id", userId);
  }
  return { userId, email, password };
}

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session!.access_token;
}

async function createEnrollment(opts: {
  userId: string;
  paidDaysAgo: number;
  status?: string;
}) {
  const paidAt = new Date(
    Date.now() - opts.paidDaysAgo * 86_400_000,
  ).toISOString();
  const { data, error } = await admin
    .from("ssra_enrollments")
    .insert({
      user_id: opts.userId,
      course_id: COURSE_ID,
      status: opts.status ?? "active",
      paid_at: paidAt,
      enrolled_at: paidAt,
      amount_eur: 100,
      course_title_snapshot: "E2E Cancellation Course",
      student_name_snapshot: "E2E Tester",
      student_email_snapshot: "e2e@example.com",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function callFn(path: string, token: string, body: unknown) {
  const res = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep null */ }
  return { status: res.status, json, raw: text };
}

async function cleanupUser(userId: string) {
  await admin.from("ssra_cancellation_requests").delete().eq("user_id", userId);
  await admin.from("ssra_enrollments").delete().eq("user_id", userId);
  await admin.from("ssra_notifications").delete().eq("user_id", userId);
  await admin.from("ssra_profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
}

// ---------- tests ----------

Deno.test("E2E cancellation flow", async (t) => {
  await ensureCourse();

  const stamp = Date.now();
  const student = await createUser(`student+${stamp}@e2e.test`, "student");
  const adminUser = await createUser(`admin+${stamp}@e2e.test`, "admin");

  try {
    const studentToken = await signIn(student.email, student.password);
    const adminToken = await signIn(adminUser.email, adminUser.password);

    // ------- 1. request rejected outside 14-day window -------
    await t.step("rejects request outside 14-day window", async () => {
      const oldEnrollment = await createEnrollment({
        userId: student.userId,
        paidDaysAgo: 20,
      });
      const res = await callFn("request-enrollment-cancellation", studentToken, {
        enrollmentId: oldEnrollment,
        reason: "Too late to cancel",
      });
      assertEquals(res.status, 409);
      assert(/14-day/i.test(res.json?.error ?? ""), res.raw);
    });

    // ------- 2. valid request creates pending row -------
    const enrollmentId = await createEnrollment({
      userId: student.userId,
      paidDaysAgo: 2,
    });
    let requestId = "";

    await t.step("student creates a pending cancellation request", async () => {
      const res = await callFn("request-enrollment-cancellation", studentToken, {
        enrollmentId,
        reason: "Changed my mind about the course",
      });
      assertEquals(res.status, 200, res.raw);
      assert(res.json?.id);
      requestId = res.json.id;

      const { data: row } = await admin
        .from("ssra_cancellation_requests")
        .select("status, user_id, course_id")
        .eq("id", requestId)
        .single();
      assertEquals(row?.status, "pending");
      assertEquals(row?.user_id, student.userId);
      assertEquals(row?.course_id, COURSE_ID);
    });

    // ------- 3. duplicate pending request is blocked -------
    await t.step("blocks duplicate pending request", async () => {
      const res = await callFn("request-enrollment-cancellation", studentToken, {
        enrollmentId,
        reason: "Trying again anyway",
      });
      assertEquals(res.status, 409);
    });

    // ------- 4. non-admin cannot process -------
    await t.step("blocks non-admin from processing", async () => {
      const res = await callFn("admin-process-cancellation", studentToken, {
        requestId,
        decision: "approve",
        issueRefund: false,
      });
      assertEquals(res.status, 403);
    });

    // ------- 5. admin approves without issuing refund -------
    await t.step("admin approves; status becomes `approved`", async () => {
      const res = await callFn("admin-process-cancellation", adminToken, {
        requestId,
        decision: "approve",
        issueRefund: false,
        adminNotes: "Approved by E2E test",
      });
      assertEquals(res.status, 200, res.raw);
      assertEquals(res.json?.status, "approved");

      const { data: row } = await admin
        .from("ssra_cancellation_requests")
        .select("status, reviewed_by")
        .eq("id", requestId)
        .single();
      assertEquals(row?.status, "approved");
      assertEquals(row?.reviewed_by, adminUser.userId);

      const { data: enr } = await admin
        .from("ssra_enrollments")
        .select("status")
        .eq("id", enrollmentId)
        .single();
      assertEquals(enr?.status, "cancelled");
    });

    // ------- 6. Paddle webhook flips status to `refunded` -------
    await t.step("Paddle adjustment webhook marks row as `refunded`", async () => {
      const fakeAdjustmentId = `adj_e2e_${crypto.randomUUID()}`;
      await admin
        .from("ssra_cancellation_requests")
        .update({ paddle_adjustment_id: fakeAdjustmentId })
        .eq("id", requestId);

      // Simulate the verified Paddle event payload.
      await handleAdjustmentEvent(
        { id: fakeAdjustmentId, status: "approved" },
        "sandbox",
      );

      const { data: row } = await admin
        .from("ssra_cancellation_requests")
        .select("status")
        .eq("id", requestId)
        .single();
      assertEquals(row?.status, "refunded");

      // Idempotent: re-delivering the webhook is a no-op.
      await handleAdjustmentEvent(
        { id: fakeAdjustmentId, status: "approved" },
        "sandbox",
      );
      const { data: row2 } = await admin
        .from("ssra_cancellation_requests")
        .select("status")
        .eq("id", requestId)
        .single();
      assertEquals(row2?.status, "refunded");
    });

    // ------- 7. reject path on a fresh request -------
    await t.step("admin can reject a separate request", async () => {
      const enr2 = await createEnrollment({
        userId: student.userId,
        paidDaysAgo: 1,
      });
      const reqRes = await callFn(
        "request-enrollment-cancellation",
        studentToken,
        { enrollmentId: enr2, reason: "Will be rejected by admin" },
      );
      assertEquals(reqRes.status, 200, reqRes.raw);
      const rejectId = reqRes.json.id;

      const res = await callFn("admin-process-cancellation", adminToken, {
        requestId: rejectId,
        decision: "reject",
        adminNotes: "Outside policy",
      });
      assertEquals(res.status, 200, res.raw);
      assertEquals(res.json?.status, "rejected");

      const { data: row } = await admin
        .from("ssra_cancellation_requests")
        .select("status")
        .eq("id", rejectId)
        .single();
      assertEquals(row?.status, "rejected");
    });
  } finally {
    await cleanupUser(student.userId).catch(() => {});
    await cleanupUser(adminUser.userId).catch(() => {});
    try { await admin.from("ssra_courses").delete().eq("id", COURSE_ID); } catch { /* noop */ }
  }
});
