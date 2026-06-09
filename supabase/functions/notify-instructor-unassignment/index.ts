/**
 * notify-instructor-unassignment
 *
 * Admin-only. Marks one ssra_instructor_assignments row inactive and
 * (optionally) notifies enrolled / subscribed students of that course:
 *   1. in-app notification (ssra_notifications row)
 *   2. transactional email (template: instructor-unassignment)
 *
 * Body: { assignmentId: string, notify?: boolean }
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

    const { assignmentId, notify = true } = await req.json().catch(() => ({}));
    if (!assignmentId) return json({ error: "assignmentId is required" }, 400);

    const { data: assignment, error: aErr } = await adminClient
      .from("ssra_instructor_assignments")
      .select("id, instructor_id, course_id, is_active")
      .eq("id", assignmentId)
      .maybeSingle();
    if (aErr) return json({ error: aErr.message }, 500);
    if (!assignment) return json({ error: "Assignment not found" }, 404);

    const { instructor_id: instructorId, course_id: courseId } = assignment as any;

    // Deactivate the assignment
    const { error: upErr } = await adminClient
      .from("ssra_instructor_assignments")
      .update({ is_active: false })
      .eq("id", assignmentId);
    if (upErr) return json({ error: upErr.message }, 500);

    // Audit log row for the unassign action.
    await adminClient.from("ssra_audit_log").insert({
      actor_id:      user.id,
      actor_email:   user.email ?? null,
      actor_role:    "admin",
      action:        "instructor_unassigned",
      resource_type: "ssra_instructor_assignment",
      resource_id:   assignmentId,
      details:       { instructor_id: instructorId, course_id: courseId, notify },
    });

    if (!notify) return json({ unassigned: true, notified: 0, emailsSent: 0 });

    // Load instructor + course
    const [{ data: instructor }, { data: course }] = await Promise.all([
      adminClient.from("ssra_profiles").select("id, full_name, email").eq("id", instructorId).maybeSingle(),
      adminClient.from("ssra_courses").select("id, title").eq("id", courseId).maybeSingle(),
    ]);
    const instructorName = (instructor as any)?.full_name ?? (instructor as any)?.email ?? "Your instructor";
    const courseTitle    = (course as any)?.title ?? "your course";

    // Recipients (active enrollments + active subs) for this course
    const [{ data: enrolls }, { data: subs }] = await Promise.all([
      adminClient.from("ssra_enrollments")
        .select("user_id, student_email_snapshot, student_name_snapshot")
        .eq("course_id", courseId)
        .eq("status", "active"),
      adminClient.from("ssra_subscriptions")
        .select("user_id")
        .eq("course_id", courseId)
        .in("status", ["active", "trialing"]),
    ]);

    type Rec = { userId: string; email?: string; name?: string };
    const recMap = new Map<string, Rec>();
    for (const e of enrolls ?? []) {
      if (!e.user_id) continue;
      recMap.set(e.user_id, {
        userId: e.user_id,
        email:  e.student_email_snapshot ?? undefined,
        name:   e.student_name_snapshot ?? undefined,
      });
    }
    for (const s of subs ?? []) {
      if (!s.user_id || recMap.has(s.user_id)) continue;
      recMap.set(s.user_id, { userId: s.user_id });
    }

    if (recMap.size === 0) {
      return json({ unassigned: true, notified: 0, emailsSent: 0, message: "No students to notify" });
    }

    // Hydrate missing profile email/name
    const userIds = Array.from(recMap.keys());
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

    // In-app notifications
    const notifRows = Array.from(recMap.values()).map((r) => ({
      user_id: r.userId,
      type:    "instructor_unassigned",
      title:   "Instructor update",
      body:    `${instructorName} is no longer assigned to ${courseTitle}. A new instructor will be assigned soon.`,
      link:    "/dashboard/courses",
    }));
    await adminClient.from("ssra_notifications").insert(notifRows);

    // Emails (best-effort)
    let sent = 0;
    await Promise.allSettled(Array.from(recMap.values()).map(async (r) => {
      if (!r.email) return;
      const res = await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "instructor-unassignment",
          recipientEmail: r.email,
          idempotencyKey: `instructor-unassign-${assignmentId}-${r.userId}`,
          templateData: {
            studentName: r.name ?? "student",
            courseName:  courseTitle,
            instructorName,
          },
        },
      });
      if (!res.error) sent++;
    }));

    return json({
      unassigned: true,
      notified:   recMap.size,
      emailsSent: sent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("notify-instructor-unassignment error:", msg);
    return json({ error: msg }, 500);
  }
});
