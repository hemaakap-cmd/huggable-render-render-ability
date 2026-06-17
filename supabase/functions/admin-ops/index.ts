// Admin operations: delete course, delete student, update student profile,
// cancel a single enrollment. Requires authenticated admin (super_admin for
// destructive actions like deleting a student or hard-deleting a course).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: callerProfile } = await admin
      .from("ssra_profiles").select("role").eq("id", caller.id).maybeSingle();

    const role = (callerProfile as any)?.role;
    const isAdmin = role === "admin" || role === "super_admin";
    const isSuperAdmin = role === "super_admin";
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // ── DELETE COURSE ────────────────────────────────────────────────
    if (action === "delete_course") {
      if (!isSuperAdmin) return json({ error: "Forbidden — super_admin only" }, 403);
      const courseId = String(body?.courseId ?? "");
      const force = Boolean(body?.force);
      if (!courseId) return json({ error: "courseId required" }, 400);

      const { count: activeCount } = await admin
        .from("ssra_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("status", "active");

      if ((activeCount ?? 0) > 0 && !force) {
        return json({
          error: "Course has active enrollments",
          activeEnrollments: activeCount,
          hint: "Pass force=true to cancel them and proceed.",
        }, 409);
      }

      if (force && (activeCount ?? 0) > 0) {
        await admin.from("ssra_enrollments")
          .update({ status: "cancelled" })
          .eq("course_id", courseId)
          .in("status", ["active", "pending"]);
      }

      // Delete related light data first (RLS safe via service role)
      await admin.from("ssra_waitlist").delete().eq("course_id", courseId);
      await admin.from("ssra_sessions").delete().eq("course_id", courseId);
      await admin.from("ssra_materials").delete().eq("course_id", courseId);

      const { error: delErr } = await admin.from("ssra_courses").delete().eq("id", courseId);
      if (delErr) return json({ error: delErr.message }, 500);

      await admin.from("ssra_audit_log").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: role,
        action: "course_deleted",
        resource_type: "course",
        resource_id: courseId,
        details: { force, cancelled_enrollments: activeCount ?? 0 },
      });

      return json({ ok: true, deletedCourse: courseId, cancelledEnrollments: activeCount ?? 0 });
    }

    // ── UPDATE STUDENT PROFILE ───────────────────────────────────────
    if (action === "update_student") {
      const userId = String(body?.userId ?? "");
      const patch = body?.patch ?? {};
      if (!userId) return json({ error: "userId required" }, 400);

      const allowed = [
        "full_name", "phone_number", "country", "city", "address",
        "date_of_birth", "degree", "german_level",
      ];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) {
        if (k in patch) updates[k] = patch[k] === "" ? null : patch[k];
      }
      if (Object.keys(updates).length === 0) return json({ error: "No fields to update" }, 400);

      const { error } = await admin.from("ssra_profiles").update(updates).eq("id", userId);
      if (error) return json({ error: error.message }, 500);

      await admin.from("ssra_audit_log").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: role,
        action: "student_updated",
        resource_type: "ssra_profile",
        resource_id: userId,
        details: { fields: Object.keys(updates) },
      });

      return json({ ok: true });
    }

    // ── CANCEL STUDENT ENROLLMENT (auto-refund + email) ──────────────
    if (action === "cancel_enrollment") {
      const enrollmentId = String(body?.enrollmentId ?? "");
      if (!enrollmentId) return json({ error: "enrollmentId required" }, 400);

      // Load the enrollment so we have the payment intent + amount
      const { data: enr, error: loadErr } = await admin
        .from("ssra_enrollments")
        .select("id, user_id, course_id, status, environment, stripe_payment_intent, amount_eur, paid_amount, paid_currency, course_title_snapshot, student_email_snapshot, student_name_snapshot, order_number")
        .eq("id", enrollmentId)
        .maybeSingle();
      if (loadErr || !enr) return json({ error: loadErr?.message ?? "Enrollment not found" }, 404);

      let refundIssued = false;
      let refundError: string | null = null;

      // Issue Stripe refund if we have a payment intent and it's not already refunded
      if (enr.stripe_payment_intent && enr.status !== "refunded") {
        try {
          const { createStripeClient } = await import("../_shared/stripe.ts");
          const stripeEnv = (enr.environment === "live" ? "live" : "sandbox") as "live" | "sandbox";
          const stripe = createStripeClient(stripeEnv);
          // Check for existing refunds to avoid double-refund
          const existing = await stripe.refunds.list({ payment_intent: enr.stripe_payment_intent, limit: 1 });
          if (existing.data.length === 0) {
            await stripe.refunds.create({
              payment_intent: enr.stripe_payment_intent,
              reason: "requested_by_customer",
            });
          }
          refundIssued = true;
        } catch (e) {
          console.error("Refund failed:", e);
          refundError = e instanceof Error ? e.message : String(e);
        }
      }

      // Update enrollment status
      const newStatus = refundIssued ? "refunded" : "cancelled";
      const { error } = await admin.from("ssra_enrollments")
        .update({ status: newStatus })
        .eq("id", enrollmentId);
      if (error) return json({ error: error.message }, 500);

      // Send cancellation confirmation email
      if (enr.student_email_snapshot) {
        try {
          const amountDisplay = enr.paid_currency && enr.paid_currency !== "EUR"
            ? `${enr.paid_amount} ${enr.paid_currency}`
            : `€${enr.amount_eur ?? 0}`;
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "cancellation-confirmation",
              recipientEmail: enr.student_email_snapshot,
              idempotencyKey: `cancel-${enrollmentId}`,
              templateData: {
                studentName: enr.student_name_snapshot ?? undefined,
                courseName: enr.course_title_snapshot ?? enr.course_id,
                orderNumber: enr.order_number ?? undefined,
                amountPaid: amountDisplay,
                refundIssued,
                refundAmount: refundIssued ? amountDisplay : undefined,
                cancellationDate: new Date().toLocaleDateString("en-GB"),
              },
            },
          });
        } catch (e) {
          console.error("Cancellation email failed:", e);
        }
      }

      await admin.from("ssra_audit_log").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: role,
        action: "enrollment_cancelled",
        resource_type: "enrollment",
        resource_id: enrollmentId,
        details: { refund_issued: refundIssued, refund_error: refundError },
      });

      return json({ ok: true, refundIssued, refundError });
    }

    // ── DELETE STUDENT (hard) ────────────────────────────────────────
    if (action === "delete_student") {
      if (!isSuperAdmin) return json({ error: "Forbidden — super_admin only" }, 403);
      const userId = String(body?.userId ?? "");
      if (!userId) return json({ error: "userId required" }, 400);
      if (userId === caller.id) return json({ error: "Cannot delete your own account" }, 400);

      // Cancel active enrollments first (preserve history)
      await admin.from("ssra_enrollments")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .in("status", ["active", "pending"]);

      // Delete the auth user — cascades to profiles via FK ON DELETE CASCADE
      const { error: authErr } = await admin.auth.admin.deleteUser(userId);
      if (authErr) return json({ error: authErr.message }, 500);

      await admin.from("ssra_audit_log").insert({
        actor_id: caller.id,
        actor_email: caller.email,
        actor_role: role,
        action: "student_deleted",
        resource_type: "auth_user",
        resource_id: userId,
        details: {},
      });

      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("admin-ops error:", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
