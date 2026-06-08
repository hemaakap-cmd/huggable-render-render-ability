/**
 * notify-session-link-updated
 *
 * Called by an instructor (or admin) after they save/update the Zoom link
 * for a session. Notifies every enrolled / actively-subscribed student of
 * that course with:
 *   1. an in-app notification (ssra_notifications row)
 *   2. a transactional email (template: session-link-updated)
 *
 * Body: { sessionId: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient  = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: ue } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !user) return json({ error: "Unauthorized" }, 401);

    const { sessionId } = await req.json().catch(() => ({}));
    if (!sessionId) return json({ error: "sessionId is required" }, 400);

    // Load session + course
    const { data: session } = await adminClient
      .from("ssra_sessions")
      .select("id, title, course_id, scheduled_at, duration_minutes, ssra_courses(title, instructor_id, instructor_name)")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) return json({ error: "Session not found" }, 404);

    const { data: creds } = await adminClient
      .from("ssra_session_credentials")
      .select("zoom_link")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!creds?.zoom_link) return json({ error: "Session has no link to announce" }, 400);

    // Authorize: admin OR instructor assigned to this course
    const { data: isAdmin } = await adminClient.rpc("is_ssra_admin", { _uid: user.id });
    const course: any = session.ssra_courses;
    const isCourseInstructor = course?.instructor_id === user.id;
    if (!isAdmin && !isCourseInstructor) {
      // also accept multi-instructor assignment table if present
      const { data: assign } = await adminClient
        .from("ssra_instructor_assignments" as never)
        .select("id")
        .eq("instructor_id", user.id)
        .eq("course_id", session.course_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!assign) return json({ error: "Forbidden" }, 403);
    }

    // Collect recipients: active enrollments + active subscriptions
    const [{ data: enrolls }, { data: subs }] = await Promise.all([
      adminClient.from("ssra_enrollments")
        .select("user_id, student_email_snapshot, student_name_snapshot")
        .eq("course_id", session.course_id)
        .eq("status", "active"),
      adminClient.from("ssra_subscriptions")
        .select("user_id")
        .eq("course_id", session.course_id)
        .in("status", ["active", "trialing"]),
    ]);

    const userIds = new Set<string>();
    const emailMap = new Map<string, { email?: string; name?: string }>();
    for (const e of enrolls ?? []) {
      if (!e.user_id) continue;
      userIds.add(e.user_id);
      emailMap.set(e.user_id, { email: e.student_email_snapshot ?? undefined, name: e.student_name_snapshot ?? undefined });
    }
    for (const s of subs ?? []) {
      if (s.user_id) userIds.add(s.user_id);
    }

    if (userIds.size === 0) return json({ notified: 0, message: "No students to notify" });

    // Fill missing emails/names from profiles
    const ids = Array.from(userIds);
    const { data: profiles } = await adminClient
      .from("ssra_profiles")
      .select("id, email, full_name")
      .in("id", ids);
    for (const p of profiles ?? []) {
      const cur = emailMap.get(p.id) ?? {};
      emailMap.set(p.id, { email: cur.email ?? p.email ?? undefined, name: cur.name ?? p.full_name ?? undefined });
    }

    // Insert in-app notifications (bulk)
    const notifRows = ids.map((uid) => ({
      user_id: uid,
      type:    "session_link",
      title:   "Session link is ready",
      body:    `${session.title} — open your dashboard to join.`,
      link:    "/dashboard/sessions",
    }));
    await adminClient.from("ssra_notifications").insert(notifRows);

    // Fan-out emails (best-effort; do not block on failures)
    const scheduledLabel = new Date(session.scheduled_at).toLocaleString("en-GB", {
      dateStyle: "long", timeStyle: "short", timeZone: "Africa/Cairo",
    }) + " (Cairo)";

    let sent = 0;
    await Promise.allSettled(ids.map(async (uid) => {
      const info = emailMap.get(uid);
      if (!info?.email) return;
      const res = await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "session-link-updated",
          recipientEmail: info.email,
          idempotencyKey: `session-link-${session.id}-${uid}`,
          templateData: {
            studentName: info.name ?? "student",
            courseName: course?.title ?? "your course",
            sessionTitle: session.title,
            scheduledAt: scheduledLabel,
            durationMinutes: session.duration_minutes,
            instructor: course?.instructor_name ?? "your instructor",
          },
        },
      });
      if (!res.error) sent++;
    }));

    return json({ notified: ids.length, emailsSent: sent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-session-link-updated error:", msg);
    return json({ error: msg }, 500);
  }
});
