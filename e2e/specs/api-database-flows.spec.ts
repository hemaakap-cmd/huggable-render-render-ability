/**
 * Database-level integration tests — exercise the REAL triggers, RPCs and
 * self-healing machinery against the live Supabase project using the
 * service-role key. No browser, no mocks.
 *
 * Flows covered:
 *   1. Waitlist auto-promotion (cancel → next waiter notified + event + notification)
 *   2. enrolled_count counter sync trigger
 *   3. Role-change audit trail (audit_log + system_events)
 *   4. Rate limiting RPC window behaviour
 *   5. reconcile_system() self-healing (enrolled_count drift repair)
 *   6. instructor_teaches_student() only matches ACTIVE enrollments
 *   7. RESTRICTIVE write shields — an authenticated student cannot tamper
 *      with their own enrollment row (migration 20260612250000)
 *
 * Everything runs inside a uniquely-named sandbox course + throwaway users
 * and is cleaned up in afterAll, so it is safe against a production project.
 */
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.skip(!url || !serviceKey, "SUPABASE_SERVICE_ROLE_KEY not set — DB integration specs skipped");

test.describe.configure({ mode: "serial" });

const RUN_ID = `e2e-${Date.now()}`;
const COURSE_ID = `${RUN_ID}-course`;

let db: SupabaseClient;
let userA: string; // enrolled student
let userB: string; // waitlisted student

