/**
 * notify-instructor-assignment
 *
 * Admin-only. Assigns an instructor to one or more courses (upsert into
 * ssra_instructor_assignments) and notifies every enrolled / actively-
 * subscribed student of those courses:
 *   1. in-app notification (ssra_notifications row)
 *   2. transactional email (template: instructor-assignment)
 *
 * Body: { instructorId: string, courseIds: string[], notify?: boolean }
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

    const { data: isAdmin } = await adminClient.rpc("is_ssra_admin", { _uid: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { instructorId, courseIds, notify = true } = await req.json().catch(() => ({}));
    if (!instructorId || !Array.isArray(courseIds) || courseIds.length === 0) {
      return json({ error: "instructorId and courseIds[] are required" }, 400);
    }

    // Verify instructor exists & is an instructor (or higher)
    const { data: instructor } = await adminClient
      .from("ssra_profiles")
      .select("id, full_name, email, role")
      .eq("id", instructorId)
      .maybeSingle();
    if (!instructor) return json({ error: "Instructor not found" }, 404);
    if (!["instructor", "admin", "super_admin"].includes(instructor.role as string)) {
      return json({ error: "User is not an instructor" }, 400);
    }

    // Upsert assignments (one per course)
    const rows = courseIds.map((cid: string) => ({
      instructor_id: instructorId,
      course_id:     cid,
      assigned_by:   user.id,
      is_active:     true,
    }));
    const { error: upErr } = await adminClient
      .from("ssra_instructor_assignments")
      .upsert(rows, { onConflict: "instructor_id,course_id" });
    if (upErr) return json({ error: upErr.message }, 500);

    if (!notify) {
      return json({ assigned: rows.length, notified: 0, emailsSent: 0 });
    }

    // Load course titles
    const { data: courses } = await adminClient
      .from("ssra_courses")
      .select("id, title")
      .in("id", courseIds);
    const courseTitle = new Map((courses ?? []).map((c: any) => [c.id, c.title]));

    // Collect recipients per course (active enrollments + active subs)
    const [{ data: enrolls }, { data: subs }] = await Promise.all([
      adminClient.from("ssra_enrollments")
        .select("user_id, course_id, student_email_snapshot, student_name_snapshot")
        .in("course_id", courseIds)
        .eq("status", "active"),
      adminClient.from("ssra_subscriptions")
        .select("user_id, course_id")
        .in("course_id", courseIds)
        .in("status", ["active", "trialing"]),
    ]);

    type Rec = { userId: string; courseId: string; email?: string; name?: string };
    const recMap = new Map<string, Rec>(); // dedup by user+course
    for (const e of enrolls ?? []) {
      if (!e.user_id || !e.course_id) continue;
      const key = `${e.user_id}|${e.course_id}`;
      recMap.set(key, {
        userId:   e.user_id,
        courseId: e.course_id,
        email:    e.student_email_snapshot ?? undefined,
        name:     e.student_name_snapshot ?? undefined,
      });
    }
    for (const s of subs ?? []) {
      if (!s.user_id || !s.course_id) continue;
      const key = `${s.user_id}|${s.course_id}`;
      if (!recMap.has(key)) recMap.set(key, { userId: s.user_id, courseId: s.course_id });
    }

    if (recMap.size === 0) {
      return json({ assigned: rows.length, notified: 0, emailsSent: 0, message: "No students to notify" });
    }

    // Hydrate missing profile email/name
    const userIds = Array.from(new Set(Array.from(recMap.values()).map((r) => r.userId)));
    const { data: profiles } = await adminClient
      .from("ssra_profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    for (const r of recMap.values()) {
      const p = profMap.get(r.userId);
      if (!r.email) r.email = p?.email ?? undefined;
      if (!r.name)  r.name  = p?.full_name ?? undefined;
    }

    const instructorName  = instructor.full_name ?? instructor.email ?? "Your instructor";
    const instructorEmail = instructor.email ?? undefined;

    // In-app notifications
    const notifRows = Array.from(recMap.values()).map((r) => ({
      user_id: r.userId,
      type:    "instructor_assigned",
      title:   "New instructor assigned",
      body:    `${instructorName} is now teaching ${courseTitle.get(r.courseId) ?? "your course"}.`,
      link:    "/dashboard/courses",
    }));
    await adminClient.from("ssra_notifications").insert(notifRows);

    // Emails (best-effort)
    let sent = 0;
    await Promise.allSettled(Array.from(recMap.values()).map(async (r) => {
      if (!r.email) return;
      const res = await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "instructor-assignment",
          recipientEmail: r.email,
          idempotencyKey: `instructor-assign-${instructorId}-${r.courseId}-${r.userId}`,
          templateData: {
            studentName:     r.name ?? "student",
            courseName:      courseTitle.get(r.courseId) ?? "your course",
            instructorName,
            instructorEmail,
          },
        },
      });
      if (!res.error) sent++;
    }));

    return json({
      assigned:    rows.length,
      notified:    recMap.size,
      emailsSent:  sent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-instructor-assignment error:", msg);
    return json({ error: msg }, 500);
  }
});