test.beforeAll(async () => {
  db = createClient(url!, serviceKey!, { auth: { persistSession: false } });

  // Throwaway auth users (FKs on enrollments/waitlist point at auth.users)
  const mkUser = async (tag: string) => {
    const { data, error } = await db.auth.admin.createUser({
      email: `${RUN_ID}-${tag}@ssra-academy.test`,
      password: `Pw!${RUN_ID}${tag}XYZ`,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user.id;
  };
  userA = await mkUser("a");
  userB = await mkUser("b");

  // Sandbox course with exactly ONE seat
  const { error: cErr } = await db.from("ssra_courses").insert({
    id: COURSE_ID,
    title: "E2E Trigger Test Course",
    price_eur: 1,
    is_active: false,          // never visible in the public catalog
    capacity: 1,
    registration_open: true,
    waitlist_enabled: true,
  });
  if (cErr) throw cErr;
});

test.afterAll(async () => {
  if (!db) return;
  await db.from("ssra_waitlist").delete().eq("course_id", COURSE_ID);
  await db.from("ssra_enrollments").delete().eq("course_id", COURSE_ID);
  await db.from("ssra_courses").delete().eq("id", COURSE_ID);
  for (const id of [userA, userB]) {
    if (id) await db.auth.admin.deleteUser(id).catch(() => {});
  }
});

test("1. enrolled_count trigger increments on active enrollment", async () => {
  const { error } = await db.from("ssra_enrollments").insert({
    user_id: userA,
    course_id: COURSE_ID,
    status: "active",
    amount_eur: 1,
  });
  expect(error).toBeNull();

  const { data: course } = await db
    .from("ssra_courses")
    .select("enrolled_count")
    .eq("id", COURSE_ID)
    .single();
  expect(course?.enrolled_count).toBe(1);
});

test("2. cancelling the last seat auto-promotes the next waitlist entry", async () => {
  // userB joins the waitlist of the (now full) course
  const { error: wErr } = await db.from("ssra_waitlist").insert({
    user_id: userB,
    course_id: COURSE_ID,
    status: "waiting",
  });
  expect(wErr).toBeNull();

  // userA cancels → trigger chain: emit events, promote waiter, sync counter
  const { error: cancelErr } = await db
    .from("ssra_enrollments")
    .update({ status: "cancelled" })
    .eq("user_id", userA)
    .eq("course_id", COURSE_ID);
  expect(cancelErr).toBeNull();

  // Waiter must now be 'notified' with a 48 h expiry window
  const { data: waiter } = await db
    .from("ssra_waitlist")
    .select("status, notified_at, expires_at, email_sent")
    .eq("user_id", userB)
    .eq("course_id", COURSE_ID)
    .single();
  expect(waiter?.status).toBe("notified");
  expect(waiter?.notified_at).toBeTruthy();
  expect(waiter?.expires_at).toBeTruthy();
  expect(waiter?.email_sent).toBe(false); // email goes out via the 15-min cron

  // In-app notification created for the promoted student
  const { data: notif } = await db
    .from("ssra_notifications")
    .select("id, type")
    .eq("user_id", userB)
    .eq("type", "waitlist_promoted")
    .limit(1);
  expect(notif?.length).toBe(1);

  // WaitlistPromoted landed on the system_events bus
  const { data: events } = await db
    .from("system_events")
    .select("id")
    .eq("event_type", "WaitlistPromoted")
    .eq("payload->>course_id", COURSE_ID)
    .limit(1);
  expect(events?.length).toBe(1);

  // Counter went back to 0
  const { data: course } = await db
    .from("ssra_courses")
    .select("enrolled_count")
    .eq("id", COURSE_ID)
    .single();
  expect(course?.enrolled_count).toBe(0);
});

test("3. role change writes audit log + system event", async () => {
  // Ensure a profile row exists for userB, then flip role
  await db.from("ssra_profiles").upsert(
    { id: userB, email: `${RUN_ID}-b@ssra-academy.test`, role: "student" },
    { onConflict: "id" },
  );
  const { error } = await db
    .from("ssra_profiles")
    .update({ role: "instructor" })
    .eq("id", userB);
  expect(error).toBeNull();

  const { data: audit } = await db
    .from("ssra_audit_log")
    .select("id, details")
    .eq("action", "role_changed")
    .eq("resource_id", userB)
    .limit(1);
  expect(audit?.length).toBe(1);

  const { data: events } = await db
    .from("system_events")
    .select("id")
    .eq("event_type", "RoleChanged")
    .eq("entity_id", userB)
    .limit(1);
  expect(events?.length).toBe(1);

  // revert
  await db.from("ssra_profiles").update({ role: "student" }).eq("id", userB);
});

test("4. check_rate_limit allows up to max then denies", async () => {
  const key = `e2e-test:${RUN_ID}`;
  const results: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    const { data, error } = await db.rpc("check_rate_limit", {
      _key: key,
      _max_requests: 5,
      _window_seconds: 3600,
    });
    expect(error).toBeNull();
    results.push(data === true);
  }
  expect(results.slice(0, 5).every(Boolean)).toBe(true); // first 5 allowed
  expect(results[5]).toBe(false);                        // 6th denied
});

test("5. reconcile_system() repairs enrolled_count drift", async () => {
  // Introduce deliberate drift
  await db.from("ssra_courses").update({ enrolled_count: 42 }).eq("id", COURSE_ID);

  const { data, error } = await db.rpc("reconcile_system", { p_report_id: null });
  expect(error).toBeNull();
  expect((data as { auto_fixed?: number })?.auto_fixed ?? 0).toBeGreaterThanOrEqual(1);

  const { data: course } = await db
    .from("ssra_courses")
    .select("enrolled_count")
    .eq("id", COURSE_ID)
    .single();
  expect(course?.enrolled_count).toBe(0); // drift repaired to the true count
});

test("6. instructor_teaches_student only matches ACTIVE enrollments", async () => {
  // Make userB an instructor assigned to the sandbox course.
  const { error: aErr } = await db.from("ssra_instructor_assignments").insert({
    instructor_id: userB,
    course_id: COURSE_ID,
    is_active: true,
  });
  expect(aErr).toBeNull();

  // userA's enrollment is 'cancelled' (from test 2) → must NOT count as taught
  const { data: taughtCancelled } = await db.rpc("instructor_teaches_student", {
    _instructor_id: userB,
    _student_id: userA,
  });
  expect(taughtCancelled).toBe(false);

  // Reactivate → must count as taught
  await db.from("ssra_enrollments")
    .update({ status: "active" })
    .eq("user_id", userA)
    .eq("course_id", COURSE_ID);

  const { data: taughtActive } = await db.rpc("instructor_teaches_student", {
    _instructor_id: userB,
    _student_id: userA,
  });
  expect(taughtActive).toBe(true);

  // restore state + cleanup assignment
  await db.from("ssra_enrollments")
    .update({ status: "cancelled" })
    .eq("user_id", userA)
    .eq("course_id", COURSE_ID);
  await db.from("ssra_instructor_assignments")
    .delete()
    .eq("instructor_id", userB)
    .eq("course_id", COURSE_ID);
});

test("7. restrictive shield: student cannot tamper with their own enrollment", async () => {
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  test.skip(!anonKey, "SUPABASE_ANON_KEY not set");

  // Sign in as userA with the password the sandbox created
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({
    email: `${RUN_ID}-a@ssra-academy.test`,
    password: `Pw!${RUN_ID}aXYZ`,
  });
  expect(signInErr).toBeNull();
  expect(signIn.session).toBeTruthy();

  // Attempt to self-activate the cancelled enrollment (free course access!)
  await client
    .from("ssra_enrollments")
    .update({ status: "active" })
    .eq("user_id", userA)
    .eq("course_id", COURSE_ID);

  // RLS silently filters blocked rows — verify via service role that the
  // tampering did NOT land
  const { data: row } = await db
    .from("ssra_enrollments")
    .select("status")
    .eq("user_id", userA)
    .eq("course_id", COURSE_ID)
    .single();
  expect(row?.status).toBe("cancelled");

  // Attempt to forge a brand-new active enrollment
  const { error: forgeErr } = await client.from("ssra_enrollments").insert({
    user_id: userA,
    course_id: COURSE_ID,
    status: "active",
    amount_eur: 0,
  });
  expect(forgeErr).not.toBeNull(); // INSERT must be rejected outright

  // Attempt to forge a session token (zoom-link minting is service-role only)
  const { error: tokenErr } = await client.from("ssra_session_tokens").insert({
    session_id: "00000000-0000-0000-0000-000000000000",
    user_id: userA,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });
  expect(tokenErr).not.toBeNull();

  await client.auth.signOut();
});
